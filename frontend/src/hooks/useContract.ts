import { createContext, createElement, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Credential, CredentialType, Ledger, VerificationRecord } from '../types';
import { demoCredentials, loadCredentials, loadHistory, loadLedger, makeDemoLedger, saveCredentials, saveHistory, saveLedger, makeEmptyLedger } from '../lib/storage';
import { useWallet } from './useWallet';
import { queryNetworkLedger, submitIssueCredential, submitRegisterIssuer, submitRevokeCredential, computeIssuerPub } from '../lib/midnight';

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
  registerIssuer: (name: string) => Promise<void>;
  revoke: (commitment: string) => Promise<void>;
  recordVerification: (record: VerificationRecord) => void;
  refresh: () => Promise<void>;
}

const ContractContext = createContext<ContractValue | null>(null);

export function ContractProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet(); 
  
  // FIX: Initialize as an empty ledger immediately if in testnet mode
  const [ledger, setLedger] = useState<Ledger>(() => 
    wallet.appMode === 'testnet' ? makeEmptyLedger() : makeDemoLedger()
  );
  const [credentials, setCredentials] = useState<Credential[]>(() => 
    wallet.appMode === 'testnet' ? [] : demoCredentials()
  );
  
  const [history, setHistory] = useState<VerificationRecord[]>([]);
  const [ready, setReady] = useState(false);

  const syncState = async () => {
    const savedCreds = await loadCredentials();
    const savedHistory = await loadHistory();
    setCredentials(savedCreds);
    setHistory(savedHistory);
    
    if (wallet.appMode === 'testnet') {
      try {
        const onChainLedger = await queryNetworkLedger();
        setLedger(onChainLedger);
      } catch (err) {
        console.error("Failed to fetch testnet ledger:", err);
        setLedger(makeEmptyLedger());
      }
    } else {
      setLedger(await loadLedger(makeDemoLedger()));
    }
    setReady(true);
  };

  useEffect(() => {
    void syncState();
  }, [wallet.appMode]);

  const value = useMemo<ContractValue>(() => ({
    ledger,
    credentials,
    history,
    ready,
    issue: async (input) => {
      if (wallet.appMode === 'testnet') {
        if (!wallet.api) throw new Error('Connect a 1AM wallet to issue credentials on testnet.');
        
        // ACTUAL LOGIC: Request the true issuer secret key to authorize the proof/signature.
        const secretHex = window.prompt(
          `Enter the 64-character secret key for issuer ${input.issuerPub}:`, 
          import.meta.env.VITE_ISSUER_SECRET || ''
        );
        if (!secretHex || secretHex.length !== 64) {
          throw new Error('A valid 64-character hex secret key is required to issue credentials on testnet.');
        }
        
        const commitment = await submitIssueCredential(wallet.api, input, secretHex);
        const item: Credential = { ...input, id: `cred_${randomHex(5)}`, commitment: `0x${commitment}` };
        
        const nextCreds = [item, ...credentials];
        setCredentials(nextCreds);
        await saveCredentials(nextCreds);
        await syncState();
        return item;
      }

      // -- Existing Demo Logic --
      if (!ledger.issuers.some((issuer) => issuer.publicKey === input.issuerPub)) throw new Error('Choose a registered issuer before issuing.');
      if (new Date(input.expiryDate) <= new Date(input.issueDate)) throw new Error('Expiry date must be later than issue date.');
      const commitment = `0x${randomHex(32)}`;
      const item: Credential = { ...input, id: `cred_${randomHex(5)}`, commitment };
      const nextCreds = [item, ...credentials];
      const nextLedger = { ...ledger, issuedBy: { ...ledger.issuedBy, [commitment]: input.issuerPub } };
      setCredentials(nextCreds);
      setLedger(nextLedger);
      await Promise.all([saveCredentials(nextCreds), saveLedger(nextLedger)]);
      return item;
    },

    registerIssuer: async (name) => {
      const cleanName = name.trim();
      if (!cleanName) throw new Error('Issuer name is required.');
      
      if (wallet.appMode === 'testnet') {
        if (!wallet.api) throw new Error('Connect a 1AM wallet to register an issuer.');
        
        // 1. Ask for a SECRET, not a Public Key
        const secretHex = window.prompt(
          `Create a 64-character hex SECRET key for issuer "${cleanName}" (Save this! You need it to issue credentials):`, 
          import.meta.env.VITE_ISSUER_SECRET || '1111111111111111111111111111111111111111111111111111111111111111'
        );
        if (!secretHex || secretHex.length !== 64) {
          throw new Error('A valid 64-character hex secret key is required.');
        }

        // 2. Let the pure circuit compute the true cryptographic public key
        const pubKeyHex = await computeIssuerPub(wallet.api, secretHex);
        
        // 3. Register the computed public key
        await submitRegisterIssuer(wallet.api, pubKeyHex);
        await syncState();
        return;
      }

      // -- Existing Demo Logic --
      if (ledger.issuers.some((issuer) => issuer.name.toLowerCase() === cleanName.toLowerCase())) throw new Error('This issuer is already registered.');
      const next = { ...ledger, issuers: [...ledger.issuers, { name: cleanName, publicKey: `issuer_${randomHex(12)}`, registeredAt: new Date().toISOString().slice(0, 10) }] };
      setLedger(next);
      void saveLedger(next);
    },

    revoke: async (commitment) => {
      const normalized = commitment.trim();
      
      if (wallet.appMode === 'testnet') {
        if (!wallet.api) throw new Error('Connect a 1AM wallet to revoke a credential.');
        
        // ACTUAL LOGIC: Revocation strictly requires the original issuer's secret key.
        const secretHex = window.prompt(
          `Enter the 64-character secret key for the issuer to authorize revocation of ${normalized}:`, 
          import.meta.env.VITE_ISSUER_SECRET || ''
        );
        if (!secretHex || secretHex.length !== 64) {
          throw new Error('A valid 64-character hex secret key is required to revoke credentials on testnet.');
        }

        await submitRevokeCredential(wallet.api, normalized, secretHex);
        await syncState();
        return;
      }

      // -- Existing Demo Logic --
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

    refresh: syncState,
  }), [ledger, credentials, history, ready, wallet.appMode, wallet.api]);

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