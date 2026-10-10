import { useState } from 'react';
import { Activity, Building2, Check, CirclePlus, FileCheck2, Fingerprint, ShieldAlert } from 'lucide-react';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';
import IssueCredentialForm from './IssueCredentialForm';
import RevocationPanel from './RevocationPanel';
import EmptyState from '../Shared/EmptyState';
import CopyButton from '../Shared/CopyButton';
import PrivacyReceipt from '../Shared/PrivacyReceipt';

export default function IssuerDashboard() {
  const { ledger, registerIssuer, ready } = useContract(); // Pull ready
  const { appMode, connected, connect } = useWallet(); // Pull wallet state
  const [name, setName] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  
  const stats = [
    { label: 'Credentials issued', value: Object.keys(ledger.issuedBy).length, icon: FileCheck2, tint: 'text-indigo-200 bg-indigo-400/10 border-indigo-400/15' },
    { label: 'Revoked', value: ledger.revoked.length, icon: ShieldAlert, tint: 'text-red-200 bg-red-400/10 border-red-400/15' },
    { label: 'Verifications', value: ledger.verificationCount, icon: Activity, tint: 'text-cyan-200 bg-cyan-400/10 border-cyan-400/15' },
  ];

  const addIssuer = async () => {
    setNotice(''); setError('');
    try { await registerIssuer(name); setNotice(`${name.trim()} registered in the ledger.`); setName(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not register issuer.'); }
  };

  return <div className="space-y-6">
    <div className="enter flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-indigo-300"><Building2 size={13} /> Issuer workspace / governance</p><h1 className="max-w-2xl text-3xl font-extrabold tracking-[-.05em] text-white sm:text-4xl">Trust the credential.<br className="hidden sm:block" /> Keep the person private.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Issue pseudonymous credential commitments and manage status without putting license details on a public ledger.</p></div>
    </div>

    {!ready ? (
      <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="panel h-24 animate-pulse rounded-2xl" />
          <div className="panel h-24 animate-pulse rounded-2xl" />
          <div className="panel h-24 animate-pulse rounded-2xl" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <div className="panel h-[400px] animate-pulse rounded-2xl" />
          <div className="space-y-6">
            <div className="panel h-[350px] animate-pulse rounded-2xl" />
            <div className="panel h-[200px] animate-pulse rounded-2xl" />
          </div>
        </div>
      </div>
    ) : appMode === 'testnet' && !connected ? (
      <EmptyState 
        title="Wallet Disconnected" 
        description="Connect and unlock your 1AM wallet to read the testnet ledger and manage issuers." 
        action={<button onClick={() => void connect()} className="btn-primary rounded-lg px-4 py-2 text-xs font-bold">Connect Wallet</button>} 
      />
    ) : (
      <>
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map(({ label, value, icon: Icon, tint }, index) => <div key={label} className={`panel enter rounded-2xl p-4 ${index ? `enter-delay-${index}` : ''}`}><div className="flex items-center justify-between"><span className="text-[10px] font-bold uppercase tracking-[.12em] text-slate-500">{label}</span><span className={`grid h-8 w-8 place-items-center rounded-lg border ${tint}`}><Icon size={15} /></span></div><p className="mono mt-3 text-2xl font-medium text-white">{String(value).padStart(2, '0')}</p></div>)}
        </div>
        <div className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
          <div className="panel rounded-2xl p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-cyan-300">Trusted sources</p><h2 className="mt-1 text-lg font-extrabold text-white">Registered issuers</h2></div><span className="rounded-lg border border-midnight-line bg-[#0b1220] px-2.5 py-1.5 text-[10px] font-bold text-slate-400">{ledger.issuers.length} active</span></div>
            {ledger.issuers.length === 0 ? <EmptyState title="No issuers registered" description="Register a medical board to begin issuing credentials." /> : <div className="space-y-2">{ledger.issuers.map((issuer) => <div key={issuer.publicKey} className="flex items-center justify-between gap-3 rounded-xl border border-midnight-line bg-[#0b1220]/70 p-3">
              <div className="flex min-w-0 items-center gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-cyan-400/15 bg-cyan-400/[.06] text-cyan-200"><Fingerprint size={16} /></span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-200">{issuer.name}</p><p className="mono mt-1 truncate text-[9px] text-slate-500">{issuer.publicKey}</p></div></div><div className="hidden items-center gap-2 sm:flex"><span className="inline-flex items-center gap-1 text-[9px] font-bold text-green-300"><Check size={11} /> Registered</span><CopyButton value={issuer.publicKey} label="Copy key" /></div>
            </div>)}</div>}
            <div className="my-4 rounded-xl border border-indigo-400/20 bg-indigo-400/[.05] p-4 text-xs leading-5 text-slate-300">
              <strong className="text-indigo-200">Testnet Issuer Registration Guide:</strong> 
              <ol className="mt-2 list-decimal list-inside space-y-1 text-slate-400">
                <li>When prompted, enter a <strong>64-character hex string</strong> (e.g., <code className="text-cyan-300">1111111111111111111111111111111111111111111111111111111111111111</code>) to act as your Issuer Secret Key.</li>
                <li>The contract will automatically compute and register the corresponding public key on-chain.</li>
                <li><strong>Important:</strong> Save your 64-character secret key securely. You will need this exact secret key later to authorize issuing and revoking credentials.</li>
              </ol>
            </div>
            <div className="mt-5 border-t border-midnight-line pt-4">
              <label htmlFor="issuer-name" className="mb-1.5 block text-[10px] font-bold text-slate-400">Register an issuer</label>
              <div className="flex gap-2"><input id="issuer-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Oregon Board of Nursing" className="field h-10 min-w-0 px-3 text-xs" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void addIssuer(); } }} /><button type="button" disabled={!name.trim()} onClick={() => void addIssuer()} aria-label="Register issuer" className="btn-quiet grid h-10 w-10 shrink-0 place-items-center rounded-lg text-indigo-200"><CirclePlus size={16} /></button></div>
              {notice && <p role="status" className="mt-2 text-[10px] text-green-300">{notice}</p>}
              {error && <p role="alert" className="mt-2 text-[10px] text-red-300">{error}</p>}
              {notice && <div className="mt-4"><PrivacyReceipt circuit="registerIssuer" compact /></div>}
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2"><IssueCredentialForm /><RevocationPanel /></div>
        </div>
      </>
    )}
  </div>;
}