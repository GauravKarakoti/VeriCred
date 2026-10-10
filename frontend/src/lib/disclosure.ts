import type { CircuitName } from '../types';

export const DISCLOSURE_MANIFEST: Record<CircuitName, { disclosed: string[]; private: string[] }> = {
  registerIssuer: {
    disclosed: ['Issuer public key'],
    private: ['Governance secret'],
  },
  issueCredential: {
    disclosed: ['Issuer public key', 'Credential commitment', 'Credential type'],
    private: ['Holder identity', 'License number', 'Issuing board', 'Issue date', 'Expiry date'],
  },
  proveCredential: {
    disclosed: ['Issuer public key', 'Verification result (true)', 'Nullifier', 'Credential commitment'],
    private: ['Holder identity', 'License number', 'Issuing board', 'Issue date', 'Expiry date'],
  },
  revokeCredential: {
    disclosed: ['Issuer public key', 'Credential commitment'],
    private: ['Holder identity', 'Link between commitment and holder'],
  },
};
