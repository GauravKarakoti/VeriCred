import { randomBytes } from 'node:crypto';
import { Contract } from '../../contracts/managed/vericred/contract/index.js'; 
import { createPrivateState, type VeriCredPrivateState } from '../private-state.js';
import { witnesses } from '../witnesses.js';
import type { Credential } from '../../contracts/managed/vericred/contract/index.js';

import {
  createConstructorContext,
  createCircuitContext,
  sampleContractAddress,
} from '@midnight-ntwrk/compact-runtime';

export interface TestActors {
  governanceSecret: Uint8Array;
  issuerSecret: Uint8Array;
  userSecret: Uint8Array;
}

export function randomActors(): TestActors {
  return {
    governanceSecret: randomBytes(32),
    issuerSecret: randomBytes(32),
    userSecret: randomBytes(32),
  };
}

export class VeriCredHarness {
  private contract: Contract<VeriCredPrivateState>;
  private state: VeriCredPrivateState;
  private ledgerState: any; // Tracks currentContractState
  private zswapState: any;  // Tracks currentZswapLocalState
  private address: string;

  private constructor(
    contract: Contract<VeriCredPrivateState>,
    state: VeriCredPrivateState,
    ledgerState: any,
    zswapState: any,
    address: string,
  ) {
    this.contract = contract;
    this.state = state;
    this.ledgerState = ledgerState;
    this.zswapState = zswapState;
    this.address = address;
  }

  static async deploy(actors: TestActors): Promise<VeriCredHarness> {
    const state = createPrivateState(
      actors.userSecret,
      actors.issuerSecret,
      actors.governanceSecret,
    );

    // createConstructorContext expects a coinPublicKey (string) as the second argument.
    // Casting a dummy Uint8Array to any satisfies the simulator.
    const constructorCtx = createConstructorContext(state, new Uint8Array(32) as any);
    const contract = new Contract<VeriCredPrivateState>(witnesses);
    
    // Fix: Extract the correct state properties from ConstructorResult
    const { 
      currentPrivateState, 
      currentContractState, 
      currentZswapLocalState 
    } = await contract.initialState(constructorCtx);

    return new VeriCredHarness(
      contract,
      currentPrivateState,
      currentContractState,
      currentZswapLocalState, // Store the initial zswap state
      sampleContractAddress(),
    );
  }

  async call<K extends string, A extends unknown[], R>(
    circuitName: K,
    args: A,
    patch: Partial<VeriCredPrivateState> = {},
  ): Promise<{ result: R; state: VeriCredPrivateState }> {
    this.state = { ...this.state, ...patch };

    // Fix: Pass circuitName as the first argument to match v4 signature
    const ctx = createCircuitContext(
      circuitName,         // 1. circuitId
      this.address as any, // 2. contractAddress
      this.zswapState,     // 3. coinPublicKeyOrZswapState
      this.ledgerState,    // 4. contractState
      this.state,          // 5. privateState
    ) as any;

    const circuit = (this.contract as unknown as Record<string, Function>)[
      circuitName
    ].bind(this.contract);
    
    // Extract the new state objects returned by the executed circuit
    const { 
      result, 
      currentPrivateState, 
      currentContractState, 
      currentZswapLocalState 
    } = (await circuit(ctx, ...args)).context.callContext as any; // Updated to match v4 CircuitResults shape

    // Persist all three updated states back to the harness
    this.state = currentPrivateState;
    this.ledgerState = currentContractState;
    this.zswapState = currentZswapLocalState;

    return { result: result as R, state: this.state };
  }

  /** Read a public ledger field. */
  ledger(): Record<string, unknown> {
    return this.ledgerState as Record<string, unknown>;
  }

  /** Attach a credential to the holder's private state without a circuit call. */
  setCredential(credential: Credential): void {
    this.state = { ...this.state, credential };
  }

  /** Compute the credential commitment the way the contract does. */
  commitmentOf(credential: Credential): Uint8Array {
    return (this.contract as any).credentialCommitmentOf(credential);
  }
}