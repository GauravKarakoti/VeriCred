export type CredentialType = 'RN' | 'MD' | 'LPN' | 'EMT' | 'CUSTOM';
export type WalletMode = 'lace' | 'demo' | 'disconnected';
export type AppMode = 'demo' | 'testnet';
export type CircuitName = 'registerIssuer' | 'issueCredential' | 'proveCredential' | 'revokeCredential';

export interface Credential {
  id: string;
  commitment: string;
  credentialType: CredentialType;
  issuerPub: string;
  holderCommitment: string;
  licenseNumber: string;
  issuingBoard: string;
  issueDate: string;
  expiryDate: string;
}

export interface IssuerRecord {
  publicKey: string;
  name: string;
  registeredAt: string;
}

export interface Ledger {
  governancePub: string;
  domainSeparator: string;
  issuers: IssuerRecord[];
  issuedBy: Record<string, string>;
  revoked: string[];
  verificationCount: number;
}

export interface Requirement {
  id: string;
  credentialType: CredentialType;
  requireValid: boolean;
  allowedIssuers: string[];
  title: string;
}

export interface ProofAttestation {
  version: 1;
  simulated: true;
  nullifier: string;
  commitment: string;
  result: boolean;
  requirementId: string;
  createdAt: string;
}

export interface VerificationRecord {
  id: string;
  at: string;
  result: boolean;
  requirement: string;
  commitment: string;
  issuerVerified: boolean;
  revoked: boolean;
  simulated: true;
}

export type ProofStatus = 'idle' | 'collecting' | 'proving' | 'serializing' | 'done' | 'error';
