import { NavLink } from 'react-router-dom';
import { Building2, BriefcaseMedical, UserRound } from 'lucide-react';

const roles = [
  { path: '/issuer', label: 'Issuer', detail: 'Medical boards', icon: Building2 },
  { path: '/holder', label: 'Holder', detail: 'Private vault', icon: UserRound },
  { path: '/verifier', label: 'Verifier', detail: 'Credential review', icon: BriefcaseMedical },
];
export default function RoleSwitcher() {
  return <nav aria-label="Choose workspace" className="grid grid-cols-3 gap-1 rounded-2xl border border-midnight-line bg-[#0b1220] p-1.5">
    {roles.map(({ path, label, detail, icon: Icon }) => <NavLink key={path} to={path} className={({ isActive }) =>
      `group flex items-center justify-center gap-2 rounded-xl px-2 py-2.5 transition sm:justify-start sm:px-4 ${isActive ? 'bg-[#1a2340] text-white shadow-inner shadow-indigo-300/5' : 'text-slate-500 hover:bg-white/[.03] hover:text-slate-200'}`
    }>
      {({ isActive }) => <><span className={`grid h-8 w-8 place-items-center rounded-lg ${isActive ? 'bg-indigo-400/15 text-indigo-200' : 'bg-transparent text-slate-500 group-hover:text-slate-300'}`}><Icon size={16} /></span>
        <span className="text-left"><span className="block text-xs font-extrabold">{label}</span><span className="hidden text-[9px] text-slate-500 sm:block">{detail}</span></span></>}
    </NavLink>)}
  </nav>;
}
