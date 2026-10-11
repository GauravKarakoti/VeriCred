import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ShieldCheck, AlertCircle } from 'lucide-react';
import type { Credential, CredentialType } from '../../types';
import { buildRequirement } from '../../lib/proof';
import { useProof } from '../../hooks/useProof';
import { useContract } from '../../hooks/useContract';
import ProofProgress from '../Shared/ProofProgress';
import ShareProof from './ShareProof';
import { submitProveCredential } from '../../lib/midnight';
import { useWallet } from '../../hooks/useWallet';

const presets: Array<{ title: string; type: CredentialType; valid: boolean }> = [
  { title: 'Active RN license in good standing', type: 'RN', valid: true },
  { title: 'Board-certified MD, no revocations', type: 'MD', valid: true },
  { title: 'EMT cert valid within 30 days', type: 'EMT', valid: true },
  { title: 'Custom requirement', type: 'CUSTOM', valid: true },
];

export default function ProveDialog({ credential, onClose }: { credential: Credential; onClose: () => void }) {
  const { ledger } = useContract();
  const { api } = useWallet();
  const proof = useProof();
  const matchingPreset = presets.findIndex((preset) => preset.type === credential.credentialType);
  const [selected, setSelected] = useState(matchingPreset === -1 ? 3 : matchingPreset);
  const [type, setType] = useState<CredentialType>(credential.credentialType);
  const [issuerPub, setIssuerPub] = useState('');
  const [requireValid, setRequireValid] = useState(true);
  const [building, setBuilding] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Track the successful cryptographic proof payload to show the Share screen
  const [realAttestation, setRealAttestation] = useState<any>(null); 
  
  const revoked = ledger.revoked.includes(credential.commitment);

  const startProof = async () => {
    setBuilding(true);
    setErrorMsg('');
    try {
      const chosen = selected === 3 ? { title: 'Custom requirement', type, valid: requireValid } : presets[selected];
      const requirement = await buildRequirement({
        title: chosen.title,
        credentialType: chosen.type,
        requireValid: chosen.valid,
        allowedIssuers: issuerPub ? [issuerPub] : [],
      });

      // Call the real contract transaction (this will hit the proof server & prompt your wallet)
      const txData = await submitProveCredential(api, credential, requirement.id, chosen.type);
      
      // ✅ Generate the attestation payload for the ShareProof view
      setRealAttestation({
        credential,
        requirement,
        txHash: txData?.txHash || 'Verified on Midnight',
        timestamp: new Date().toISOString()
      });
      
      // ❌ REMOVED onClose() so the dialog transitions to the ShareProof screen!
    } catch (err: any) {
      console.error('Real proof submission failed:', err);
      setErrorMsg(err?.message || 'Failed to submit proof transaction.');
    } finally {
      setBuilding(false);
    }
  };

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Use either the real on-chain attestation OR the simulated one (if you switch back)
  const activeAttestation = realAttestation || proof.attestation;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md sm:p-6"
      role="presentation"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <section 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="prove-title" 
        className="panel enter relative my-auto max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-midnight-line bg-[#0b1220] p-6 shadow-2xl sm:p-8"
      >
        <div className="mb-6 flex items-start justify-between gap-4 border-b border-midnight-line pb-4">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-300">
              Selective disclosure / ZK Proof Server
            </p>
            <h2 id="prove-title" className="mt-1 text-2xl font-extrabold text-white">
              Generate Credential Proof
            </h2>
            <p className="mt-1.5 text-xs text-slate-400">
              Compute a zero-knowledge attestation using your local proof server container.
            </p>
          </div>
          <button 
            type="button" 
            autoFocus 
            onClick={onClose} 
            aria-label="Close proof dialog" 
            className="btn-quiet grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {activeAttestation ? (
          <ShareProof attestation={activeAttestation} onClose={onClose} />
        ) : (
          <>
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              {presets.map((preset, index) => (
                <button 
                  key={preset.title} 
                  type="button" 
                  onClick={() => { setSelected(index); if (index !== 3) setType(preset.type); }} 
                  className={`rounded-2xl border p-3.5 text-left transition-all ${
                    selected === index 
                      ? 'border-indigo-400/50 bg-indigo-400/[.1] shadow-lg shadow-indigo-500/5' 
                      : 'border-midnight-line bg-[#060a12] hover:border-slate-600'
                  }`}
                >
                  <p className="text-xs font-bold text-slate-200">{preset.title}</p>
                  <p className="mt-1 text-[10px] text-slate-400">
                    {index === 3 ? 'Set a type and optional issuer' : `${preset.type} · validity required`}
                  </p>
                </button>
              ))}
            </div>

            {selected === 3 && (
              <div className="mb-5 grid gap-4 rounded-2xl border border-midnight-line bg-[#060a12]/60 p-4 sm:grid-cols-2">
                <label className="block text-[10px] font-bold text-slate-400">
                  Required credential type
                  <select 
                    value={type} 
                    onChange={(e) => setType(e.target.value as CredentialType)} 
                    className="field mt-1.5 h-10 w-full px-3 text-xs"
                  >
                    {['RN', 'MD', 'LPN', 'EMT', 'CUSTOM'].map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-[10px] font-bold text-slate-400">
                  Issuer restriction <span className="font-normal text-slate-500">· optional</span>
                  <select 
                    value={issuerPub} 
                    onChange={(e) => setIssuerPub(e.target.value)} 
                    className="field mt-1.5 h-10 w-full px-3 text-xs"
                  >
                    <option value="">Any registered issuer</option>
                    {ledger.issuers.map((issuer) => (
                      <option value={issuer.publicKey} key={issuer.publicKey}>{issuer.name}</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2.5 text-xs text-slate-300 sm:col-span-2 pt-1">
                  <input 
                    type="checkbox" 
                    checked={requireValid} 
                    onChange={(e) => setRequireValid(e.target.checked)} 
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 accent-indigo-400" 
                  /> 
                  Must be currently valid
                </label>
              </div>
            )}

            {revoked && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-400/20 bg-red-400/5 p-3.5 text-xs text-red-200">
                <AlertCircle size={16} className="shrink-0 mt-0.5 text-red-400" /> 
                <span>This commitment is revoked and cannot satisfy a proof request.</span>
              </div>
            )}

            {(proof.error || errorMsg) && (
              <div role="alert" className="mb-4 rounded-xl border border-red-400/20 bg-red-400/5 p-3.5 text-xs text-red-200">
                {proof.error || errorMsg}
              </div>
            )}

            <div className="space-y-4 pt-2">
              <ProofProgress status={proof.status} progress={proof.progress} />
              <button 
                type="button" 
                disabled={building || ['collecting', 'proving', 'serializing'].includes(proof.status) || revoked} 
                onClick={() => void startProof()} 
                className="btn-primary flex h-12 w-full items-center justify-center gap-2.5 rounded-xl text-xs font-extrabold tracking-wide disabled:opacity-50"
              >
                <ShieldCheck size={16} />
                {building ? 'Waiting for 1AM Wallet signature...' : 'Generate Cryptographic Proof'}
              </button>
              <p className="text-center text-[10px] leading-relaxed text-slate-500">
                Powered by Midnight.js client SDK.
              </p>
            </div>
          </>
        )}
      </section>
    </div>,
    document.body
  );
}