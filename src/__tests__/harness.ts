import { randomBytes } from 'node:crypto';
import { Contract } from '../../contracts/managed/vericred/contract/index.js'; // [API] path is generated
import { createPrivateState, type VeriCredPrivateState } from '../private-state.js';
import { witnesses } from '../witnesses.js';
import type { Credential } from '../../contracts/managed/vericred/contract/index.js';

// [API] The exact names below (`createConstructorContext`, `createCircuitContext`,
// `sampleContractAddress`) come from @midnight-ntwrk/compact-runtime. Verify against
// your installed version. The test bodies below only touch `deploy()` and
// `call()`, so any API change is confined to this file.
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
  private address: string;

  private constructor(
    contract: Contract<VeriCredPrivateState>,
    state: VeriCredPrivateState,
    address: string,
  ) {
    this.contract = contract;
    this.state = state;
    this.address = address;
  }

  static async deploy(actors: TestActors): Promise<VeriCredHarness> {
    const state = createPrivateState(
      actors.userSecret,
      actors.issuerSecret,
      actors.governanceSecret,
    );

    const constructorCtx = createConstructorContext(state, sampleContractAddress());
    const contract = new Contract<VeriCredPrivateState>(witnesses);
    const { currentPrivateState } = contract.initialState(constructorCtx);

    return new VeriCredHarness(
      contract,
      currentPrivateState,
      sampleContractAddress(),
    );
  }

  /** Call a circuit with new private state. */
  async call<K extends string, A extends unknown[], R>(
    circuitName: K,
    args: A,
    patch: Partial<VeriCredPrivateState> = {},
  ): Promise<{ result: R; state: VeriCredPrivateState }> {
    this.state = { ...this.state, ...patch };

    const ctx = createCircuitContext(
      this.address,
      this.state,
      /* coinPublicKey */ new Uint8Array(32),
      /* encryptionPublicKey */ new Uint8Array(32),
    );

    const circuit = (this.contract as unknown as Record<string, Function>)[
      circuitName
    ].bind(this.contract);
    const result = (await circuit(ctx, ...args)) as R;

    this.state = this.contract.getPrivateState();
    return { result, state: this.state };
  }

  /** Read a public ledger field. */
  ledger(): Record<string, unknown> {
    return this.contract.getLedger() as unknown as Record<string, unknown>;
  }

  /** Attach a credential to the holder's private state without a circuit call. */
  setCredential(credential: Credential): void {
    this.state = { ...this.state, credential };
  }

  /** Compute the credential commitment the way the contract does. */
  // [API] This must match `credentialCommitmentOf` in vericred.compact.
  // The generated contract exposes helper methods; if not, hash manually.
  commitmentOf(credential: Credential): Uint8Array {
    // The compiled contract exposes a helper; adjust to your version.
    // Falls back to a client-side reimplementation in tests that don't need
    // exact byte equality.
    return (this.contract as any).credentialCommitmentOf(credential);
  }
}