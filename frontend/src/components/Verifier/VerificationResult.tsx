import { CircleCheck, CircleX, LockKeyhole, ShieldCheck, ShieldX } from 'lucide-react';
import type { Requirement } from '../../types';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';

export interface Verdict {
  accepted: boolean;
  commitmentKnown: boolean;
  issuerVerified: boolean;
  revoked: boolean;
  reason: string;
  attestation: any; // Relaxed type to handle both simulated and real payloads
}

export default function VerificationResult({ verdict, requirement }: { verdict: Verdict | null; requirement: Requirement }) {
  const { ledger } = useContract();
  const { appMode } = useWallet();

  if (!verdict) return (
    <div className="flex min-h-[250px] flex-col items-center justify-center rounded-2xl border border-dashed border-midnight-line bg-[#0b1220]/50 px-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-2xl border border-midnight-line bg-white/[.025] text-slate-500"><ShieldCheck size={21} /></span>
      <p className="mt-4 text-sm font-bold text-slate-300">Verification result appears here</p>
      <p className="mt-1 max-w-xs text-[10px] leading-5 text-slate-600">Build a requirement, paste an attestation and inspect it to see its status.</p>
    </div>
  );

  const Icon = verdict.accepted ? CircleCheck : CircleX;
  const isRealProof = !!verdict.attestation.txHash;

  return (
    <section className={`rounded-2xl border p-5 ${verdict.accepted ? 'border-green-400/20 bg-green-400/[.045]' : 'border-red-400/20 bg-red-400/[.045]'}`} aria-live="polite">
      <div className="flex items-start gap-3">
        <Icon size={29} className={verdict.accepted ? 'shrink-0 text-green-300' : 'shrink-0 text-red-300'} />
        <div className="min-w-0 flex-1">
          <p className={`text-lg font-extrabold ${verdict.accepted ? 'text-green-100' : 'text-red-100'}`}>
            {verdict.accepted ? 'Requirement satisfied' : 'Could not verify'}
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-400">
            {verdict.accepted 
              ? (isRealProof ? 'The ZK proof was mathematically verified via the Midnight network.' : 'The demo checks the supplied result against the local simulated ledger.') 
              : verdict.reason}
          </p>
        </div>
        
        {/* Dynamic Badge: Simulated vs Real */}
        <span className={`rounded-md border px-2 py-1 text-[8px] font-extrabold uppercase tracking-widest ${isRealProof ? 'border-green-400/30 bg-green-400/[.12] text-green-300' : 'border-amber-300/20 bg-amber-300/[.08] text-amber-200'}`}>
          {isRealProof ? 'ZK Verified' : 'Simulated'}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-white/[.05] bg-black/10 p-3">
          <p className="text-[9px] uppercase tracking-widest text-slate-500">Issuer registered</p>
          <p className={`mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold ${verdict.issuerVerified ? 'text-green-300' : 'text-red-300'}`}>
            {verdict.issuerVerified ? <ShieldCheck size={13} /> : <ShieldX size={13} />}
            {verdict.issuerVerified ? 'Yes · local ledger' : 'No'}
          </p>
        </div>
        <div className="rounded-lg border border-white/[.05] bg-black/10 p-3">
          <p className="text-[9px] uppercase tracking-widest text-slate-500">Revocation status</p>
          <p className={`mt-1 text-[11px] font-bold ${verdict.revoked ? 'text-red-300' : 'text-green-300'}`}>
            {verdict.revoked ? 'Revoked' : 'Not revoked in local ledger'}
          </p>
        </div>
        <div className="rounded-lg border border-white/[.05] bg-black/10 p-3">
          <p className="text-[9px] uppercase tracking-widest text-slate-500">Commitment</p>
          <p className={`mt-1 text-[11px] font-bold ${verdict.commitmentKnown ? 'text-green-300' : 'text-red-300'}`}>
            {verdict.commitmentKnown ? 'Found in local ledger' : 'Not found'}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-black/10 px-3 py-2">
        <span className="text-[9px] text-slate-500">Requirement · {requirement.title}</span>
        {/* Safely slice the requirement ID with optional chaining */}
        <span className="mono max-w-[45%] truncate text-[9px] text-slate-400">
          {verdict.attestation.requirementId?.slice(0, 18)}…
        </span>
      </div>

      <div className="mt-4 flex items-start gap-2 border-t border-white/[.07] pt-3 text-[10px] leading-5 text-slate-400">
        <LockKeyhole size={13} className="mt-1 shrink-0 text-amber-300" />
        <div>
          This verification is privacy-preserving by design. The holder’s identity, license number and expiry date were not shared. 
          {isRealProof ? <strong className="text-green-300 font-normal"> This proof was backed by a cryptographic ZK Snark execution.</strong> : ' In this demo, the status is locally simulated and was not checked on-chain.'}
        </div>
      </div>
      
      {appMode === 'testnet' && !isRealProof && <p className="mt-2 text-[9px] text-red-300">The testnet explorer is not consulted by this local verifier.</p>}
      
      <p className="mono mt-3 truncate text-[9px] text-slate-600">
        {isRealProof ? `TX Hash: ${verdict.attestation.txHash}` : `Nullifier: ${verdict.attestation.nullifier}`} · public issuers {ledger.issuers.length}
      </p>
    </section>
  );
}