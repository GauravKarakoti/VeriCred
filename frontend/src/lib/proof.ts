import type { Credential, ProofAttestation, Requirement } from '../types';

export async function buildRequirement(input: Omit<Requirement, 'id'>): Promise<Requirement> {
  const id = await sha256(`${input.credentialType}|${input.requireValid}|${[...input.allowedIssuers].sort().join(',')}|vericred/v1/requirement`);
  return { ...input, id };
}

export async function generateProof(
  credential: Credential,
  requirement: Requirement,
  onPhase: (phase: 'collecting' | 'proving' | 'serializing') => void,
): Promise<ProofAttestation> {
  onPhase('collecting');
  await delay(220);
  onPhase('proving');
  await delay(260);
  const expiry = new Date(`${credential.expiryDate}T23:59:59`);
  const valid = (!requirement.requireValid || expiry.getTime() > Date.now())
    && credential.credentialType === requirement.credentialType
    && (!requirement.allowedIssuers.length || requirement.allowedIssuers.includes(credential.issuerPub));
  if (!valid) throw new Error('This credential does not meet the selected requirement.');
  onPhase('serializing');
  await delay(180);
  const nullifier = await sha256(`${credential.commitment}|${requirement.id}|vericred/v1/midnight/demo`);
  return {
    version: 1,
    simulated: true,
    nullifier: `0x${nullifier}`,
    commitment: credential.commitment,
    result: true,
    requirementId: requirement.id,
    createdAt: new Date().toISOString(),
  };
}

export function serializeAttestation(attestation: any): string {
  return JSON.stringify(attestation);
}

export function parseAttestation(value: string): any {
  let parsed: any;
  try { 
    parsed = JSON.parse(value); 
  } catch { 
    throw new Error('This is not valid JSON. Please paste a valid cryptographic proof payload.'); 
  }
  
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Attestation must be a JSON object.');
  }

  // Handle Real Cryptographic Proofs from the Midnight network
  if (parsed.txHash && parsed.requirement && parsed.timestamp) {
    parsed.requirementId = parsed.requirement.id;
    
    // 🚀 THE FIX: Strip '0x' prefixes so the UI can match them against the raw Indexer ledger keys!
    parsed.commitment = parsed.credential?.commitment?.replace(/^0x/, '');
    
    if (parsed.credential && parsed.credential.issuerPub) {
      parsed.credential.issuerPub = parsed.credential.issuerPub.replace(/^0x/, '');
    }
    
    parsed.nullifier = parsed.txHash;
    parsed.result = true;
    return parsed;
  }

  // Handle legacy/simulated proofs
  if (parsed.version === 1 && parsed.simulated === true && typeof parsed.commitment === 'string') {
    parsed.commitment = parsed.commitment.replace(/^0x/, '');
    return parsed;
  }

  throw new Error('Payload is missing required ZK proof fields (txHash, requirement context, timestamp).');
}
function delay(ms: number): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
async function sha256(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}