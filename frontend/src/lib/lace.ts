export interface ConnectedWallet {
  address: string;
  publicKey: string;
  api?: unknown;
}

declare global {
  interface Window {
    cardano?: { lace?: { enable: () => Promise<unknown>; name?: string } };
  }
}

export function isLaceInstalled(): boolean {
  return typeof window !== 'undefined' && Boolean(window.cardano?.lace);
}

export async function connectDemoWallet(): Promise<ConnectedWallet> {
  const db = await openWalletDb();
  const existing = await idbGet<string>(db, 'demo-key');
  let key = existing;
  if (!key) {
    const bytes = crypto.getRandomValues(new Uint8Array(32));
    key = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
    await idbSet(db, 'demo-key', key);
  }
  const publicKey = await digest(key);
  return { address: `demo:${publicKey.slice(0, 18)}`, publicKey };
}

export async function connect(): Promise<ConnectedWallet> {
  if (!isLaceInstalled()) throw new Error('Lace is not installed. Use Connect demo wallet for a local-only session.');
  throw new Error('Lace was detected, but no testnet connection was attempted. This frontend is missing the generated VeriCred artifacts and supported Midnight browser adapter required to expose a real address or submit transactions.');
}

export async function signTx(_tx: unknown): Promise<never> {
  throw new Error('Lace transaction signing is not wired: generated VeriCred contract artifacts and a supported browser adapter are required.');
}
export function disconnect(): void {
  // Session state is owned by useWallet; no wallet extension session is revoked here.
}

function digest(value: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)).then((hash) =>
    Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join(''),
  );
}
function openWalletDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vericred-demo-wallet', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('keys');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open local demo wallet storage.'));
  });
}
function idbGet<T>(db: IDBDatabase, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const request = db.transaction('keys', 'readonly').objectStore('keys').get(key);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}
function idbSet(db: IDBDatabase, key: string, value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = db.transaction('keys', 'readwrite').objectStore('keys').put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
