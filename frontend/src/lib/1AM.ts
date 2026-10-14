export interface ConnectedWallet {
  address: string;
  publicKey: string;
  api?: any; // Stores the active WalletConnectedAPI instance
}

declare global {
  interface Window {
    midnight?: Record<string, any>;
  }
}

// Renamed for clarity, but exporting the old name as well to avoid breaking your hooks
export function is1AMInstalled(): boolean {
  return typeof window !== 'undefined' && Boolean(window.midnight);
}
export const isLaceInstalled = is1AMInstalled;

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
  if (!is1AMInstalled()) {
    throw new Error('Midnight injection is missing. Ensure the 1AM wallet is installed. Use Connect demo wallet for a local session.');
  }

  try {
    // Extract the injected Midnight wallets
    const injectedWallets = window.midnight ? Object.values(window.midnight) : [];
    
    // Find 1AM specifically via name or variations of its rdns (e.g. app.1am.wallet or com.webisoft.oneam)
    const oneAmConnector: any = injectedWallets.find(
      (wallet: any) => 
        wallet.name?.toLowerCase() === '1am' || 
        wallet.rdns?.toLowerCase().includes('1am') ||
        wallet.rdns?.toLowerCase().includes('oneam')
    );
    
    if (!oneAmConnector) {
      throw new Error('1AM wallet connector not found. Ensure 1AM is installed and unlocked.');
    }
    
    console.log('Found 1AM connector:', oneAmConnector);
    // Connect to the preview network as requested
    const api = await oneAmConnector.connect('preview');
    console.log('Connected to 1AM wallet with API:', api);
    
    // Fetch the address from the new API structure
    const { unshieldedAddress } = await api.getUnshieldedAddress();
    console.log('Retrieved unshielded address:', unshieldedAddress);
    
    return {
      address: String(unshieldedAddress),
      publicKey: 'pk:connected', // Replace when you need actual pk extraction for your contract
      api
    };
  } catch (err: any) {
    console.error('1AM connection failed:', err);
    throw new Error(err?.message || 'Connection to 1AM wallet was rejected or failed.');
  }
}

export async function signTx(_tx: unknown, api?: any): Promise<unknown> {
  if (!api) {
    throw new Error('Wallet API not available. Please reconnect.');
  }
  // Placeholder for when you actually submit Midnight compact transactions
  throw new Error('Transaction submission requires generated VeriCred compact artifacts.');
}

export function disconnect(): void {
  // Handled by useWallet
}

// --- Local Demo Wallet Storage Helpers ---

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