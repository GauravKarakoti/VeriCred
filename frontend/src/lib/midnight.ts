import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { Contract, ledger as decodeLedger } from '../../../contracts/managed/vericred/contract/index.js'; 
import type { Ledger } from '../types';
import { Buffer } from 'buffer';
import "dotenv/config";

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const INDEXER_URL = 'https://indexer.preview.midnight.network/api/v4/graphql';
const INDEXER_WS = 'wss://indexer.preview.midnight.network/api/v4/graphql/ws';
const PROOF_SERVER_URL = import.meta.env.VITE_PROOF_SERVER_URL || 'http://127.0.0.1:6300';
const GOVERNANCE_SECRET = import.meta.env.VITE_GOVERNANCE_SECRET;

let activeIssuerSecret = new Uint8Array(32);
let cachedContract: any = null;

export async function getMidnightContract(walletApi: any) {
  if (cachedContract) return cachedContract;
  if (!CONTRACT_ADDRESS) throw new Error('VITE_CONTRACT_ADDRESS is not set in your .env file.');

  // Safely extract coinPublicKey and unshieldedAddress with fallbacks
  let coinPublicKey = '0'.repeat(64);
  let unshieldedAddress = 'mock_unshielded_address';

  if (walletApi) {
    if (typeof walletApi.state === 'function') {
      try {
        const walletState = await walletApi.state();
        coinPublicKey = walletState.coinPublicKey || coinPublicKey;
      } catch (err) {
        console.warn('Failed to call walletApi.state():', err);
      }
    } else if (walletApi.coinPublicKey) {
      coinPublicKey = walletApi.coinPublicKey;
    }

    if (typeof walletApi.getUnshieldedAddress === 'function') {
      try {
        const addrRes = await walletApi.getUnshieldedAddress();
        unshieldedAddress = addrRes.unshieldedAddress || addrRes;
      } catch (err) {
        console.warn('Failed to call walletApi.getUnshieldedAddress():', err);
      }
    }
  }

  const walletProvider = {
    coinPublicKey,
    balanceTx: (tx: any, newCoins: any) => {
      if (walletApi && typeof walletApi.balanceTransaction === 'function') {
        return walletApi.balanceTransaction(tx, newCoins);
      }
      if (walletApi && typeof walletApi.balanceAndProveTransaction === 'function') {
        return walletApi.balanceAndProveTransaction(tx, newCoins);
      }
      return Promise.resolve(tx);
    },
  };

  const midnightProvider = {
    submitTx: (tx: any) => {
      if (walletApi && typeof walletApi.submitTransaction === 'function') {
        return walletApi.submitTransaction(tx);
      }
      throw new Error('Wallet API does not support submitTransaction.');
    },
  };

  const publicDataProvider = indexerPublicDataProvider(INDEXER_URL, INDEXER_WS);
  
  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
  const proofProvider = httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider);
  
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: 'vericred-private-state',
    accountId: String(unshieldedAddress),
    privateStoragePasswordProvider: async () => 'vericred-demo-password',
  });

  const providers = {
    privateStateProvider,
    publicDataProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
    zkConfigProvider: zkConfigProvider as any,
  };

  const dummyWitnesses = {
    getCredential: (context: any) => [context.state, { licenseNumber: new Uint8Array(32), issuingBoard: new Uint8Array(32), issueDate: 0n, expiryDate: 0n, credentialType: 0, holderCommitment: new Uint8Array(32), issuerPub: new Uint8Array(32) }],
    getUserSecretKey: (context: any) => [context.state, new Uint8Array(32)],
    getIssuerSecretKey: (context: any) => [context.state, activeIssuerSecret], 
    getGovernanceSecret: (context: any) => [
      context.state, 
      GOVERNANCE_SECRET ? Buffer.from(GOVERNANCE_SECRET, 'hex') : new Uint8Array(32)
    ],
  };

  const compiledContract = CompiledContract.make('vericred', Contract).pipe(
    CompiledContract.withWitnesses(dummyWitnesses),
    CompiledContract.withCompiledFileAssets('/'),
  );

  cachedContract = await findDeployedContract(providers as any, {
    contractAddress: CONTRACT_ADDRESS,
    compiledContract,
    privateStateId: 'vericred-private-state'
  });
  
  return cachedContract;
}

export async function queryNetworkLedger(): Promise<Ledger> {
  const publicDataProvider = indexerPublicDataProvider(INDEXER_URL, INDEXER_WS);
  if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured.');
  
  const state = await publicDataProvider.queryContractState(CONTRACT_ADDRESS);
  if (state === null) {
    throw new Error('Contract state not found on the network. Is the contract address correct?');
  }
  
  const ledgerState = decodeLedger(state.data);
  
  const issuedBy: Record<string, string> = {};
  for (const [key, value] of ledgerState.issuedBy) {
     issuedBy[Buffer.from(key).toString('hex')] = Buffer.from(value).toString('hex');
  }
  
  return {
    governancePub: Buffer.from(ledgerState.governancePub).toString('hex'),
    domainSeparator: Buffer.from(ledgerState.domainSeparator).toString('hex'),
    issuers: Array.from(ledgerState.issuers).map((pub: Uint8Array) => ({
      publicKey: Buffer.from(pub).toString('hex'),
      name: 'Network Issuer', 
      registeredAt: new Date().toISOString().slice(0, 10),
    })),
    issuedBy, 
    revoked: Array.from(ledgerState.revoked).map((c: Uint8Array) => Buffer.from(c).toString('hex')),
    verificationCount: Number(ledgerState.verificationCount),
  };
}

export async function submitRegisterIssuer(walletApi: any, issuerPubHex: string): Promise<void> {
  const contract = await getMidnightContract(walletApi);
  await contract.callTx.registerIssuer(Buffer.from(issuerPubHex, 'hex'));
}

export async function submitIssueCredential(walletApi: any, input: any, secretHex: string): Promise<string> {
  activeIssuerSecret = Buffer.from(secretHex, 'hex');
  const contract = await getMidnightContract(walletApi);
  
  const typeMap: Record<string, number> = { RN: 0, MD: 1, LPN: 2, EMT: 3, CUSTOM: 4 };
  const credType = typeMap[input.credentialType] ?? 4;
  
  const txData = await contract.callTx.issueCredential(
    Buffer.from(input.holderCommitment.replace('0x', ''), 'hex'),
    credType, 
    Buffer.from(input.licenseNumber.padEnd(32, ' ')),
    Buffer.from(input.issuingBoard.padEnd(32, ' ')),
    BigInt(new Date(input.issueDate).getTime()),
    BigInt(new Date(input.expiryDate).getTime())
  );
  
  return Buffer.from(txData.private.result).toString('hex');
}

export async function submitRevokeCredential(walletApi: any, commitmentHex: string, secretHex: string): Promise<void> {
  activeIssuerSecret = Buffer.from(secretHex, 'hex');
  const contract = await getMidnightContract(walletApi);
  await contract.callTx.revokeCredential(Buffer.from(commitmentHex.replace('0x', ''), 'hex'));
}

export async function computeIssuerPub(walletApi: any, secretHex: string): Promise<string> {
  const contract = await getMidnightContract(walletApi);
  const result = await contract.pureCircuits.getIssuerPub(Buffer.from(secretHex, 'hex'));
  return Buffer.from(result).toString('hex');
}