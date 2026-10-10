#!/usr/bin/env tsx
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Gaurav Karakoti
/**
 * VeriCred — Wave 1 CLI demo
 *
 * Walks a judge through the complete credential lifecycle in under 5 minutes.
 * Runs entirely in-memory against the Compact simulator: no Docker, no
 * devnet, no wallet installation required.
 *
 *   yarn demo
 *
 * The point of this demo is to show the privacy boundary at every step:
 * what is disclosed, what stays private, and where the compiler enforces it.
 */
import { randomBytes } from 'node:crypto';
import { VeriCredHarness, randomActors } from '../src/__tests__/harness';
import { CredentialType } from '../contracts/managed/vericred/contract/index.js';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

const step = (n: number, total: number, title: string) =>
  console.log(`\n${BOLD}[${n}/${total}]${RESET} ${title}`);
const ok = (msg: string) => console.log(`      ${GREEN}✓${RESET} ${msg}`);
const info = (msg: string) => console.log(`      ${DIM}${msg}${RESET}`);
const privateLine = (msg: string) =>
  console.log(`      ${YELLOW}🔒 ${msg}${RESET} (NOT disclosed)`);
const publicLine = (msg: string) =>
  console.log(`      ${CYAN}📢 ${msg}${RESET} (disclosed)`);

async function main() {
  console.log(`\n${BOLD}🌙 VeriCred — Wave 1 Demo${RESET}`);
  console.log('─'.repeat(60));
  console.log(
    'A credential is verified without revealing the credential or the holder.',
  );

  // ---------------------------------------------------------------------------
  const actors = randomActors();
  const holderCommitment = randomBytes(32);
  const LICENSE = randomBytes(32);
  const ISSUING_BOARD = randomBytes(32);
  const ISSUE_DATE = 1_700_000_000n;
  const EXPIRY = 1_800_000_000n;
  const NOW = 1_750_000_000n;

  // ---------------------------------------------------------------------------
  step(1, 6, 'Deploying vericred.compact to the simulator');
  const h = await VeriCredHarness.deploy(actors);
  const ledger0 = h.ledger();
  ok(`Contract deployed`);
  info(`Domain separator: ${hex(ledger0.domainSeparator as Uint8Array)}`);
  info(`Issuer registry: empty`);
  info(`Revocation set: empty`);

  // ---------------------------------------------------------------------------
  step(2, 6, 'Registering issuer: "State Medical Board"');
  const issuerPub = (await h.call('issuerPubOf', [actors.issuerSecret]))
    .result as Uint8Array;
  await h.call('registerIssuer', [issuerPub]);
  publicLine(`Issuer public key: ${hex(issuerPub)}`);

  // ---------------------------------------------------------------------------
  step(3, 6, 'Issuing an RN license to the holder');
  const { result: commitment } = await h.call('issueCredential', [
    holderCommitment,
    CredentialType.RN,
    LICENSE,
    ISSUING_BOARD,
    ISSUE_DATE,
    EXPIRY,
  ]);
  publicLine(`Credential commitment: ${hex(commitment as Uint8Array)}`);
  privateLine(`License number: ${hex(LICENSE)}`);
  privateLine(`Issuing board:  ${hex(ISSUING_BOARD)}`);
  privateLine(`Expiry date:    ${EXPIRY}`);

  // ---------------------------------------------------------------------------
  step(4, 6, 'Holder generates a ZK proof: "active RN license"');
  h.setCredential({
    licenseNumber: LICENSE,
    issuingBoard: ISSUING_BOARD,
    issueDate: ISSUE_DATE,
    expiryDate: EXPIRY,
    credentialType: CredentialType.RN,
    holderCommitment,
    issuerPub,
  });

  const t0 = performance.now();
  const { result } = await h.call('proveCredential', [
    randomBytes(32), // requirementId
    CredentialType.RN,
    NOW,
  ]);
  const t1 = performance.now();

  ok(`Proof generated in ${((t1 - t0) / 1000).toFixed(2)}s`);
  publicLine(`Verification result: ${result}`);
  privateLine(`License number`);
  privateLine(`Expiry date`);

  // ---------------------------------------------------------------------------
  step(5, 6, 'Adversarial: expired credential');
  const expiredHolder = randomBytes(32);
  await h.call('issueCredential', [
    expiredHolder, CredentialType.RN, LICENSE, ISSUING_BOARD,
    1_600_000_000n, 1_650_000_000n, // already expired
  ]);
  h.setCredential({
    licenseNumber: LICENSE,
    issuingBoard: ISSUING_BOARD,
    issueDate: 1_600_000_000n,
    expiryDate: 1_650_000_000n,
    credentialType: CredentialType.RN,
    holderCommitment: expiredHolder,
    issuerPub,
  });

  try {
    await h.call('proveCredential', [randomBytes(32), CredentialType.RN, NOW]);
    console.log(`      ${GREEN}✗${RESET} UNEXPECTED: expired credential was accepted`);
  } catch (e) {
    ok(`Circuit rejected with: "${(e as Error).message}"`);
  }

  // ---------------------------------------------------------------------------
  step(6, 6, 'Issuer revokes the credential');
  await h.call('revokeCredential', [commitment]);
  publicLine(`Revocation commitment: ${hex(commitment as Uint8Array)}`);
  privateLine(`Link between commitment and holder`);

  // ---------------------------------------------------------------------------
  console.log(`\n${BOLD}✅ Demo complete.${RESET}`);
  console.log(
    `\nPublic ledger contains ${Object.keys(h.ledger()).length} fields — ${BOLD}zero PII${RESET}.`,
  );
  console.log(
    `Verifications recorded: ${h.ledger().verificationCount}\n`,
  );
}

function hex(b: Uint8Array): string {
  return '0x' + Buffer.from(b).toString('hex').slice(0, 8) + '…';
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});