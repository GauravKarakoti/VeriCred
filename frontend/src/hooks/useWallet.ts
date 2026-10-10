import { createContext, createElement, useContext, useMemo, useState, type ReactNode } from 'react';
import type { AppMode, WalletMode } from '../types';
import { connectDemoWallet, connect as connectLace, disconnect as disconnectAdapter, isLaceInstalled } from '../lib/1AM';

interface WalletValue {
  connected: boolean;
  address: string | null;
  publicKey: string | null;
  api?: any; // Added api to the interface
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
  const [api, setApi] = useState<any>(null); // Added state to store the api instance
  const [mode, setWalletMode] = useState<WalletMode>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const value = useMemo<WalletValue>(() => ({
    connected: Boolean(address),
    address,
    publicKey,
    api, // Expose api to the context
    mode,
    appMode,
    error,
    connect: async () => {
      setError(null);
      try {
        if (appMode === 'testnet' && !isLaceInstalled()) throw new Error('1AM wallet is not installed. Install the extension to continue.');
        const wallet = appMode === 'demo' ? await connectDemoWallet() : await connectLace();
        setAddress(wallet.address);
        setPublicKey(wallet.publicKey);
        setApi(wallet.api); // Save the returned api instance to state
        setWalletMode(appMode === 'demo' ? 'demo' : 'lace');
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not connect wallet.');
      }
    },
    disconnect: () => {
      disconnectAdapter();
      setAddress(null);
      setPublicKey(null);
      setApi(null); // Clear api on disconnect
      setWalletMode('disconnected');
    },
    setAppMode: (nextMode) => {
      setMode(nextMode);
      localStorage.setItem('vericred.app-mode', nextMode);
      setError(null);
      setAddress(null);
      setPublicKey(null);
      setApi(null); // Clear api when switching modes
      setWalletMode('disconnected');
    },
    clearError: () => setError(null),
  }), [address, publicKey, api, mode, appMode, error]); // Added api to dependency array

  return createElement(WalletContext.Provider, { value }, children);
}

export function useWallet(): WalletValue {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used within WalletProvider');
  return value;
}