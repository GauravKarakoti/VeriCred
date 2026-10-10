import { useState } from 'react';
import { FileSearch2, RotateCcw } from 'lucide-react';
import type { CredentialType, Requirement } from '../../types';
import { buildRequirement } from '../../lib/proof';
import { useContract } from '../../hooks/useContract';

export default function RequirementBuilder({ onBuild }: { onBuild: (requirement: Requirement) => void }) {
  const { ledger } = useContract();
  const [type, setType] = useState<CredentialType>('RN');
  const [allowedIssuer, setAllowedIssuer] = useState('');
  const [requireValid, setRequireValid] = useState(true);
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    const requirement = await buildRequirement({ credentialType: type, requireValid, allowedIssuers: allowedIssuer ? [allowedIssuer] : [], title: `${requireValid ? 'Valid ' : ''}${type} credential` });
    onBuild(requirement);
    setBusy(false);
  };
  const reset = () => { setAllowedIssuer(''); setType('RN'); setRequireValid(true); onBuild({ id: '', credentialType: 'RN', requireValid: true, allowedIssuers: [], title: 'No requirement selected' }); };
  return <section className="panel rounded-2xl p-5">
    <div className="mb-4 flex items-start justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-indigo-300">01 / request</p><h2 className="mt-1 text-base font-extrabold text-white">Set verification requirements</h2></div><FileSearch2 size={18} className="text-indigo-200" /></div>
    <div className="space-y-3">
      <label className="block text-[10px] font-bold text-slate-400">Credential type<select value={type} onChange={(e) => setType(e.target.value as CredentialType)} className="field mt-1.5 h-10 px-3 text-xs">{['RN', 'MD', 'LPN', 'EMT', 'CUSTOM'].map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="block text-[10px] font-bold text-slate-400">Issuer restriction <span className="font-normal text-slate-600">· optional</span><select value={allowedIssuer} onChange={(e) => setAllowedIssuer(e.target.value)} className="field mt-1.5 h-10 px-3 text-xs"><option value="">Any registered issuer</option>{ledger.issuers.map((issuer) => <option key={issuer.publicKey} value={issuer.publicKey}>{issuer.name}</option>)}</select></label>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-midnight-line bg-[#0b1220] p-3 text-xs text-slate-300"><input type="checkbox" checked={requireValid} onChange={(e) => setRequireValid(e.target.checked)} className="accent-indigo-400" /> Require currently valid credential</label>
      <div className="flex gap-2"><button type="button" disabled={busy} onClick={() => void create()} className="btn-primary flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-extrabold"><FileSearch2 size={14} />{busy ? 'Building…' : 'Build requirement'}</button><button type="button" onClick={reset} aria-label="Reset requirement" className="btn-quiet grid h-10 w-10 place-items-center rounded-lg"><RotateCcw size={14} /></button></div>
    </div>
  </section>;
}
