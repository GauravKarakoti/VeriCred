// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Gaurav Karakoti
import type { Credential } from '../contracts/managed/vericred/contract/index.js';

/**
 * The complete private state held by a VeriCred participant.
 *
 * This object NEVER leaves the device. It is passed to the witness
 * provider when a circuit needs to read private data.
 */
export interface VeriCredPrivateState {
  /** The holder's credential, if they hold one. */
  credential: Credential | null;

  /** 32-byte secret used to derive the holder commitment. */
  userSecret: Uint8Array;

  /** 32-byte secret used to sign issuances / revocations. */
  issuerSecret: Uint8Array;

  /** 32-byte secret held by governance. */
  governanceSecret: Uint8Array;
}

export function createPrivateState(
  userSecret: Uint8Array,
  issuerSecret: Uint8Array,
  governanceSecret: Uint8Array,
  credential: Credential | null = null,
): VeriCredPrivateState {
  return { credential, userSecret, issuerSecret, governanceSecret };
}