// SPDX-License-Identifier: Apache-2.0
// Copyright 2026 Gaurav Karakoti
import type { WitnessContext } from '@midnight-ntwrk/compact-runtime'; // [API]
import type { Ledger, Credential } from '../contracts/managed/vericred/contract/index.js';
import type { VeriCredPrivateState } from './private-state.js';

/**
 * The witness provider bridges the Compact circuit's witness declarations
 * to the participant's private state.
 *
 * Contract declares:              Provider supplies:
 *   getCredential()          ->     privateState.credential
 *   getUserSecretKey()       ->     privateState.userSecret
 *   getIssuerSecretKey()     ->     privateState.issuerSecret
 *   getGovernanceSecret()    ->     privateState.governanceSecret
 */
export const witnesses = {
  getCredential: ({
    privateState,
  }: WitnessContext<Ledger, VeriCredPrivateState>): [
    VeriCredPrivateState,
    Credential,
  ] => {
    if (!privateState.credential) {
      throw new Error(
        'getCredential: no credential in private state. ' +
          'The holder has not received a credential yet.',
      );
    }
    return [privateState, privateState.credential];
  },

  getUserSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, VeriCredPrivateState>): [
    VeriCredPrivateState,
    Uint8Array,
  ] => [privateState, privateState.userSecret],

  getIssuerSecretKey: ({
    privateState,
  }: WitnessContext<Ledger, VeriCredPrivateState>): [
    VeriCredPrivateState,
    Uint8Array,
  ] => [privateState, privateState.issuerSecret],

  getGovernanceSecret: ({
    privateState,
  }: WitnessContext<Ledger, VeriCredPrivateState>): [
    VeriCredPrivateState,
    Uint8Array,
  ] => [privateState, privateState.governanceSecret],
};