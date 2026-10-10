import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppMode, WalletMode } from '../types';
import { connectDemoWallet, connect as connectLace, disconnect as disconnectAdapter, isLaceInstalled } from '../lib/lace';

interface WalletValue {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  mode: WalletMode;
  appMode: AppMode;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  setAppMode: (mode: AppMode) => void;
  clearError: () => void;
}
const WalletContext = createContext<WalletValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [appMode, setMode] = useState<AppMode>(() => {
    const saved = localStorage.getItem('vericred.app-mode');
    return saved === 'testnet' || (!saved && import.meta.env.VITE_MIDNIGHT_MODE === 'testnet') ? 'testnet' : 'demo';
  });
  const [address, setAddress] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [mode, setWalletMode] = useState<WalletMode>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const value = useMemo<WalletValue>(() => ({
    connected: Boolean(address),
    address,
    publicKey,
    mode,
    appMode,
    error,
    connect: async () => {
      setError(null);
      try {
        if (appMode === 'testnet' && !isLaceInstalled()) throw new Error('Lace is not installed. Install the Lace browser extension to continue; testnet contract actions will still remain unavailable until generated VeriCred artifacts and a supported adapter are added.');
        const wallet = appMode === 'demo' ? await connectDemoWallet() : await connectLace();
        setAddress(wallet.address);
        setPublicKey(wallet.publicKey);
        setWalletMode(appMode === 'demo' ? 'demo' : 'lace');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not connect wallet.');
      }
    },
    disconnect: () => {
      disconnectAdapter();
      setAddress(null);
      setPublicKey(null);
      setWalletMode('disconnected');
    },
    setAppMode: (nextMode) => {
      setMode(nextMode);
      localStorage.setItem('vericred.app-mode', nextMode);
      setError(null);
      setAddress(null);
      setPublicKey(null);
      setWalletMode('disconnected');
    },
    clearError: () => setError(null),
  }), [address, publicKey, mode, appMode, error]);
  return createElement(WalletContext.Provider, { value }, children);
}

export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used within WalletProvider');
  return value;
}
