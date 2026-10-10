import { useState, type FormEvent } from 'react';
import { Ban, CircleCheck, ShieldAlert } from 'lucide-react';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';
import PrivacyReceipt from '../Shared/PrivacyReceipt';
import CopyButton from '../Shared/CopyButton';

export default function RevocationPanel() {
  const { ledger, revoke } = useContract();
  const { appMode } = useWallet();
  const [commitment, setCommitment] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError(''); setResult(''); setReceipt(false);
    try { revoke(commitment); setResult(commitment.trim()); setReceipt(true); setCommitment(''); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not revoke credential.'); }
  };
  return <section className="panel rounded-2xl p-5 sm:p-6">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-red-300">02 / status control</p><h2 className="mt-1 text-lg font-extrabold tracking-tight text-white">Revoke a credential</h2><p className="mt-1 text-xs text-slate-500">Revocation publishes only the credential commitment.</p></div>
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-red-300/15 bg-red-300/[.07] text-red-200"><Ban size={18} /></span>
    </div>
    <div className="mb-4 flex items-center justify-between rounded-lg bg-[#0b1220] px-3 py-2"><span className="text-[10px] text-slate-500">Revoked commitments</span><span className="mono text-xs font-medium text-red-200">{ledger.revoked.length}</span></div>
    <form onSubmit={submit} className="space-y-3">
      <label className="block text-[11px] font-bold text-slate-400">Credential commitment
        <input required value={commitment} onChange={(e) => setCommitment(e.target.value)} placeholder="0x… public commitment" className="field mono mt-1.5 h-10 px-3 text-xs" />
      </label>
      {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-[11px] leading-4 text-red-200"><ShieldAlert size={14} className="mt-0.5 shrink-0" />{error}</p>}
      {result && <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-green-400/20 bg-green-400/5 p-3 text-[11px] text-green-200"><span className="inline-flex items-center gap-1.5"><CircleCheck size={14} /> Revoked locally</span><CopyButton value={result} label="Copy commitment" /></div>}
      <button disabled={!commitment.trim()} className="btn-quiet flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-extrabold text-red-200"><Ban size={14} /> Revoke commitment</button>
    </form>
    {receipt && <div className="mt-4"><PrivacyReceipt circuit="revokeCredential" /></div>}
  </section>;
}
