import { Check, LoaderCircle, ShieldCheck } from 'lucide-react';
import type { ProofStatus } from '../../types';

const steps = [
  { id: 'collecting', title: 'Collecting witness', note: 'Reading private vault locally' },
  { id: 'proving', title: 'Running circuit', note: 'Checking credential requirements' },
  { id: 'serializing', title: 'Serializing proof', note: 'Preparing shareable attestation' },
] as const;
export default function ProofProgress({ status, progress }: { status: ProofStatus; progress: number }) {
  if (status === 'idle') return <div className="flex items-center gap-3 rounded-xl border border-indigo-300/15 bg-indigo-400/[.06] p-4 text-xs text-slate-300"><ShieldCheck size={18} className="text-indigo-300" /> Proof generation stays in this browser.</div>;
  return <div className="space-y-3 rounded-xl border border-midnight-line bg-[#0b1220] p-4">
    {steps.map((step, index) => {
      const active = progress === index + 1 && status !== 'done';
      const complete = status === 'done' || progress > index + 1;
      return <div key={step.id} className="flex items-center gap-3">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border ${complete ? 'border-green-400/30 bg-green-400/10 text-green-300' : active ? 'border-indigo-400/40 bg-indigo-400/10 text-indigo-200' : 'border-midnight-line text-slate-600'}`}>
          {complete ? <Check size={14} /> : active ? <LoaderCircle size={14} className="animate-spin" /> : <span className="text-[10px]">{index + 1}</span>}
        </span>
        <div className="min-w-0 flex-1"><p className={`text-xs font-bold ${complete || active ? 'text-slate-100' : 'text-slate-500'}`}>{step.title}</p><p className="mt-0.5 text-[10px] text-slate-500">{step.note}</p></div>
        {active && <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-300">Working</span>}
      </div>;
    })}
    {status === 'done' && <p className="border-t border-midnight-line pt-3 text-[10px] font-semibold text-amber-300">Simulation complete — this is not a cryptographic or on-chain proof.</p>}
  </div>;
}
