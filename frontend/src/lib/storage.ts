import type { Credential, Ledger, VerificationRecord } from '../types';

const DATABASE = 'vericred-demo-data';
const DATABASE_VERSION = 1;
type StoreName = 'vault' | 'ledger' | 'history';
const legacyKeys: Record<StoreName, string> = {
  vault: 'vericred.demo.v1.vault',
  ledger: 'vericred.demo.v1.ledger',
  history: 'vericred.demo.v1.history',
};

// Helper to determine if we are connecting to the real Midnight network
function getAppMode(): 'demo' | 'testnet' {
  const saved = localStorage.getItem('vericred.app-mode');
  return saved === 'testnet' || (!saved && import.meta.env.VITE_MIDNIGHT_MODE === 'testnet') ? 'testnet' : 'demo';
}

function openDatabase(): Promise<IDBDatabase> {
  if (!('indexedDB' in window)) {
    return Promise.reject(new Error('This browser does not support IndexedDB, so the local demo vault cannot be opened.'));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of ['vault', 'ledger', 'history'] satisfies StoreName[]) {
        if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error(`Could not open the local demo database: ${request.error?.message ?? 'unknown error'}`));
    request.onblocked = () => reject(new Error('The local demo database is blocked by another browser tab. Close other VeriCred tabs and retry.'));
  });
}

function getFromStore<T>(db: IDBDatabase, store: StoreName, key = 'value'): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readonly').objectStore(store).get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error ?? new Error(`Could not read the ${store} database.`));
  });
}

function saveToStore<T>(db: IDBDatabase, store: StoreName, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(store, 'readwrite');
    transaction.objectStore(store).put(value, 'value');
    if (store === 'vault') transaction.objectStore(store).put(true, 'initialized');
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error(`Could not save the ${store} database.`));
    transaction.onabort = () => reject(transaction.error ?? new Error(`Could not save the ${store} database.`));
  });
}

function deleteFromStore(db: IDBDatabase, store: StoreName, key = 'value'): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db.transaction(store, 'readwrite').objectStore(store).delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error(`Could not clear the ${store} database.`));
  });
}

async function loadValue<T>(store: StoreName, fallback: T): Promise<T> {
  const db = await openDatabase();
  try {
    const current = await getFromStore<T>(db, store);
    if (current !== undefined) return current;

    const old = localStorage.getItem(legacyKeys[store]);
    if (old !== null) {
      let migrated: T;
      try {
        migrated = JSON.parse(old) as T;
      } catch {
        throw new Error(`Legacy ${store} data could not be read. Clear VeriCred demo data before continuing.`);
      }
      await saveToStore(db, store, migrated);
      localStorage.removeItem(legacyKeys[store]);
      return migrated;
    }
    return fallback;
  } finally {
    db.close();
  }
}

async function saveValue<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDatabase();
  try {
    await saveToStore(db, store, value);
  } finally {
    db.close();
  }
}

export async function loadCredentials(): Promise<Credential[]> {
  const db = await openDatabase();
  try {
    const current = await getFromStore<Credential[]>(db, 'vault');
    if (current !== undefined) return current;

    const old = localStorage.getItem(legacyKeys.vault);
    if (old !== null) {
      let migrated: Credential[];
      try {
        migrated = JSON.parse(old) as Credential[];
      } catch {
        throw new Error('Legacy vault data could not be read. Clear VeriCred demo data before continuing.');
      }
      await saveToStore(db, 'vault', migrated);
      localStorage.removeItem(legacyKeys.vault);
      return migrated;
    }

    const initialized = await getFromStore<boolean>(db, 'vault', 'initialized');
    if (initialized) return [];
    
    // Only inject mock credentials if the app is in offline demo mode. 
    // If it's testnet, initialize a clean, empty vault.
    const initialData = getAppMode() === 'testnet' ? [] : demoCredentials();
    
    await saveToStore(db, 'vault', initialData);
    return initialData;
  } finally {
    db.close();
  }
}

export async function saveCredentials(credentials: Credential[]): Promise<void> {
  await saveValue('vault', credentials);
}

export async function saveCredential(credential: Credential): Promise<void> {
  const all = await loadCredentials();
  await saveCredentials([credential, ...all.filter((item) => item.id !== credential.id)]);
}

export async function loadLedger(fallback: Ledger): Promise<Ledger> {
  // If we are on testnet, completely bypass the local DB for the ledger state 
  // and return an empty state so the frontend knows it must fetch from the contract provider.
  if (getAppMode() === 'testnet') {
    return makeEmptyLedger();
  }
  return loadValue('ledger', fallback);
}

export async function saveLedger(ledger: Ledger): Promise<void> {
  if (getAppMode() === 'testnet') return; // Do not overwrite local cache when reading from real testnet
  await saveValue('ledger', ledger);
}

export async function loadHistory(): Promise<VerificationRecord[]> {
  return loadValue<VerificationRecord[]>('history', []);
}

export async function saveHistory(history: VerificationRecord[]): Promise<void> {
  await saveValue('history', history);
}

export async function clearVault(): Promise<void> {
  const db = await openDatabase();
  try {
    await deleteFromStore(db, 'vault');
    await saveToStore(db, 'vault', []);
    localStorage.removeItem(legacyKeys.vault);
  } finally {
    db.close();
  }
}

export async function clearDemoData(): Promise<void> {
  const db = await openDatabase();
  try {
    await Promise.all((['vault', 'ledger', 'history'] satisfies StoreName[]).map((store) => deleteFromStore(db, store)));
    await deleteFromStore(db, 'vault', 'initialized');
    Object.values(legacyKeys).forEach((key) => localStorage.removeItem(key));
  } finally {
    db.close();
  }
}

// Generates an empty ledger specifically to indicate a blank slate on testnet loads
export function makeEmptyLedger(): Ledger {
  return {
    governancePub: '',
    domainSeparator: '',
    issuers: [],
    issuedBy: {},
    revoked: [],
    verificationCount: 0,
  };
}

export function makeDemoLedger(): Ledger {
  return {
    governancePub: 'gov_demo_7f31a2c8',
    domainSeparator: 'vericred/v1/midnight/demo',
    issuers: [
      { publicKey: 'issuer_ny_6b24c981', name: 'New York State Board of Nursing', registeredAt: '2025-02-11' },
      { publicKey: 'issuer_cal_93a71d4e', name: 'California Medical Board', registeredAt: '2025-03-02' },
      { publicKey: 'issuer_emt_42cc10fa', name: 'National EMS Registry', registeredAt: '2025-03-16' },
    ],
    issuedBy: {
      '0x8f2c14a9b3d70e61c4a82f5d9016ab73': 'issuer_ny_6b24c981',
      '0x34bd9e671a5c208f8d73e1462cb9f040': 'issuer_cal_93a71d4e',
    },
    revoked: [],
    verificationCount: 12,
  };
}

export function demoCredentials(): Credential[] {
  const holder = 'holder_demo_08ea71';
  return [
    {
      id: 'sample-rn',
      commitment: '0x8f2c14a9b3d70e61c4a82f5d9016ab73',
      credentialType: 'RN',
      issuerPub: 'issuer_ny_6b24c981',
      holderCommitment: holder,
      licenseNumber: 'NY-RN-482716',
      issuingBoard: 'New York State Board of Nursing',
      issueDate: '2023-08-14',
      expiryDate: '2027-08-31',
    },
    {
      id: 'sample-md',
      commitment: '0x34bd9e671a5c208f8d73e1462cb9f040',
      credentialType: 'MD',
      issuerPub: 'issuer_cal_93a71d4e',
      holderCommitment: holder,
      licenseNumber: 'CA-MD-731905',
      issuingBoard: 'California Medical Board',
      issueDate: '2022-01-09',
      expiryDate: '2026-11-30',
    },
  ];
}