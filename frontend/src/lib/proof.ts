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

export function serializeAttestation(attestation: ProofAttestation): string {
  return JSON.stringify(attestation);
}
export function parseAttestation(value: string): ProofAttestation {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { throw new Error('This is not valid VeriCred attestation JSON.'); }
  if (!parsed || typeof parsed !== 'object') throw new Error('Attestation must be a JSON object.');
  const proof = parsed as Partial<ProofAttestation>;
  if (proof.version !== 1 || proof.simulated !== true || typeof proof.nullifier !== 'string' || typeof proof.commitment !== 'string'
    || typeof proof.result !== 'boolean' || typeof proof.requirementId !== 'string') throw new Error('Attestation is missing required demo proof fields.');
  return proof as ProofAttestation;
}
function delay(ms: number): Promise<void> { return new Promise((resolve) => window.setTimeout(resolve, ms)); }
async function sha256(input: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
