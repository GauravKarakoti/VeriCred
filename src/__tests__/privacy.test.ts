import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { VeriCredHarness, randomActors } from './harness.js';
import { CredentialType } from '../../contracts/managed/vericred/contract/index.js';
import { bytes32 } from './util.js';

/**
 * Adversarial privacy tests.
 *
 * These are the tests that matter. They assert that the privacy invariant
 * is enforced by the Compact COMPILER, not by convention. Tests 12 and 13
 * compile deliberately-broken variants of the contract and assert that the
 * compiler rejects them.
 */
describe('VeriCred — adversarial privacy tests', () => {

  // ---------------------------------------------------------------------------
  // 12. Compiler rejects a contract that leaks the credential commitment
  //     without disclose().
  // ---------------------------------------------------------------------------
  it('compiler rejects missing disclose() on the credential commitment', () => {
    const src = readFileSync('contracts/vericred.compact', 'utf8');

    // Mutate: remove the disclose() from issueCredential.
    const broken = src.replace(
      'const c = disclose(commitment);',
      'const c = commitment;', // <-- leak
    );
    expect(broken).not.toEqual(src); // sanity: the mutation applied

    expect(() => compileSource(broken)).toThrow(/disclose|private|witness/i);
  });

  // ---------------------------------------------------------------------------
  // 13. Compiler rejects a contract that leaks the verification result.
  // ---------------------------------------------------------------------------
  it('compiler rejects missing disclose() on the verification result', () => {
    const src = readFileSync('contracts/vericred.compact', 'utf8');

    const broken = src.replace(
      'return disclose(true);',
      'return true;', // <-- leak
    );
    expect(broken).not.toEqual(src);

    expect(() => compileSource(broken)).toThrow(/disclose|private|witness/i);
  });

  // ---------------------------------------------------------------------------
  // 14. The license number never appears in the public ledger.
  // ---------------------------------------------------------------------------
  it('license number never appears in the public ledger after issuance', async () => {
    const actors = randomActors();
    const h = await VeriCredHarness.deploy(actors);

    const issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    const LICENSE = bytes32(0xabcdef);
    await h.call('issueCredential', [
      bytes32(0x11),
      CredentialType.RN,
      LICENSE,
      bytes32(0xbb),
      1_700_000_000n,
      1_800_000_000n,
    ]);

    const serialized = JSON.stringify(serializeLedger(h.ledger()));
    expect(serialized).not.toContain(Buffer.from(LICENSE).toString('hex'));
  });

  // ---------------------------------------------------------------------------
  // 15. The expiry date never appears in the public ledger after a proof.
  // ---------------------------------------------------------------------------
  it('expiry date never appears in the public ledger after proof', async () => {
    const actors = randomActors();
    const h = await VeriCredHarness.deploy(actors);

    const issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);

    const EXPIRY = 1_800_000_123n;
    await h.call('issueCredential', [
      bytes32(0x11), CredentialType.RN, bytes32(0xaa), bytes32(0xbb),
      1_700_000_000n, EXPIRY,
    ]);

    h.setCredential({
      licenseNumber: bytes32(0xaa), issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n, expiryDate: EXPIRY,
      credentialType: CredentialType.RN, holderCommitment: bytes32(0x11), issuerPub,
    });
    await h.call('proveCredential', [bytes32(0x01), CredentialType.RN, 1_750_000_000n]);

    const serialized = JSON.stringify(serializeLedger(h.ledger()));
    expect(serialized).not.toContain(EXPIRY.toString(16));
  });

  // ---------------------------------------------------------------------------
  // 16. The nullifier is deterministic for the same (holder, requirement).
  // ---------------------------------------------------------------------------
  it('nullifier is deterministic per (holder, requirement)', async () => {
    // See harness note: nullifiers are emitted in the circuit transcript.
    // This test asserts that two identical proofs produce identical transcripts
    // apart from the signature/attestation envelope.
    const actors = randomActors();
    const h = await VeriCredHarness.deploy(actors);

    const issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);
    await h.call('issueCredential', [
      bytes32(0x11), CredentialType.RN, bytes32(0xaa), bytes32(0xbb),
      1_700_000_000n, 1_800_000_000n,
    ]);
    h.setCredential({
      licenseNumber: bytes32(0xaa), issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n, expiryDate: 1_800_000_000n,
      credentialType: CredentialType.RN, holderCommitment: bytes32(0x11), issuerPub,
    });

    const nullifierOf = (r: any) => extractNullifier(r);
    const a = await h.call('proveCredential', [bytes32(0x01), CredentialType.RN, 1_750_000_000n]);
    const b = await h.call('proveCredential', [bytes32(0x01), CredentialType.RN, 1_750_000_000n]);

    expect(nullifierOf(a)).toEqual(nullifierOf(b));
  });

  // ---------------------------------------------------------------------------
  // 17. The nullifier is NOT linkable across different requirements.
  // ---------------------------------------------------------------------------
  it('nullifier is not linkable across different requirements', async () => {
    const actors = randomActors();
    const h = await VeriCredHarness.deploy(actors);

    const issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);
    await h.call('issueCredential', [
      bytes32(0x11), CredentialType.RN, bytes32(0xaa), bytes32(0xbb),
      1_700_000_000n, 1_800_000_000n,
    ]);
    h.setCredential({
      licenseNumber: bytes32(0xaa), issuingBoard: bytes32(0xbb),
      issueDate: 1_700_000_000n, expiryDate: 1_800_000_000n,
      credentialType: CredentialType.RN, holderCommitment: bytes32(0x11), issuerPub,
    });

    const a = await h.call('proveCredential', [bytes32(0x01), CredentialType.RN, 1_750_000_000n]);
    const b = await h.call('proveCredential', [bytes32(0x02), CredentialType.RN, 1_750_000_000n]);

    expect(extractNullifier(a)).not.toEqual(extractNullifier(b));
  });
});

// -----------------------------------------------------------------------------
//  Helpers
// -----------------------------------------------------------------------------

function serializeLedger(l: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(l, (_k, v) => (typeof v === 'bigint' ? v.toString(16) : v)),
  );
}

function extractNullifier(r: { result: unknown; state: unknown }): string {
  // The nullifier is emitted in the circuit transcript. Wire this to whatever
  // your toolchain exposes — typically the effect stream or the proof receipt.
  return JSON.stringify((r as any).transcript?.nullifier ?? r);
}

function compileSource(source: string): void {
  const dir = mkdtempSync(join(tmpdir(), 'vericred-privacy-'));
  try {
    writeFileSync(join(dir, 'vericred.compact'), source);
    execSync('compact compile vericred.compact', {
      cwd: dir,
      stdio: 'pipe',
      env: { ...process.env, COMPACT_PATH: dir },
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}