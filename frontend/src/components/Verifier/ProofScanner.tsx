import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, CameraOff, ClipboardPaste, ScanLine, ShieldCheck } from 'lucide-react';
import QrScanner from 'qr-scanner';
import type { ProofAttestation } from '../../types';
import { parseAttestation } from '../../lib/proof';

export default function ProofScanner({ onAttestation }: { onAttestation: (attestation: ProofAttestation) => void }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  useEffect(() => {
    if (!scanning || !videoRef.current) return;
    const scanner = new QrScanner(videoRef.current, (decoded) => {
      setRaw(typeof decoded === 'string' ? decoded : decoded.data);
      setNotice('QR content captured. Inspect it to verify the local demo attestation.');
      setError('');
      setScanning(false);
    }, { preferredCamera: 'environment', highlightScanRegion: true, highlightCodeOutline: true });
    scannerRef.current = scanner;
    void scanner.start().catch((cause: unknown) => {
      setError(cause instanceof Error ? cause.message : 'Could not start the camera scanner.');
      setScanning(false);
    });
    return () => {
      scanner.stop();
      scanner.destroy();
      scannerRef.current = null;
    };
  }, [scanning]);
  const paste = async () => {
    try { setRaw(await navigator.clipboard.readText()); setNotice('Clipboard content added.'); setError(''); }
    catch { setError('Clipboard access is unavailable. Paste the attestation into the field.'); }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    try { onAttestation(parseAttestation(raw.trim())); setNotice('Attestation parsed. Review the result below.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not parse this attestation.'); }
  };
  return <section className="panel rounded-2xl p-5">
    <div className="mb-4 flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-cyan-300">02 / inspect</p><h2 className="mt-1 text-base font-extrabold text-white">Read an attestation</h2><p className="mt-1 text-[10px] text-slate-500">Paste the QR payload or its JSON text.</p></div><span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/15 bg-cyan-400/[.06] text-cyan-200"><ScanLine size={16} /></span></div>
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor="attestation" className="sr-only">Attestation JSON</label>
      <textarea id="attestation" value={raw} onChange={(e) => setRaw(e.target.value)} placeholder='{"version":1,"simulated":true,…}' rows={7} className="field mono resize-y p-3 text-[10px] leading-5" />
      <div className="flex gap-2"><button type="button" onClick={() => { setError(''); setNotice(''); setScanning(!scanning); }} className="btn-quiet inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold">{scanning ? <CameraOff size={14} /> : <Camera size={14} />}{scanning ? 'Stop camera' : 'Scan QR'}</button><button type="button" onClick={() => void paste()} className="btn-quiet inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold"><ClipboardPaste size={14} /> Paste</button><button disabled={!raw.trim()} className="btn-primary inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-extrabold"><ShieldCheck size={14} /> Inspect</button></div>
    </form>
    {scanning && <div className="mt-3 overflow-hidden rounded-xl border border-midnight-line bg-black"><video ref={videoRef} className="max-h-64 w-full object-cover" muted playsInline aria-label="Camera QR scanner" /></div>}
    {error && <p role="alert" className="mt-3 rounded-lg border border-red-400/20 bg-red-400/[.05] p-3 text-[10px] text-red-200">{error}</p>}
    {notice && <p role="status" className="mt-3 text-[10px] text-cyan-200">{notice}</p>}
    <p className="mt-3 text-[9px] leading-4 text-slate-600">Camera access requires browser permission and a secure connection. Demo attestations are simulated, not cryptographic proofs.</p>
  </section>;
}
