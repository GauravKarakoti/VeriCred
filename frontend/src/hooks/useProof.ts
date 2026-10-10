import { useState } from 'react';
import type { ProofAttestation, ProofStatus, Requirement, Credential } from '../types';
import { generateProof } from '../lib/proof';

export function useProof() {
  const [status, setStatus] = useState<ProofStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [attestation, setAttestation] = useState<ProofAttestation | null>(null);
  const progress = status === 'collecting' ? 1 : status === 'proving' ? 2 : status === 'serializing' || status === 'done' ? 3 : 0;
  return {
    status, progress, error, attestation,
    generate: async (credential: Credential, requirement: Requirement) => {
      setError(null);
      setAttestation(null);
      try {
        const result = await generateProof(credential, requirement, setStatus);
        setAttestation(result);
        setStatus('done');
        return result;
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : 'Proof simulation failed.';
        setError(message);
        setStatus('error');
        return null;
      }
    },
    reset: () => { setStatus('idle'); setError(null); setAttestation(null); },
  };
}
