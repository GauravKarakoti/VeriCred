import { useMemo } from 'react';
import { QrCode, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import type { ProofAttestation } from '../../types';
import { serializeAttestation } from '../../lib/proof';
import CopyButton from '../Shared/CopyButton';
import PrivacyReceipt from '../Shared/PrivacyReceipt';

export default function ShareProof({ attestation, onClose }: { attestation: ProofAttestation; onClose?: () => void }) {
  const value = useMemo(() => serializeAttestation(attestation), [attestation]);
  return <section className="space-y-4">
    <div className="flex items-start gap-3 rounded-xl border border-green-400/20 bg-green-400/[.055] p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-green-400/10 text-green-300"><ShieldCheck size={19} /></span>
      <div><p className="text-sm font-extrabold text-green-100">Credential requirement satisfied</p><p className="mt-1 text-[11px] leading-5 text-slate-400">A synthetic demo attestation is ready to share. It is not cryptographic and was not submitted on-chain.</p></div>
    </div>
    <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
      <div className="flex flex-col items-center justify-center rounded-xl border border-midnight-line bg-white p-4">
        <QRCodeSVG value={value} size={148} level="M" includeMargin />
        <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-slate-500"><QrCode size={12} /> VeriCred demo payload</span>
      </div>
      <div className="min-w-0 rounded-xl border border-midnight-line bg-[#0b1220] p-4">
        <div className="mb-2 flex items-center justify-between gap-2"><p className="text-[10px] font-extrabold uppercase tracking-[.14em] text-slate-400">Attestation payload</p><CopyButton value={value} label="Copy attestation" /></div>
        <pre className="mono max-h-44 overflow-auto whitespace-pre-wrap break-all text-[10px] leading-5 text-cyan-100/75">{JSON.stringify(attestation, null, 2)}</pre>
        <p className="mt-3 border-t border-midnight-line pt-3 text-[10px] leading-4 text-slate-500">Shares the scoped result, credential commitment, nullifier and requirement reference. Credential type and issuer are not included as separate attestation fields.</p>
      </div>
    </div>
    <PrivacyReceipt circuit="proveCredential" />
    {onClose && <button type="button" onClick={onClose} className="btn-quiet w-full rounded-lg py-2.5 text-xs font-bold">Done</button>}
  </section>;
}
