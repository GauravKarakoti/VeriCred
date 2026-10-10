import { LockKeyhole, Radio } from 'lucide-react';
import type { CircuitName } from '../../types';
import { DISCLOSURE_MANIFEST } from '../../lib/disclosure';

const headings: Record<CircuitName, string> = {
  registerIssuer: 'Issuer registration privacy receipt',
  issueCredential: 'Issuance privacy receipt',
  proveCredential: 'Proof disclosure preview',
  revokeCredential: 'Revocation privacy receipt',
};
export default function PrivacyReceipt({ circuit, compact = false }: { circuit: CircuitName; compact?: boolean }) {
  const manifest = DISCLOSURE_MANIFEST[circuit];
  return <section className="rounded-xl border border-midnight-line bg-[#0b1220]/80 p-4" aria-label={headings[circuit]}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-slate-500">Privacy receipt</p><h3 className="mt-1 text-sm font-bold text-slate-100">{headings[circuit]}</h3></div>
      <span className="rounded-md border border-amber-400/20 bg-amber-400/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-amber-300">Source: circuit manifest</span>
    </div>
    <div className={`grid ${compact ? 'gap-3' : 'gap-3 sm:grid-cols-2'}`}>
      <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/[.045] p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-cyan-300"><Radio size={13} /> Disclosed on-chain</div>
        <ul className="space-y-1.5">{manifest.disclosed.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-slate-300"><span className="h-1 w-1 rounded-full bg-cyan-300" />{item}</li>)}</ul>
      </div>
      <div className="rounded-lg border border-amber-400/15 bg-amber-400/[.045] p-3">
        <div className="mb-2 flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.12em] text-amber-300"><LockKeyhole size={13} /> Kept private</div>
        <ul className="space-y-1.5">{manifest.private.map((item) => <li key={item} className="flex items-center gap-2 text-xs text-slate-300"><span className="h-1 w-1 rounded-full bg-amber-300" />{item}</li>)}</ul>
      </div>
    </div>
    <p className="mt-3 text-[9px] leading-4 text-slate-500">Circuit disclosure preview only. Demo actions are simulated locally and were not submitted to Midnight.</p>
  </section>;
}
