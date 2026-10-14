import { useState } from 'react';
import { FileSearch2, RotateCcw, CheckCircle2 } from 'lucide-react';
import type { CredentialType, Requirement } from '../../types';
import { buildRequirement } from '../../lib/proof';
import { useContract } from '../../hooks/useContract';

export default function RequirementBuilder({ onBuild }: { onBuild: (requirement: Requirement) => void }) {
  const { ledger } = useContract();
  const [type, setType] = useState<CredentialType>('RN');
  const [allowedIssuer, setAllowedIssuer] = useState('');
  const [requireValid, setRequireValid] = useState(true);
  const [busy, setBusy] = useState(false);
  const [success, setSuccess] = useState(false);

  const create = async () => {
    setBusy(true);
    setSuccess(false);
    try {
      const requirement = await buildRequirement({ 
        credentialType: type, 
        requireValid, 
        allowedIssuers: allowedIssuer ? [allowedIssuer] : [], 
        title: `${requireValid ? 'Valid ' : ''}${type} credential` 
      });
      onBuild(requirement);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000); // Clear success message after 3 seconds
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { 
    setAllowedIssuer(''); 
    setType('RN'); 
    setRequireValid(true); 
    setSuccess(false);
    onBuild({ id: '', credentialType: 'RN', requireValid: true, allowedIssuers: [], title: 'No requirement selected' }); 
  };

  return (
    <section className="panel rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-indigo-300">01 / request</p>
          <h2 className="mt-1 text-base font-extrabold text-white">Set verification requirements</h2>
        </div>
        <FileSearch2 size={18} className="text-indigo-200" />
      </div>
      
      <div className="space-y-4">
        <label className="block text-[10px] font-bold text-slate-400">
          Credential type
          <select value={type} onChange={(e) => setType(e.target.value as CredentialType)} className="field mt-1.5 h-10 px-3 text-xs w-full">
            {['RN', 'MD', 'LPN', 'EMT', 'CUSTOM'].map((item) => <option key={item}>{item}</option>)}
          </select>
        </label>
        
        <label className="block text-[10px] font-bold text-slate-400">
          Issuer restriction <span className="font-normal text-slate-600">· optional</span>
          <select value={allowedIssuer} onChange={(e) => setAllowedIssuer(e.target.value)} className="field mt-1.5 h-10 px-3 text-xs w-full">
            <option value="">Any registered issuer</option>
            {ledger.issuers.map((issuer) => <option key={issuer.publicKey} value={issuer.publicKey}>{issuer.name}</option>)}
          </select>
        </label>
        
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-midnight-line bg-[#0b1220] p-3 text-xs text-slate-300 transition hover:border-slate-600">
          <input type="checkbox" checked={requireValid} onChange={(e) => setRequireValid(e.target.checked)} className="accent-indigo-400 h-4 w-4 rounded border-slate-700 bg-slate-900" /> 
          Require currently valid credential
        </label>
        
        {success && (
          <div className="flex items-center gap-2 rounded-lg border border-green-400/20 bg-green-400/[.05] p-3 text-[10px] text-green-300">
            <CheckCircle2 size={14} /> Requirement compiled and selected.
          </div>
        )}

        <div className="flex gap-2">
          <button 
            type="button" 
            disabled={busy} 
            onClick={() => void create()} 
            className="btn-primary flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-extrabold transition-transform active:scale-[0.98]"
          >
            <FileSearch2 size={14} />{busy ? 'Building…' : 'Build requirement'}
          </button>
          <button 
            type="button" 
            onClick={reset} 
            aria-label="Reset requirement" 
            className="btn-quiet grid h-10 w-10 place-items-center rounded-lg"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </section>
  );
}