import type { ReactNode } from 'react';
import { ShieldCheck } from 'lucide-react';

export default function EmptyState({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-midnight-line bg-[#0b1220]/60 px-6 py-10 text-center">
    <span className="mb-4 grid h-12 w-12 place-items-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300"><ShieldCheck size={22} /></span>
    <h3 className="text-sm font-extrabold text-slate-100">{title}</h3>
    <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">{description}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>;
}
