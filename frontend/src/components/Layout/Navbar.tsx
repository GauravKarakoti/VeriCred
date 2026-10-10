import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ChevronDown, Fingerprint, LogOut, ShieldCheck } from 'lucide-react';
import { useWallet } from '../../hooks/useWallet';
import LedgerBadge from '../Shared/LedgerBadge';

export default function Navbar() {
  const wallet = useWallet();
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="sticky top-0 z-40 border-b border-midnight-line/80 bg-[#0a0e1a]/90 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-7">
      <Link to="/holder" className="flex min-w-0 items-center gap-3 rounded-lg">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-300/20 bg-gradient-to-br from-indigo-400/20 to-cyan-400/5 text-indigo-200"><Fingerprint size={22} /><span className="absolute -bottom-1 -right-1 h-2.5 w-2.5 rounded-full border-2 border-[#0a0e1a] bg-green-400" /></span>
        <span className="min-w-0"><span className="block text-[15px] font-extrabold tracking-[-.04em] text-white">veri<span className="text-indigo-300">cred</span></span><span className="hidden text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500 sm:block">Credential assurance</span></span>
      </Link>
      <div className="hidden items-center gap-3 lg:flex"><Activity size={14} className="text-green-400" /><LedgerBadge mode={wallet.appMode} /></div>
      <div className="relative flex items-center gap-2">
        <label className="sr-only" htmlFor="network-mode">Network mode</label>
        <select id="network-mode" value={wallet.appMode} onChange={(event) => wallet.setAppMode(event.target.value as 'demo' | 'testnet')} className="h-9 max-w-[110px] rounded-lg border border-midnight-line bg-[#101827] px-2 text-[10px] font-bold text-slate-300 outline-none focus:border-indigo-400 sm:max-w-none sm:px-3">
          <option value="demo">Demo mode</option><option value="testnet">Testnet</option>
        </select>
        {wallet.connected ? <div className="relative">
          <button type="button" onClick={() => setMenuOpen(!menuOpen)} className="btn-quiet inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-bold" aria-expanded={menuOpen}>
            <span className="h-1.5 w-1.5 rounded-full bg-green-400" /><span className="mono max-w-24 truncate">{wallet.address}</span><ChevronDown size={12} />
          </button>
          {menuOpen && <div className="absolute right-0 top-11 z-50 w-48 rounded-xl border border-midnight-line bg-[#111827] p-2 shadow-xl">
            <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-500">Local demo session</p>
            <button type="button" onClick={() => { wallet.disconnect(); setMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-slate-300 hover:bg-white/5"><LogOut size={13} /> Disconnect</button>
          </div>}
        </div> : <button type="button" onClick={() => void wallet.connect()} className="btn-primary inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[10px] font-extrabold sm:px-4"><ShieldCheck size={14} /> <span className="hidden sm:inline">{wallet.appMode === 'demo' ? 'Connect demo wallet' : 'Connect wallet'}</span><span className="sm:hidden">Connect</span></button>}
      </div>
    </div>
    {wallet.error && <div role="alert" className="border-t border-red-400/15 bg-red-500/[.06] px-4 py-2 text-center text-[11px] text-red-200">{wallet.error} <button className="ml-2 underline" onClick={wallet.clearError}>Dismiss</button></div>}
  </header>;
}
