import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, CameraOff, ClipboardPaste, ScanLine, ShieldCheck, Upload } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { parseAttestation } from '../../lib/proof';

export default function ProofScanner({ onAttestation }: { onAttestation: (attestation: any) => void }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [scanning, setScanning] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!scanning) {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
      return;
    }

    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        setRaw(decodedText);
        setNotice('QR content captured. Inspect it to verify the cryptographic proof.');
        setError('');
        setScanning(false);
      },
      (errorMessage) => {
        // Ignore continuous stream parse errors
      }
    ).catch((cause) => {
      setError('Could not start camera. Please ensure permissions are granted.');
      setScanning(false);
    });

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, [scanning]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setNotice('Scanning uploaded image...');
      
      // THE FIX: Instantiate the scanner first, then call scanFile
      const html5QrCode = new Html5Qrcode("qr-reader");
      // passing 'false' prevents the library from injecting an image preview into the DOM
      const decodedText = await html5QrCode.scanFile(file, false); 
      
      setRaw(decodedText);
      setNotice('QR code read from image successfully.');
      setError('');
    } catch (err) {
      setError('Could not find a valid QR code in this image.');
      setNotice('');
    } finally {
      e.target.value = ''; // Reset input so the same file can be selected again
    }
  };

  const paste = async () => {
    try { 
      setRaw(await navigator.clipboard.readText()); 
      setNotice('Clipboard content added.'); 
      setError(''); 
    } catch { 
      setError('Clipboard access is unavailable. Paste the attestation into the field manually.'); 
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault(); 
    setError(''); 
    setNotice('');
    try { 
      onAttestation(parseAttestation(raw.trim())); 
      setNotice('Attestation parsed. Review the result below.'); 
    } catch (cause) { 
      setError(cause instanceof Error ? cause.message : 'Could not parse this attestation.'); 
    }
  };

  return (
    <section className="panel rounded-2xl p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-cyan-300">02 / inspect</p>
          <h2 className="mt-1 text-base font-extrabold text-white">Read an attestation</h2>
          <p className="mt-1 text-[10px] text-slate-500">Scan a QR, upload an image, or paste JSON.</p>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-lg border border-cyan-400/15 bg-cyan-400/[.06] text-cyan-200">
          <ScanLine size={16} />
        </span>
      </div>

      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="attestation" className="sr-only">Attestation JSON</label>
        <textarea 
          id="attestation" 
          value={raw} 
          onChange={(e) => setRaw(e.target.value)} 
          placeholder='{"txHash":"...","requirement":{...}}' 
          rows={7} 
          className="field mono resize-y p-3 text-[10px] leading-5" 
        />
        
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button 
            type="button" 
            onClick={() => { setError(''); setNotice(''); setScanning(!scanning); }} 
            className="btn-quiet inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold"
          >
            {scanning ? <CameraOff size={14} /> : <Camera size={14} />}
            {scanning ? 'Stop' : 'Camera'}
          </button>
          
          <button 
            type="button" 
            onClick={() => fileInputRef.current?.click()} 
            className="btn-quiet inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold"
          >
            <Upload size={14} /> Upload QR
          </button>
          <input 
            type="file" 
            accept="image/*" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          
          <button 
            type="button" 
            onClick={() => void paste()} 
            className="btn-quiet inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold"
          >
            <ClipboardPaste size={14} /> Paste
          </button>
          
          <button 
            disabled={!raw.trim()} 
            className="btn-primary inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-extrabold sm:col-span-1 col-span-2"
          >
            <ShieldCheck size={14} /> Inspect
          </button>
        </div>
      </form>

      {/* Target DOM Element for Html5Qrcode - Must remain in the DOM so the library can attach to it! */}
      <div 
        id="qr-reader" 
        className={scanning ? "mt-4 overflow-hidden rounded-xl border border-midnight-line bg-black w-full" : "hidden"} 
      />

      {error && <p role="alert" className="mt-4 rounded-lg border border-red-400/20 bg-red-400/[.05] p-3 text-[10px] text-red-200">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/[.05] p-3 text-[10px] text-cyan-200">{notice}</p>}
    </section>
  );
}