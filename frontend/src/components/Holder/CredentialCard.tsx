import { useState } from 'react';
import { BadgeCheck, CalendarDays, ChevronDown, ChevronUp, ShieldCheck, Sparkles } from 'lucide-react';
import type { Credential } from '../../types';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';
import Tooltip from '../Shared/Tooltip';
import ProveDialog from './ProveDialog';

export default function CredentialCard({ credential }: { credential: Credential }) {
  const { ledger } = useContract();
  const { appMode } = useWallet();
  const [open, setOpen] = useState(false);
  const [proving, setProving] = useState(false);
  const issuer = ledger.issuers.find((item) => item.publicKey === credential.issuerPub);
  const revoked = ledger.revoked.includes(credential.commitment);
  const expiryDate = new Date(`${credential.expiryDate}T23:59:59`);
  const expired = expiryDate.getTime() <= Date.now();
  const state = revoked ? 'Revoked' : expired ? 'Expired' : 'Valid';
  return <>
    <article className="panel relative overflow-hidden rounded-2xl p-5">
      <div className={`absolute right-0 top-0 h-32 w-32 translate-x-1/3 -translate-y-1/3 rounded-full blur-3xl ${revoked || expired ? 'bg-red-500/10' : 'bg-indigo-400/10'}`} />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-indigo-300/20 bg-indigo-400/[.09] text-indigo-200"><BadgeCheck size={22} /></span>
            <div><p className="text-[9px] font-extrabold uppercase tracking-[.17em] text-slate-500">Professional credential</p><h3 className="mt-1 text-xl font-extrabold tracking-tight text-white">{credential.credentialType}<span className="ml-2 text-sm font-semibold text-slate-400">license</span></h3></div>
          </div>
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider ${state === 'Valid' ? 'border-green-400/20 bg-green-400/[.08] text-green-300' : 'border-red-400/20 bg-red-400/[.08] text-red-300'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{state}</span>
        </div>
        <div className="mt-5 grid gap-3 border-y border-midnight-line py-4 sm:grid-cols-2">
          <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Issuing authority</p><p className="mt-1 truncate text-xs font-semibold text-slate-200">{issuer?.name ?? credential.issuingBoard}</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Valid until · checked locally</p><p className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-200"><CalendarDays size={13} className="text-slate-500" />{expiryDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Tooltip content="Your identity, license number, board and expiry date remain in the private local vault."><span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-green-300"><ShieldCheck size={14} /> Private details stay local</span></Tooltip>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setOpen(!open)} className="btn-quiet inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold" aria-expanded={open}>{open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}Details</button>
            <button type="button" disabled={appMode !== 'demo' || revoked || expired} onClick={() => setProving(true)} className="btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[10px] font-extrabold"><Sparkles size={13} /> Prove</button>
          </div>
        </div>
        {open && <div className="mt-4 rounded-xl border border-amber-400/15 bg-amber-400/[.04] p-3">
          <p className="mb-2 text-[9px] font-extrabold uppercase tracking-widest text-amber-300">Private vault details · demo, not encrypted</p>
          <dl className="grid grid-cols-2 gap-3 text-[10px]"><div><dt className="text-slate-500">License number</dt><dd className="mono mt-1 text-slate-200">{credential.licenseNumber}</dd></div><div><dt className="text-slate-500">Issue date</dt><dd className="mt-1 text-slate-200">{credential.issueDate}</dd></div></dl>
          <p className="mono mt-3 truncate text-[9px] text-slate-500">Commitment: {credential.commitment}</p>
        </div>}
      </div>
    </article>
    {proving && <ProveDialog credential={credential} onClose={() => setProving(false)} />}
  </>;
}
