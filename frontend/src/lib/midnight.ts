import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id'; 
import { Contract, ledger as decodeLedger, pureCircuits } from '../../../contracts/managed/vericred/contract/index.js';
import type { Ledger } from '../types';
import { Buffer } from 'buffer';
import { Transaction } from '@midnight-ntwrk/ledger-v7';

setNetworkId('preview'); 

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
const INDEXER_URL = 'https://indexer.preview.midnight.network/api/v4/graphql';
const INDEXER_WS = 'wss://indexer.preview.midnight.network/api/v4/graphql/ws';
const PROOF_SERVER_URL = import.meta.env.VITE_PROOF_SERVER_URL || 'http://127.0.0.1:6300';
const GOVERNANCE_SECRET = import.meta.env.VITE_GOVERNANCE_SECRET;

let cachedContract: any = null;
let cachedWalletAddress: string = ''; 

// Wrap all dynamic witnesses in a constant object reference.
const dynamicWitnesses = {
  credential: null as any,
  userSecret: new Uint8Array(32) as any,
  issuerSecret: new Uint8Array(32) as any,
  governanceSecret: new Uint8Array(32) as any
};

function getCleanGovSecret(): Uint8Array {
  let cleanHex = (GOVERNANCE_SECRET || '').replace(/['"\s]/g, '');
  if (cleanHex.toLowerCase().startsWith('0x')) {
    cleanHex = cleanHex.substring(2);
  }
  if (cleanHex.length !== 64) {
    return new Uint8Array(32);
  }
  const bytes = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

async function deriveWalletUserSecret(address: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(`vericred-wallet-secret-${address}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(hashBuffer);
}

export async function getMidnightContract(walletApi: any) {
  if (!CONTRACT_ADDRESS) throw new Error('VITE_CONTRACT_ADDRESS is not set in your .env file.');
  if (!walletApi) throw new Error('Wallet not connected.');

  const addrRes = await walletApi.getUnshieldedAddress();
  const unshieldedAddress = String(addrRes.unshieldedAddress ?? addrRes);
  
  if (cachedContract && cachedWalletAddress === unshieldedAddress) {
    return cachedContract;
  }

  // Bind live secrets so witnesses are ready immediately
  dynamicWitnesses.userSecret = await deriveWalletUserSecret(unshieldedAddress);
  dynamicWitnesses.governanceSecret = getCleanGovSecret();

  const shielded = await walletApi.getShieldedAddresses();
  const coinPublicKey = shielded.shieldedCoinPublicKey;
  const encryptionPublicKey = shielded.shieldedEncryptionPublicKey;
  const toHex = (b: Uint8Array) => Buffer.from(b).toString('hex');
  const fromHex = (h: string) => new Uint8Array(Buffer.from(h, 'hex'));

  const shortAddress = unshieldedAddress.slice(-12);
  // Bumped to v3 to guarantee a clean slate
  const STATE_ID = `vericred-state-${shortAddress}-${CONTRACT_ADDRESS?.slice(0, 8)}-v3`;

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => encryptionPublicKey,
    balanceTx: async (tx: any, _ttl?: any) => {
      const res = await walletApi.balanceUnsealedTransaction(toHex(tx.serialize()));
      return Transaction.deserialize('signature', 'proof', 'binding', fromHex(res.tx));
    },
  };

  const midnightProvider = {
    submitTx: async (tx: any) => {
      await walletApi.submitTransaction(toHex(tx.serialize()));
      return tx.identifiers()[0];
    },
  };

  const publicDataProvider = indexerPublicDataProvider(INDEXER_URL, INDEXER_WS);
  const zkConfigProvider = new FetchZkConfigProvider(window.location.origin, fetch.bind(window));
  const proofProvider = httpClientProofProvider(PROOF_SERVER_URL, zkConfigProvider);
  
  const privateStateProvider = levelPrivateStateProvider({
    privateStateStoreName: STATE_ID,
    accountId: unshieldedAddress,
    privateStoragePasswordProvider: async () => 'Vericred-Demo-Password-123!',
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
    getCredential: (context: any) => [context.state, dynamicWitnesses.credential ?? { licenseNumber: new Uint8Array(32), issuingBoard: new Uint8Array(32), issueDate: 0n, expiryDate: 0n, credentialType: 0, holderCommitment: new Uint8Array(32), issuerPub: new Uint8Array(32) }],
    getUserSecretKey: (context: any) => [context.state, dynamicWitnesses.userSecret],
    getIssuerSecretKey: (context: any) => [context.state, dynamicWitnesses.issuerSecret], 
    getGovernanceSecret: (context: any) => [context.state, dynamicWitnesses.governanceSecret],
  };

  const compiledContract = CompiledContract.make('vericred', Contract).pipe(
    CompiledContract.withWitnesses(dummyWitnesses),
    CompiledContract.withCompiledFileAssets('/keys/'), 
  );

  cachedContract = await findDeployedContract(providers as any, {
    contractAddress: CONTRACT_ADDRESS,
    compiledContract,
    privateStateId: STATE_ID,
    // 🚀 THE FIX: Because the contract has no `private` state variables, 
    // the schema is exactly `{}`. This satisfies the SDK instantly!
    initialPrivateState: {} as any
  });
  
  cachedWalletAddress = unshieldedAddress;
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
  
  let localRegistry: Record<string, string> = {};
  try {
    localRegistry = JSON.parse(localStorage.getItem('vericred_issuer_names') || '{}');
  } catch {}

  return {
    governancePub: Buffer.from(ledgerState.governancePub).toString('hex'),
    domainSeparator: Buffer.from(ledgerState.domainSeparator).toString('hex'),
    issuers: Array.from(ledgerState.issuers).map((pub: Uint8Array) => {
      const pubKeyHex = Buffer.from(pub).toString('hex');
      return {
        publicKey: pubKeyHex,
        name: localRegistry[pubKeyHex] || `Issuer (${pubKeyHex.slice(0, 8)}...)`,
        registeredAt: new Date().toISOString().slice(0, 10),
      };
    }),
    issuedBy, 
    revoked: Array.from(ledgerState.revoked).map((c: Uint8Array) => Buffer.from(c).toString('hex')),
    verificationCount: Number(ledgerState.verificationCount),
  };
}

export function getStoredIssuerName(publicKeyHex: string): string {
  try {
    const registry = JSON.parse(localStorage.getItem('vericred_issuer_names') || '{}');
    return registry[publicKeyHex] || 'Custom Issuer';
  } catch {
    return 'Custom Issuer';
  }
}

export function storeIssuerName(publicKeyHex: string, name: string): void {
  try {
    const registry = JSON.parse(localStorage.getItem('vericred_issuer_names') || '{}');
    registry[publicKeyHex] = name;
    localStorage.setItem('vericred_issuer_names', JSON.stringify(registry));
  } catch (err) {
    console.warn('Failed to save issuer name to localStorage:', err);
  }
}

export async function submitRegisterIssuer(walletApi: any, issuerPubHex: string): Promise<void> {
  const ledger = await queryNetworkLedger();
  const cleanHex = issuerPubHex.replace('0x', '').trim();
  const isAlreadyRegistered = ledger.issuers.some(i => i.publicKey === cleanHex);
  if (isAlreadyRegistered) {
    throw new Error("This Issuer is already registered on the network!");
  }

  const contract = await getMidnightContract(walletApi);
  const pubKeyBytes = new Uint8Array(Buffer.from(cleanHex, 'hex'));
  await contract.callTx.registerIssuer(pubKeyBytes);
}

export async function submitIssueCredential(walletApi: any, input: any, secretHex: string): Promise<string> {
  dynamicWitnesses.issuerSecret = Buffer.from(secretHex.replace('0x', '').trim(), 'hex');
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
  dynamicWitnesses.issuerSecret = Buffer.from(secretHex.replace('0x', '').trim(), 'hex');
  const contract = await getMidnightContract(walletApi);
  await contract.callTx.revokeCredential(Buffer.from(commitmentHex.replace('0x', '').trim(), 'hex'));
}

export async function computeIssuerPub(_walletApi: any, secretHex: string): Promise<string> {
  const cleanHex = secretHex.replace('0x', '').trim();
  const result = pureCircuits.getIssuerPub(Buffer.from(cleanHex, 'hex'));
  return Buffer.from(result).toString('hex');
}

export async function computeHolderCommitmentFromAddress(holderAddress: string): Promise<string> {
  const secret = await deriveWalletUserSecret(holderAddress);
  const commitment = pureCircuits.getHolderCommitment(secret); 
  return Buffer.from(commitment).toString('hex');
}

export async function submitProveCredential(
  walletApi: any,
  credential: any,
  requirementIdHex: string,
  requiredTypeStr: string,
  currentEpoch: bigint = BigInt(Date.now())
): Promise<any> {
  const contract = await getMidnightContract(walletApi);
  const typeMap: Record<string, number> = { RN: 0, MD: 1, LPN: 2, EMT: 3, CUSTOM: 4 };
  const reqType = typeMap[requiredTypeStr] ?? 4;

  const holderCommitmentBytes = pureCircuits.getHolderCommitment(dynamicWitnesses.userSecret);

  dynamicWitnesses.credential = {
    licenseNumber: Buffer.from(credential.licenseNumber.padEnd(32, ' ')),
    issuingBoard: Buffer.from(credential.issuingBoard.padEnd(32, ' ')),
    issueDate: BigInt(new Date(credential.issueDate).getTime()),
    expiryDate: BigInt(new Date(credential.expiryDate).getTime()),
    credentialType: typeMap[credential.credentialType] ?? 4, 
    holderCommitment: holderCommitmentBytes,
    issuerPub: Buffer.from(credential.issuerPub.replace('0x', ''), 'hex'),
  };

  try {
    const txData = await contract.callTx.proveCredential(
      Buffer.from(requirementIdHex.replace('0x', '').padStart(64, '0'), 'hex'),
      reqType,
      currentEpoch
    );
    return txData;
  } finally {
    dynamicWitnesses.credential = null;
  }
}