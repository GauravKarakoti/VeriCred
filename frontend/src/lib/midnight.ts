import type { AppMode, Ledger } from '../types';

export interface DemoContract {
  mode: 'demo';
  ledger: Ledger;
}

export async function connectContract(_address?: string, _privateState?: unknown): Promise<DemoContract> {
  if (import.meta.env.VITE_MIDNIGHT_MODE === 'testnet') {
    throw new Error('Testnet connection unavailable: this frontend has no generated VeriCred contract artifacts or supported browser contract adapter. Configure and wire a reviewed Midnight adapter before using testnet.');
  }
  throw new Error('The demo ledger is initialized locally by the app state provider.');
}
export async function readLedger(contract: DemoContract): Promise<Ledger> {
  return contract.ledger;
}
export async function submitCircuit(_name: string, _args: unknown[]): Promise<never> {
  throw new Error('Circuit submission is unavailable until generated contract artifacts and a supported Midnight adapter are wired.');
}
export function configuredMode(): AppMode {
  return import.meta.env.VITE_MIDNIGHT_MODE === 'testnet' ? 'testnet' : 'demo';
}
