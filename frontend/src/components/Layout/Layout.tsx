import { Outlet } from 'react-router-dom';
import { LockKeyhole, ShieldAlert } from 'lucide-react';
import Navbar from './Navbar';
import RoleSwitcher from './RoleSwitcher';
import { useWallet } from '../../hooks/useWallet';

export default function Layout() {
  const wallet = useWallet();
  return <div className="min-h-[100dvh]">
    <Navbar />
    <div className="mx-auto max-w-7xl px-4 pb-12 pt-5 sm:px-7 sm:pt-7">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <RoleSwitcher />
        {wallet.appMode === 'demo' && (
          <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${wallet.appMode === 'demo' ? 'border-amber-400/15 bg-amber-400/[.045]' : 'border-red-400/20 bg-red-400/[.05]'}`}>
            <LockKeyhole size={14} className="text-amber-300" />
            <p className="text-[10px] leading-4 text-slate-400"><>Demo data is stored in IndexedDB and <strong className="text-amber-200">not encrypted</strong>. Proofs are simulated.</></p>
          </div>
        )}
      </div>
      <main className="grid-hairline rounded-[26px] border border-white/[.035] p-3 sm:p-5 lg:p-7"><Outlet /></main>
      <footer className="mt-6 flex flex-col justify-between gap-2 border-t border-midnight-line/70 pt-4 text-[10px] text-slate-600 sm:flex-row sm:items-center">
        <span>VeriCred / local demo environment</span><span>Identity stays off the public ledger. This demo is not cryptographic.</span>
      </footer>
    </div>
  </div>;
}
