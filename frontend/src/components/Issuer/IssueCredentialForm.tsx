import { useState, type FormEvent } from 'react';
import { FilePlus2, LockKeyhole, ShieldCheck } from 'lucide-react';
import type { CredentialType } from '../../types';
import { useContract } from '../../hooks/useContract';
import { useWallet } from '../../hooks/useWallet';
import PrivacyReceipt from '../Shared/PrivacyReceipt';

const today = new Date().toISOString().slice(0, 10);
export default function IssueCredentialForm() {
  const { ledger, issue } = useContract();
  const wallet = useWallet();
  const [type, setType] = useState<CredentialType>('RN');
  const [issuerPub, setIssuerPub] = useState(ledger.issuers[0]?.publicKey ?? '');
  const [holderCommitment, setHolder] = useState('');
  const [license, setLicense] = useState('');
  const [board, setBoard] = useState('');
  const [issueDate, setIssueDate] = useState(today);
  const [expiryDate, setExpiryDate] = useState('');
  const [receipt, setReceipt] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setMessage(''); setReceipt(false); setBusy(true);
    try {
      const credential = await issue({ holderCommitment: holderCommitment.trim(), credentialType: type, licenseNumber: license.trim(), issuingBoard: board.trim(), issueDate, expiryDate, issuerPub });
      setMessage(`Credential issued. Commitment ${credential.commitment}`);
      setReceipt(true);
      setHolder(''); setLicense(''); setBoard(''); setExpiryDate('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not issue credential.');
    } finally { setBusy(false); }
  };
  return <section className="panel rounded-2xl p-5 sm:p-6">
    <div className="mb-5 flex items-start justify-between gap-3">
      <div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-indigo-300">01 / issuance</p><h2 className="mt-1 text-lg font-extrabold tracking-tight text-white">Issue a credential</h2><p className="mt-1 text-xs text-slate-500">Private details stay in the local demo vault. The ledger receives a commitment only.</p></div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-indigo-300/15 bg-indigo-300/[.07] text-indigo-200"><FilePlus2 size={18} /></span>
    </div>
      <form onSubmit={(event) => void onSubmit(event)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-[11px] font-bold text-slate-400">Registered issuer
            <select required value={issuerPub} onChange={(e) => setIssuerPub(e.target.value)} className="field mt-1.5 h-10 px-3 text-xs">{ledger.issuers.map((issuer) => <option value={issuer.publicKey} key={issuer.publicKey}>{issuer.name}</option>)}</select>
          </label>
          <label className="block text-[11px] font-bold text-slate-400">Credential type
            <select value={type} onChange={(e) => setType(e.target.value as CredentialType)} className="field mt-1.5 h-10 px-3 text-xs">{['RN', 'MD', 'LPN', 'EMT', 'CUSTOM'].map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label className="block text-[11px] font-bold text-slate-400">Holder commitment <span className="font-normal text-slate-600">· pseudonymous</span>
            <input required value={holderCommitment} onChange={(e) => setHolder(e.target.value)} placeholder="Paste holder commitment" className="field mono mt-1.5 h-10 px-3 text-xs" />
          </label>
          <label className="block text-[11px] font-bold text-slate-400">License number <span className="font-normal text-amber-300">· private</span>
            <input required value={license} onChange={(e) => setLicense(e.target.value)} placeholder="Entered locally; never in public ledger" className="field mt-1.5 h-10 px-3 text-xs" />
          </label>
          <label className="block text-[11px] font-bold text-slate-400">Issuing board <span className="font-normal text-amber-300">· private</span>
            <input required value={board} onChange={(e) => setBoard(e.target.value)} placeholder="Board / authority name" className="field mt-1.5 h-10 px-3 text-xs" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-[11px] font-bold text-slate-400">Issue date
              <input required type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="field mt-1.5 h-10 px-2 text-[11px]" />
            </label>
            <label className="block text-[11px] font-bold text-slate-400">Expiry date
              <input required type="date" min={issueDate} value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="field mt-1.5 h-10 px-2 text-[11px]" />
            </label>
          </div>
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-amber-400/10 bg-amber-400/[.035] p-3 text-[10px] leading-4 text-slate-400"><LockKeyhole size={13} className="mt-0.5 shrink-0 text-amber-300" /> Demo mode saves credential details in this browser’s IndexedDB without encryption. Never use real patient or license data here.</div>
        {error && <p role="alert" className="rounded-lg border border-red-400/20 bg-red-400/5 px-3 py-2 text-xs text-red-200">{error}</p>}
        {message && <p role="status" className="break-all rounded-lg border border-green-400/20 bg-green-400/5 px-3 py-2 text-xs text-green-200"><ShieldCheck size={13} className="mr-1 inline" />{message}</p>}
        <button disabled={busy || !holderCommitment.trim() || !license.trim() || !board.trim() || !expiryDate} className="btn-primary flex h-10 w-full items-center justify-center gap-2 rounded-lg text-xs font-extrabold"><FilePlus2 size={15} />{busy ? 'Issuing locally…' : 'Issue credential'}</button>
      </form>
    {receipt && <div className="mt-4"><PrivacyReceipt circuit="issueCredential" /></div>}
  </section>;
}
