# VeriCred — Privacy-Preserving Credential Verification Network

**Prove your credentials. Not your identity.**

VeriCred is a decentralized credential verification protocol built on Midnight that enables healthcare professionals to prove their licenses and certifications without revealing their identity or personal data. It uses Midnight's selective disclosure and dual-ledger model to make privacy the default while still providing cryptographic verification to employers, hospitals, and regulators.

## Table of Contents

- [Architecture](#architecture)
- [Midnight Integration](#midnight-integration)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Running the Demo](#running-the-demo)
- [Testing](#testing)
- [Project Structure](#project-structure)
- [Contract Design](#contract-design)

## Architecture
```plaintext
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Issuer │ │ Professional │ │ Verifier │
│ (Medical Board) │ │ (Credential │ │ (Hospital HR) │
│ │ │ Holder) │ │ │
└────────┬─────────┘ └────────┬────────┘ └────────┬────────┘
│ │ │
│ issueCredential() │ proveCredential() │ verify
│ (Compact circuit) │ (ZK proof) │
▼ ▼ ▼
┌─────────────────────────────────────────────────────────────────┐
│ Midnight Network │
│ ┌─────────────────────┐ ┌─────────────────────────────┐ │
│ │ Public Ledger │ │ Private State (off-chain) │ │
│ │ • Issuer registry │ │ • Credential contents │ │
│ │ • Revocation root │ │ • User secret key │ │
│ │ • Verification │ │ • Expiry, license number │ │
│ │ commitments │ │ (never on-chain) │ │
│ └─────────────────────┘ └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

The public ledger stores only **commitments, registry entries, and verification outcomes**. All credential data lives in the holder's **private state** and is only used locally for proof generation.

## Midnight Integration

VeriCred leverages three core Midnight capabilities:

### 1. Selective Disclosure
The `disclose()` wrapper is used only for values that must be public: the issuer's commitment, the verification boolean, and the nullifier. The credential data — license number, expiry, issuing board — is **never disclosed**. The Compact compiler enforces this: any attempt to leak witness data into public state without `disclose()` is a compile-time error[reference:8].

### 2. Dual-Ledger Model
Public ledger fields:
- `issuers: Set<Bytes<32>>` — registered issuer public keys
- `revocationRoot: Bytes<32>` — Merkle root of revoked credential commitments
- `verifications: Counter` — count of verifications (optional, for analytics)

Private state (witness-only):
- `credentialData: Credential` — the actual license/certification data
- `userSecretKey: Bytes<32>` — the holder's secret key for nullifier derivation

### 3. Zero-Knowledge Proofs
The `proveCredential` circuit generates a zk-SNARK that proves:
- The credential exists in the holder's private state
- It was issued by a registered issuer
- It is not expired
- It is not revoked (Merkle non-membership)
- It satisfies the verifier's requirement

The proof is ~128 bytes and is verified on-chain in milliseconds.

## Prerequisites

- **Node.js** 18+
- **Yarn** 1.22+
- **Docker** (for the proof server)
- **Compact toolchain** (install via the one-line installer)
- **Lace wallet** (browser extension, for the frontend demo)

## Setup

### 1. Install the Compact toolchain

```bash
curl --proto '=https' --tlsv1.2 -LsSf \
  https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
compact --version
```

### 2. Start the proof server
```bash
docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v
```
Proofs are generated locally on your machine. Private data never leaves your device.

### 3. Clone and install dependencies
```bash
git clone https://github.com/GauravKarakoti/vericred.git
cd vericred
yarn install
```

### 4. Compile the Compact contract
```bash
yarn compact:compile
```
This compiles `contracts/vericred.compact` into ZK circuits and generates TypeScript bindings.

### 5. Set up environment variables
```bash
cp .env.example .env
```
Edit .env with your Midnight network endpoint (default: local devnet).

## Running the Demo
### Local devnet
```bash
yarn devnet:start
```
This spins up a local Midnight network with a funded wallet for testing.

### Issuer service (simulated medical board)
```bash
yarn issuer:start
```
Runs on http://localhost:3001. It exposes a simple REST API for issuing credentials.

### Frontend
```bash
yarn frontend:start
```
Open http://localhost:3000. Connect your Lace wallet. You'll see three tabs: Issuer, Wallet, and Verifier.

## Demo flow
1. Issuer tab: Enter a holder's public commitment (or use the pre-filled demo commitment). Click "Issue RN License." The contract writes a commitment to the public ledger.
2. Wallet tab: The credential appears in the holder's local vault. Click "Generate Proof for Verifier." Enter the requirement: active RN license in good standing. The proof is generated locally.
3. Verifier tab: Paste the proof QR or attestation string. Click "Verify." The contract returns true with an on-chain verification commitment. The verifier learns only that the credential is valid — not who holds it or what the license number is.

## Testing
```bash
yarn test
```
Runs the following test suites:
  - `contracts/__tests__/vericred.test.ts` — Simulation tests for issue, prove, and revoke circuits
  - `contracts/__tests__/privacy.test.ts` — Tests that witness data does not leak into public state
  - `frontend/__tests__/proof.test.ts` — Tests for proof generation and verification flow

Expected output:
```text
✓ issueCredential — issues a valid credential
✓ proveCredential — verifies a valid credential
✓ proveCredential — rejects an expired credential
✓ proveCredential — rejects a revoked credential
✓ proveCredential — rejects a credential from an unregistered issuer
✓ revokeCredential — updates the revocation root
✓ privacy — witness data is not disclosed without disclose()
```

## Project Structure
```text
vericred/
├── contracts/
│   ├── vericred.compact          # Main Compact contract
│   ├── __tests__/
│   │   ├── vericred.test.ts      # Simulation tests
│   │   └── privacy.test.ts       # Privacy leak tests
│   └── managed/                  # Compiled circuit artifacts
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── IssuerDashboard.tsx
│   │   │   ├── WalletView.tsx
│   │   │   └── VerifierPortal.tsx
│   │   ├── lib/
│   │   │   ├── midnight.ts       # Midnight.js client setup
│   │   │   ├── witness.ts        # Witness provider (private data)
│   │   │   └── proof.ts          # Proof generation helpers
│   │   └── App.tsx
│   └── package.json
├── issuer-service/
│   ├── src/
│   │   └── server.ts             # Simulated medical board API
│   └── package.json
├── scripts/
│   ├── deploy.ts                 # Deploy contract to devnet
│   └── seed-issuers.ts           # Register demo issuers
├── .env.example
├── LICENSE                       # Apache License 2.0
├── README.md
└── package.json
```

## Contract Design
### Public Ledger
```compact
export ledger issuers: Set<Bytes<32>>;
export ledger revocationRoot: Bytes<32>;
export ledger verificationCount: Counter;
```

### Witnesses (Private State)
```compact
witness getCredential(): Credential;
witness getUserSecretKey(): Bytes<32>;
witness getIssuerSecretKey(): Bytes<32>;
```

### Circuits
| Circuit | Caller | Discloses | Private |
|---------|--------|-----------|---------|
| issueCredential | Issuer | Issuer commitment | Holder commitment, credential data |
| proveCredential | Holder | Verification boolean, nullifier | Credential data, expiry, license number |
| revokeCredential | Issuer | Revocation commitment | Holder identity, credential link |

### Key privacy invariant
No witness-derived value reaches the public ledger without an explicit disclose() call. The privacy.test.ts suite statically verifies this by attempting to compile a variant of the contract with a missing disclose() and asserting that the compiler rejects it.

---

Built for the Midnight Buildathon on AKINDO. Tagged with midnightntwrk.
