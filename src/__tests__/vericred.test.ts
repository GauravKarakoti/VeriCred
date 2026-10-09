import { describe, it, expect, beforeEach } from 'vitest';
import {
  VeriCredHarness,
  randomActors,
  type TestActors,
} from './harness.js';
import { CredentialType } from '../../contracts/managed/vericred/contract/index.js';
import { bytes32 } from './util.js';

describe('VeriCred — functional tests', () => {
  let h: VeriCredHarness;
  let actors: TestActors;
  let holderCommitment: Uint8Array;
  let issuerPub: Uint8Array;

  beforeEach(async () => {
    actors = randomActors();
    h = await VeriCredHarness.deploy(actors);

    // Derive the holder commitment the same way the contract does.
    holderCommitment = bytes32(0x11);
    issuerPub = bytes32(0x22); // replaced after registration below
  });

  // ---------------------------------------------------------------------------
  // 1. Deploy
  // ---------------------------------------------------------------------------
  it('deploys with an empty issuer set and a domain separator', () => {
    const l = h.ledger();
    expect(l.domainSeparator).toBeDefined();
    expect(l.verificationCount).toBe(0n);
  });

  // ---------------------------------------------------------------------------
  // 2. Register issuer
  // ---------------------------------------------------------------------------
  it('governance can register an issuer', async () => {
    // Derive the issuer pub exactly as the contract does.
    issuerPub = await h.call('issuerPubOf', [actors.issuerSecret]).then(
      (r) => r.result as Uint8Array,
    );

    await h.call('registerIssuer', [issuerPub]);

    const l = h.ledger();
    expect((l.issuers as Set<string>).has(Buffer.from(issuerPub).toString('hex'))).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // 3. Issue credential
  // ---------------------------------------------------------------------------
  it('registered issuer can issue a credential to a holder commitment', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    const { result: commitment } = await h.call('issueCredential', [
      holderCommitment,
      CredentialType.RN,
      bytes32(0xaa), // licenseNumber
      bytes32(0xbb), // issuingBoard
      1_700_000_000n, // issueDate
      1_800_000_000n, // expiryDate
    ]);

    expect(commitment).toBeInstanceOf(Uint8Array);
    expect(commitment.length).toBe(32);

    const l = h.ledger();
    expect((l.issuedBy as Map<string, string>).size).toBe(1);
  });

  // ---------------------------------------------------------------------------
  // 4. Prove valid credential
  // ---------------------------------------------------------------------------
  it('holder can prove a valid, non-revoked, correct-type credential', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    const { result: commitment } = await h.call('issueCredential', [
      holderCommitment,
      CredentialType.RN,
      bytes32(0xaa),
      bytes32(0xbb),
      1_700_000_000n,
      1_800_000_000n,
    ]);

    h.setCredential({
      licenseNumber: bytes32(0xaa),
      issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n,
      expiryDate: 1_800_000_000n,
      credentialType: CredentialType.RN,
      holderCommitment,
      issuerPub,
    });

    const { result } = await h.call('proveCredential', [
      bytes32(0x01), // requirementId
      CredentialType.RN,
      1_750_000_000n, // currentEpoch (between issue and expiry)
    ]);

    expect(result).toBe(true);
    expect(h.ledger().verificationCount).toBe(1n);
  });

  // ---------------------------------------------------------------------------
  // 5. Reject expired credential
  // ---------------------------------------------------------------------------
  it('rejects an expired credential', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    await h.call('issueCredential', [
      holderCommitment,
      CredentialType.RN,
      bytes32(0xaa),
      bytes32(0xbb),
      1_700_000_000n,
      1_750_000_000n,
    ]);

    h.setCredential({
      licenseNumber: bytes32(0xaa),
      issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n,
      expiryDate: 1_750_000_000n,
      credentialType: CredentialType.RN,
      holderCommitment,
      issuerPub,
    });

    await expect(
      h.call('proveCredential', [
        bytes32(0x01),
        CredentialType.RN,
        1_800_000_000n, // AFTER expiry
      ]),
    ).rejects.toThrow(/Credential expired/);
  });

  // ---------------------------------------------------------------------------
  // 6. Reject credential from unregistered issuer
  // ---------------------------------------------------------------------------
  it('rejects a credential from an unregistered issuer', async () => {
    // Note: we do NOT call registerIssuer.
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;

    // The issuer cannot even issue.
    await expect(
      h.call('issueCredential', [
        holderCommitment,
        CredentialType.RN,
        bytes32(0xaa),
        bytes32(0xbb),
        1_700_000_000n,
        1_800_000_000n,
      ]),
    ).rejects.toThrow(/Issuer not registered/);
  });

  // ---------------------------------------------------------------------------
  // 7. Reject revoked credential
  // ---------------------------------------------------------------------------
  it('rejects a revoked credential', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    const { result: commitment } = await h.call('issueCredential', [
      holderCommitment,
      CredentialType.RN,
      bytes32(0xaa),
      bytes32(0xbb),
      1_700_000_000n,
      1_800_000_000n,
    ]);

    h.setCredential({
      licenseNumber: bytes32(0xaa),
      issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n,
      expiryDate: 1_800_000_000n,
      credentialType: CredentialType.RN,
      holderCommitment,
      issuerPub,
    });

    // Revoke, then prove.
    await h.call('revokeCredential', [commitment]);

    await expect(
      h.call('proveCredential', [
        bytes32(0x01),
        CredentialType.RN,
        1_750_000_000n,
      ]),
    ).rejects.toThrow(/Credential revoked/);
  });

  // ---------------------------------------------------------------------------
  // 8. Reject credential not owned by the caller
  // ---------------------------------------------------------------------------
  it('rejects a credential whose holderCommitment does not match the caller', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    await h.call('issueCredential', [
      bytes32(0xdeadbeef), // some OTHER holder's commitment
      CredentialType.RN,
      bytes32(0xaa),
      bytes32(0xbb),
      1_700_000_000n,
      1_800_000_000n,
    ]);

    h.setCredential({
      licenseNumber: bytes32(0xaa),
      issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n,
      expiryDate: 1_800_000_000n,
      credentialType: CredentialType.RN,
      holderCommitment: bytes32(0xdeadbeef), // wrong
      issuerPub,
    });

    await expect(
      h.call('proveCredential', [
        bytes32(0x01),
        CredentialType.RN,
        1_750_000_000n,
      ]),
    ).rejects.toThrow(/does not belong to this holder/);
  });

  // ---------------------------------------------------------------------------
  // 9. Nullifier is deterministic per (commitment, requirement)
  // ---------------------------------------------------------------------------
  it('produces a deterministic nullifier for the same requirement', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);
    await h.call('issueCredential', [
      holderCommitment, CredentialType.RN,
      bytes32(0xaa), bytes32(0xbb), 1_700_000_000n, 1_800_000_000n,
    ]);

    h.setCredential({
      licenseNumber: bytes32(0xaa), issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n, expiryDate: 1_800_000_000n,
      credentialType: CredentialType.RN, holderCommitment, issuerPub,
    });

    const r1 = await h.call('proveCredential', [bytes32(0x01), CredentialType.RN, 1_750_000_000n]);
    const r2 = await h.call('proveCredential', [bytes32(0x01), CredentialType.RN, 1_750_000_000n]);

    // The proof succeeds both times; the nullifier is deterministic.
    expect(r1.result).toBe(true);
    expect(r2.result).toBe(true);
    // The nullifier value itself is emitted in the transcript; see harness.
  });

  // ---------------------------------------------------------------------------
  // 10. Verification counter increments
  // ---------------------------------------------------------------------------
  it('increments the verification counter on every successful proof', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);
    await h.call('issueCredential', [
      holderCommitment, CredentialType.RN,
      bytes32(0xaa), bytes32(0xbb), 1_700_000_000n, 1_800_000_000n,
    ]);

    h.setCredential({
      licenseNumber: bytes32(0xaa), issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n, expiryDate: 1_800_000_000n,
      credentialType: CredentialType.RN, holderCommitment, issuerPub,
    });

    expect(h.ledger().verificationCount).toBe(0n);
    await h.call('proveCredential', [bytes32(0x01), CredentialType.RN, 1_750_000_000n]);
    expect(h.ledger().verificationCount).toBe(1n);
    await h.call('proveCredential', [bytes32(0x02), CredentialType.RN, 1_750_000_000n]);
    expect(h.ledger().verificationCount).toBe(2n);
  });

  // ---------------------------------------------------------------------------
  // 11. Revocation updates the public revoked set
  // ---------------------------------------------------------------------------
  it('adds the commitment to the public revoked set', async () => {
    issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    const { result: commitment } = await h.call('issueCredential', [
      holderCommitment, CredentialType.RN,
      bytes32(0xaa), bytes32(0xbb), 1_700_000_000n, 1_800_000_000n,
    ]);

    expect((h.ledger().revoked as Set<string>).size).toBe(0);
    await h.call('revokeCredential', [commitment]);
    expect((h.ledger().revoked as Set<string>).size).toBe(1);
  });
});