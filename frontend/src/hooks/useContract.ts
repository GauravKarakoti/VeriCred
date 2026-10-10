import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Credential, CredentialType, Ledger, VerificationRecord } from '../types';
import { demoCredentials, loadCredentials, loadHistory, loadLedger, makeDemoLedger, saveCredentials, saveHistory, saveLedger } from '../lib/storage';

interface IssueInput {
  holderCommitment: string;
  credentialType: CredentialType;
  licenseNumber: string;
  issuingBoard: string;
  issueDate: string;
  expiryDate: string;
  issuerPub: string;
}
interface ContractValue {
  ledger: Ledger;
  credentials: Credential[];
  history: VerificationRecord[];
  ready: boolean;
  issue: (input: IssueInput) => Promise<Credential>;
  registerIssuer: (name: string) => void;
  revoke: (commitment: string) => void;
  recordVerification: (record: VerificationRecord) => void;
  refresh: () => void;
}
const ContractContext = createContext<ContractValue | null>(null);

export function ContractProvider({ children }: { children: ReactNode }) {
  const [ledger, setLedger] = useState<Ledger>(() => makeDemoLedger());
  const [credentials, setCredentials] = useState<Credential[]>(() => demoCredentials());
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    void (async () => {
      const savedCreds = await loadCredentials();
      const savedLedger = await loadLedger(makeDemoLedger());
      const savedHistory = await loadHistory();
      if (!active) return;
      setCredentials(savedCreds);
      setLedger(savedLedger);
      setHistory(savedHistory);
      setReady(true);
    })();
    return () => { active = false; };
  }, []);

  const value = useMemo<ContractValue>(() => ({
    ledger,
    credentials,
    history,
    ready,
    issue: async (input) => {
      if (!ledger.issuers.some((issuer) => issuer.publicKey === input.issuerPub)) throw new Error('Choose a registered issuer before issuing.');
      if (new Date(input.expiryDate) <= new Date(input.issueDate)) throw new Error('Expiry date must be later than issue date.');
      const commitment = `0x${randomHex(32)}`;
      const item: Credential = { ...input, id: `cred_${randomHex(5)}`, commitment, };
      const nextCreds = [item, ...credentials];
      const nextLedger = { ...ledger, issuedBy: { ...ledger.issuedBy, [commitment]: input.issuerPub } };
      setCredentials(nextCreds);
      setLedger(nextLedger);
      await Promise.all([saveCredentials(nextCreds), saveLedger(nextLedger)]);
      return item;
    },
    registerIssuer: (name) => {
      const cleanName = name.trim();
      if (!cleanName) throw new Error('Issuer name is required.');
      if (ledger.issuers.some((issuer) => issuer.name.toLowerCase() === cleanName.toLowerCase())) throw new Error('This issuer is already registered.');
      const next = { ...ledger, issuers: [...ledger.issuers, { name: cleanName, publicKey: `issuer_${randomHex(12)}`, registeredAt: new Date().toISOString().slice(0, 10) }] };
      setLedger(next);
      void saveLedger(next);
    },
    revoke: (commitment) => {
      const normalized = commitment.trim();
      if (!ledger.issuedBy[normalized]) throw new Error('No issued credential matches that commitment.');
      if (ledger.revoked.includes(normalized)) throw new Error('This credential has already been revoked.');
      const next = { ...ledger, revoked: [...ledger.revoked, normalized] };
      setLedger(next);
      void saveLedger(next);
    },
    recordVerification: (record) => {
      const nextHistory = [record, ...history].slice(0, 20);
      const nextLedger = { ...ledger, verificationCount: ledger.verificationCount + (record.result ? 1 : 0) };
      setHistory(nextHistory);
      setLedger(nextLedger);
      void Promise.all([saveHistory(nextHistory), saveLedger(nextLedger)]);
    },
    refresh: () => {
      void Promise.all([loadLedger(makeDemoLedger()), loadCredentials(), loadHistory()]).then(([nextLedger, nextCredentials, nextHistory]) => {
        setLedger(nextLedger);
        setCredentials(nextCredentials);
        setHistory(nextHistory);
      });
    },
  }), [ledger, credentials, history, ready]);

  return createElement(ContractContext.Provider, { value }, children);
}

export function useContract(): ContractValue {
  const value = useContext(ContractContext);
  if (!value) throw new Error('useContract must be used within ContractProvider');
  return value;
}
function randomHex(bytes: number): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (value) => value.toString(16).padStart(2, '0')).join('');
}
