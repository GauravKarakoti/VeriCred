import { useState } from 'react';
import { ArrowDown, Check, ClipboardCheck, History, ShieldCheck, X } from 'lucide-react';
import type { ProofAttestation, Requirement, VerificationRecord } from '../../types';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';
import RequirementBuilder from './RequirementBuilder';
import ProofScanner from './ProofScanner';
import VerificationResult, { type Verdict } from './VerificationResult';
import EmptyState from '../Shared/EmptyState';

const initialRequirement: Requirement = { id: '', credentialType: 'RN', requireValid: true, allowedIssuers: [], title: 'No requirement selected' };

export default function VerifierPortal() {
  const { ledger, history, recordVerification, ready } = useContract(); // Pull ready
  const { appMode, connected, connect } = useWallet(); // Pull wallet state
  const [requirement, setRequirement] = useState(initialRequirement);
  const [attestation, setAttestation] = useState<ProofAttestation | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  
  const verify = () => {
    if (!attestation) return;
    const issuerForCommitment = ledger.issuedBy[attestation.commitment];
    const commitmentKnown = Boolean(issuerForCommitment);
    const issuerVerified = commitmentKnown && ledger.issuers.some((item) => item.publicKey === issuerForCommitment);
    const revoked = ledger.revoked.includes(attestation.commitment);
    const matchingRequirement = attestation.requirementId === requirement.id;
    const issuerAllowed = requirement.allowedIssuers.length === 0 || requirement.allowedIssuers.includes(issuerForCommitment ?? '');
    const accepted = Boolean(requirement.id) && attestation.simulated && attestation.result && matchingRequirement && commitmentKnown && issuerVerified && !revoked && issuerAllowed;
    const reason = !requirement.id ? 'Build a requirement before verifying.' : !matchingRequirement ? 'Attestation was created for a different credential requirement.' : !commitmentKnown ? 'Credential commitment does not exist in this local demo ledger.' : revoked ? 'Credential commitment is marked revoked in the local demo ledger.' : !issuerVerified ? 'The issuer is not registered in the local demo ledger.' : !issuerAllowed ? 'Issuer does not satisfy the selected restriction.' : 'The supplied result is false or incomplete.';
    const next: Verdict = { accepted, commitmentKnown, issuerVerified, revoked, reason, attestation };
    setVerdict(next);
    const record: VerificationRecord = {
      id: `${Date.now()}-${attestation.nullifier.slice(-8)}`,
      at: new Date().toISOString(),
      result: accepted,
      requirement: requirement.title,
      commitment: attestation.commitment,
      issuerVerified,
      revoked,
      simulated: true,
    };
    recordVerification(record);
  };
  
  const receive = (proof: ProofAttestation) => { setAttestation(proof); setVerdict(null); };
  
  return <div className="space-y-6">
    <div className="enter flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div><p className="mb-2 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.2em] text-cyan-300"><ShieldCheck size={13} /> Verifier workspace / credential review</p><h1 className="text-3xl font-extrabold tracking-[-.05em] text-white sm:text-4xl">A clear signal.<br className="sm:hidden" /> No dossier required.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">Define the condition you need, inspect a holder attestation and keep a local review trail.</p></div>
      <div className="rounded-xl border border-cyan-400/15 bg-cyan-400/[.04] px-4 py-3"><p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Disclosure policy</p><p className="mt-1 text-xs font-bold text-cyan-100">Boolean + commitment only</p></div>
    </div>

    {!ready ? (
      <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <div className="panel h-96 animate-pulse rounded-2xl" />
        <div className="panel h-96 animate-pulse rounded-2xl" />
      </div>
    ) : appMode === 'testnet' && !connected ? (
      <EmptyState 
        title="Wallet Disconnected" 
        description="Connect and unlock your 1AM wallet to verify credentials against the Midnight testnet ledger." 
        action={<button onClick={() => void connect()} className="btn-primary rounded-lg px-4 py-2 text-xs font-bold">Connect Wallet</button>} 
      />
    ) : (
      <div className="grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
        <div className="space-y-4">
          <RequirementBuilder onBuild={(next) => { setRequirement(next); setVerdict(null); }} />
          <ProofScanner onAttestation={receive} />
          <div className="flex items-center justify-between rounded-xl border border-midnight-line bg-[#101827]/75 px-4 py-3"><span className="inline-flex items-center gap-2 text-[10px] font-bold text-slate-400"><ClipboardCheck size={14} className="text-indigo-300" />Active request</span><span className="text-[10px] font-bold text-slate-200">{requirement.id ? requirement.title : 'Not built yet'}</span></div>
          {attestation && <button type="button" disabled={!requirement.id} onClick={verify} className="btn-primary flex h-11 w-full items-center justify-center gap-2 rounded-lg text-xs font-extrabold"><ShieldCheck size={15} /> Verify against local ledger</button>}
          {attestation && <div className="flex items-center justify-center gap-2 text-[9px] text-amber-300"><ArrowDown size={12} /> Uses demo ledger only — not an on-chain transaction</div>}
        </div>
        <div className="space-y-4"><VerificationResult verdict={verdict} requirement={requirement} />
          <section className="panel rounded-2xl p-5">
            <div className="mb-4 flex items-center justify-between"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-slate-500">Local-only</p><h2 className="mt-1 inline-flex items-center gap-2 text-sm font-extrabold text-white"><History size={15} className="text-indigo-200" /> Verification history</h2></div><span className="rounded-md border border-midnight-line px-2 py-1 text-[9px] text-slate-500">{history.length} / 20</span></div>
            {history.length === 0 ? <EmptyState title="No reviews yet" description="Completed checks appear here on this device only." /> : <div className="space-y-2">{history.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-midnight-line bg-[#0b1220]/70 p-3">
              <div className="flex min-w-0 items-center gap-3"><span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${item.result ? 'bg-green-400/10 text-green-300' : 'bg-red-400/10 text-red-300'}`}>{item.result ? <Check size={14} /> : <X size={14} />}</span><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-200">{item.requirement}</p><p className="mono mt-1 truncate text-[9px] text-slate-500">{item.commitment}</p></div></div><div className="shrink-0 text-right"><span className="block text-[9px] font-bold text-amber-300">Simulated</span><time className="mt-1 block text-[9px] text-slate-600">{new Date(item.at).toLocaleString()}</time></div>
            </div>)}</div>}
          </section>
        </div>
      </div>
    )}
  </div>;
}