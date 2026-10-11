import { useState } from 'react';
import { LockKeyhole, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';
import CredentialCard from './CredentialCard';
import EmptyState from '../Shared/EmptyState';

export default function WalletView() {
  const { credentials, ready, refresh } = useContract();
  const { connected, connect, appMode } = useWallet();
  const [help, setHelp] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false); // <-- Track refresh action
  const [refreshNotice, setRefreshNotice] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setRefreshNotice(false);
    try {
      await refresh();
      setRefreshNotice(true);
      setTimeout(() => setRefreshNotice(false), 2500); // Hide notice after 2.5s
    } finally {
      setIsRefreshing(false);
    }
  };
  
  return <div className="space-y-6">
    <div className="enter flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <p className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-indigo-300">
          <LockKeyhole size={13} /> Holder workspace / private vault
        </p>
        <h1 className="text-3xl font-extrabold tracking-[-.05em] text-white sm:text-4xl">
          Your credentials,<br className="sm:hidden" /> on your terms.
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
          Hold credentials privately. Share a narrow proof of validity, not the identity behind it.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button 
          type="button" 
          onClick={() => void handleRefresh()} 
          disabled={isRefreshing}
          aria-label="Refresh vault" 
          className="btn-quiet grid h-10 w-10 place-items-center rounded-lg disabled:opacity-50"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin text-indigo-300' : ''} />
        </button>
        <button 
          type="button" 
          onClick={() => setHelp(!help)} 
          className="btn-quiet inline-flex h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold"
        >
          <Plus size={14} /> How to add
        </button>
      </div>
    </div>

    {/* Subtle confirmation feedback banner */}
    {refreshNotice && (
      <div className="enter rounded-xl border border-green-400/20 bg-green-400/[.05] p-3 text-xs text-green-300 flex items-center gap-2">
        <span>✓ Vault synchronized successfully with the ledger.</span>
      </div>
    )}

    {help && (
      <div className="enter rounded-xl border border-indigo-400/20 bg-indigo-400/[.05] p-4 text-xs leading-5 text-slate-300">
        <strong className="text-indigo-200">Credential delivery:</strong> An issuer registers a credential commitment for a holder. The Issuer workspace creates a private vault record in this browser.
      </div>
    )}

    <div className="grid gap-3 sm:grid-cols-3">
      <div className="panel rounded-xl p-4">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Vault records</p>
        <p className="mono mt-2 text-xl text-white">{String(credentials.length).padStart(2, '0')}</p>
      </div>
      <div className="panel rounded-xl p-4">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Sharing mode</p>
        <p className="mt-2 flex items-center gap-2 text-xs font-bold text-green-300"><ShieldCheck size={14} /> Selective disclosure</p>
      </div>
      <div className="panel rounded-xl p-4">
        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Storage</p>
        <p className="mt-2 text-xs font-bold text-amber-300">Browser IndexedDB</p>
      </div>
    </div>

    {!ready ? (
      <div className="grid gap-4 md:grid-cols-2"><div className="panel h-56 animate-pulse rounded-2xl" /><div className="panel h-56 animate-pulse rounded-2xl" /></div>
    ) : appMode === 'testnet' && !connected ? (
      <EmptyState 
        title="Wallet Disconnected" 
        description="Connect and unlock your 1AM wallet to access your private vault and view testnet credentials." 
        action={<button onClick={() => void connect()} className="btn-primary rounded-lg px-4 py-2 text-xs font-bold">Connect Wallet</button>} 
      />
    ) : credentials.length === 0 ? (
      <EmptyState 
        title="No credentials yet" 
        description="Ask your issuing authority to issue a credential. Once issued, it will appear here in your private vault." 
        action={<></>} 
      />
    ) : (
      <div className="grid gap-4 md:grid-cols-2">
        {credentials.map((credential, index) => (
          <div className={index ? 'enter enter-delay-1' : 'enter'} key={credential.id}>
            <CredentialCard credential={credential} />
          </div>
        ))}
      </div>
    )}

    {!connected && appMode === 'demo' && (
      <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-indigo-400/15 bg-indigo-400/[.04] p-5 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-extrabold text-slate-100">Connect a local demo wallet</p>
          <p className="mt-1 text-xs text-slate-500">A sample key is stored in this browser’s IndexedDB. It is not a production wallet.</p>
        </div>
        <button onClick={() => void connect()} className="btn-quiet rounded-lg px-4 py-2.5 text-xs font-extrabold">Connect demo wallet</button>
      </div>
    )}
  </div>;
}