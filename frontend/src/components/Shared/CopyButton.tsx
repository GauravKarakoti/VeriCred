import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export default function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };
  return <button type="button" onClick={() => void copy()} className="btn-quiet inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold" aria-label={copied ? 'Copied to clipboard' : label}>
    {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
    {copied ? 'Copied' : label}
  </button>;
}
