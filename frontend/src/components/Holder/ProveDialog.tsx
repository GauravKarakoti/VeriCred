import { useState } from 'react';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';
import type { Credential, CredentialType, Requirement } from '../../types';
import { buildRequirement } from '../../lib/proof';
import { useProof } from '../../hooks/useProof';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';
import ProofProgress from '../Shared/ProofProgress';
import ShareProof from './ShareProof';

const presets: Array<{ title: string; type: CredentialType; valid: boolean }> = [
  { title: 'Active RN license in good standing', type: 'RN', valid: true },
  { title: 'Board-certified MD, no revocations', type: 'MD', valid: true },
  { title: 'EMT cert valid within 30 days', type: 'EMT', valid: true },
  { title: 'Custom requirement', type: 'CUSTOM', valid: true },
];
export default function ProveDialog({ credential, onClose }: { credential: Credential; onClose: () => void }) {
  const { ledger } = useContract();
  const { appMode } = useWallet();
  const proof = useProof();
  const matchingPreset = presets.findIndex((preset) => preset.type === credential.credentialType);
  const [selected, setSelected] = useState(matchingPreset === -1 ? 3 : matchingPreset);
  const [type, setType] = useState<CredentialType>(credential.credentialType);
  const [issuerPub, setIssuerPub] = useState('');
  const [requireValid, setRequireValid] = useState(true);
  const [building, setBuilding] = useState(false);
  const revoked = ledger.revoked.includes(credential.commitment);
  const startProof = async () => {
    setBuilding(true);
    const chosen = selected === 3 ? { title: 'Custom requirement', type, valid: requireValid } : presets[selected];
    const requirement: Requirement = await buildRequirement({ title: chosen.title, credentialType: chosen.type, requireValid: chosen.valid, allowedIssuers: issuerPub ? [issuerPub] : [] });
    await proof.generate(credential, requirement);
    setBuilding(false);
  };
  return <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#050812]/85 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="prove-title" onKeyDown={(event) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const items = event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }} className="panel enter my-auto max-h-[94dvh] w-full max-w-2xl overflow-y-auto rounded-2xl p-5 shadow-2xl sm:p-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-indigo-300">Selective disclosure / local simulation</p><h2 id="prove-title" className="mt-1 text-xl font-extrabold text-white">Prove a credential</h2><p className="mt-1 text-xs text-slate-500">Create a requirement-scoped attestation without sharing private vault fields.</p></div>
        <button type="button" autoFocus onClick={onClose} aria-label="Close proof dialog" className="btn-quiet grid h-9 w-9 shrink-0 place-items-center rounded-lg"><X size={16} /></button>
      </div>
      {proof.attestation ? <ShareProof attestation={proof.attestation} onClose={onClose} /> : <>
        {appMode === 'testnet' && <p className="mb-4 rounded-lg border border-red-400/20 bg-red-400/[.05] p-3 text-xs leading-5 text-red-100">Proof generation is disabled in testnet mode until generated circuit artifacts and a reviewed proving adapter are available.</p>}
        <div className="mb-4 grid gap-2 sm:grid-cols-2">{presets.map((preset, index) => <button key={preset.title} type="button" onClick={() => { setSelected(index); if (index !== 3) setType(preset.type); }} className={`rounded-xl border p-3 text-left transition ${selected === index ? 'border-indigo-400/50 bg-indigo-400/[.08]' : 'border-midnight-line bg-[#0b1220] hover:border-slate-600'}`}><p className="text-xs font-bold text-slate-200">{preset.title}</p><p className="mt-1 text-[10px] text-slate-500">{index === 3 ? 'Set a type and optional issuer' : `${preset.type} · validity required`}</p></button>)}</div>
        {selected === 3 && <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="text-[10px] font-bold text-slate-400">Required credential type<select value={type} onChange={(e) => setType(e.target.value as CredentialType)} className="field mt-1.5 h-10 px-3 text-xs">{['RN', 'MD', 'LPN', 'EMT', 'CUSTOM'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="text-[10px] font-bold text-slate-400">Issuer restriction <span className="font-normal text-slate-600">· optional</span><select value={issuerPub} onChange={(e) => setIssuerPub(e.target.value)} className="field mt-1.5 h-10 px-3 text-xs"><option value="">Any registered issuer</option>{ledger.issuers.map((issuer) => <option value={issuer.publicKey} key={issuer.publicKey}>{issuer.name}</option>)}</select></label>
          <label className="flex items-center gap-2 text-xs text-slate-300 sm:col-span-2"><input type="checkbox" checked={requireValid} onChange={(e) => setRequireValid(e.target.checked)} className="accent-indigo-400" /> Must be currently valid</label>
        </div>}
        {revoked && <p className="mb-3 flex items-start gap-2 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200"><AlertCircle size={14} /> This commitment is revoked and cannot satisfy a proof request.</p>}
        {proof.error && <p role="alert" className="mb-3 rounded-lg border border-red-400/20 bg-red-400/5 p-3 text-xs text-red-200">{proof.error}</p>}
        <div className="space-y-3">
          <ProofProgress status={proof.status} progress={proof.progress} />
          <button type="button" disabled={building || proof.status === 'collecting' || proof.status === 'proving' || proof.status === 'serializing' || revoked || appMode !== 'demo'} onClick={() => void startProof()} className="btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-lg text-xs font-extrabold"><ShieldCheck size={15} />{building || ['collecting', 'proving', 'serializing'].includes(proof.status) ? 'Preparing simulation…' : 'Generate demo proof'}</button>
          <p className="text-center text-[9px] leading-4 text-slate-600">Simulated phases are shown for demonstration; there is no cryptographic proof server or chain transaction.</p>
        </div>
      </>}
    </section>
  </div>;
}
