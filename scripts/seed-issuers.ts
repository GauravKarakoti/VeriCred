#!/usr/bin/env tsx
// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Gaurav Karakoti
/**
 * Register demo issuers (State Medical Board, Regional Nursing Association).
 * Used by the frontend demo in Wave 2 and by CI smoke tests.
 */
import { randomBytes } from 'node:crypto';
import { VeriCredHarness, randomActors } from '../src/__tests__/harness.js';

const DEMO_ISSUERS = [
  'State Medical Board',
  'Regional Nursing Association',
];

async function main() {
  const actors = randomActors();
  const h = await VeriCredHarness.deploy(actors);

  for (const name of DEMO_ISSUERS) {
    const issuerSecret = randomBytes(32);
    const issuerPub = (await h.call('issuerPubOf', [issuerSecret])).result as Uint8Array;
    await h.call('registerIssuer', [issuerPub]);
    console.log(`Registered ${name}: ${Buffer.from(issuerPub).toString('hex').slice(0, 16)}…`);
  }

  console.log(`\n${DEMO_ISSUERS.length} issuers registered.`);
}

main().catch((e) => { console.error(e); process.exit(1); });