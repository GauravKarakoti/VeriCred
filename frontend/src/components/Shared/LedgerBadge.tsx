import { ExternalLink, Shield, Wifi } from 'lucide-react';
import type { AppMode } from '../../types';

export default function LedgerBadge({ mode, contractAddress }: { mode: AppMode; contractAddress?: string }) {
  const explorerUrl = import.meta.env.VITE_EXPLORER_URL || 'https://preview.midnightexplorer.com';
  return <div className="flex flex-wrap items-center gap-2">
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold ${mode === 'demo' ? 'border-amber-400/20 bg-amber-400/10 text-amber-300' : 'border-cyan-400/20 bg-cyan-400/10 text-cyan-200'}`}>
      {mode === 'demo' ? <Shield size={11} /> : <Wifi size={11} />}{mode === 'demo' ? 'Demo ledger · local only' : 'Preview'}
    </span>
    {contractAddress && <span className="mono text-[10px] text-slate-500">{contractAddress}</span>}
    {mode === 'testnet' && <a href={explorerUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[10px] text-cyan-300 hover:text-cyan-200">Explorer <ExternalLink size={10} /></a>}
  </div>;
}
