# VeriCred — Architecture (Wave 2)

## Dual-ledger model

VeriCred is built on Midnight's dual-ledger model: every circuit has access
to a **public ledger** and a **private state**. The Compact compiler enforces
the boundary — no witness-derived value reaches the public ledger without an
explicit `disclose()` call.
```plaintext
┌───────────────────────────────────────────────────────────────────────┐
│ Midnight Network │
│ │
│ PUBLIC LEDGER PRIVATE STATE (per participant) │
│ ───────────── ─────────────────────────────── │
│ governancePub: Bytes<32> credential: Credential | null │
│ domainSeparator: Bytes<32> userSecret: Bytes<32> │
│ issuers: Set<Bytes<32>> issuerSecret: Bytes<32> │
│ issuedBy: Map<32, 32> governanceSecret: Bytes<32> │
│ revoked: Set<Bytes<32>> │
│ verificationCount: Counter │
│ │
└───────────────────────────────────────────────────────────────────────┘
▲ ▲
│ │
│ disclosed values only │ witness reads only
│ │
┌────┴──────────────┐ ┌─────────┴──────────────┐
│ COMPACT CIRCUIT │◄────────────►│ WITNESS PROVIDER │
│ │ │ │
│ issueCredential │ │ getCredential() │
│ proveCredential │ │ getUserSecretKey() │
│ revokeCredential │ │ getIssuerSecretKey() │
└───────────────────┘ │ getGovernanceSecret() │
└────────────────────────┘
```

## Role model

| Role        | Can do                                              | Cannot do                          |
|-------------|-----------------------------------------------------|------------------------------------|
| Governance  | register / deregister issuers                       | issue or revoke credentials        |
| Issuer      | issue credentials, revoke own credentials           | read holder private state          |
| Holder      | hold credentials, generate proofs                   | issue or revoke                    |
| Verifier    | request a proof, read the boolean result            | learn license number or identity   |

## Circuit flow
```plaintext
ISSUER CONTRACT HOLDER
│ │ │
│ issueCredential( │ │
│ holderCommitment, │ │
│ credentialType, │ │
│ licenseNumber, ───────────►│ │
│ issuingBoard, │ assert issuer registered │
│ issueDate, │ assert expiry > issue │
│ expiryDate) │ commitment = H(credential) │
│ │ disclose(commitment) │
│ │ issuedBy[commitment] = issuer │
│ │ │
│ ─── credential sent off-chain (encrypted) ──────────────────────►
│ │ │
│ │ │ store in
│ │ │ private state
│ │ │
│ │◄──── proveCredential( │
│ │ requirementId, │
│ │ requiredType, │
│ │ currentEpoch) │
│ │ │
│ │ assert holder matches │
│ │ assert issuer registered │
│ │ assert not expired │
│ │ assert correct type │
│ │ assert issuedBy[c] == issuer │
│ │ assert !revoked.member(c) │
│ │ disclose(nullifier) │
│ │ disclose(true) │
│ │ verificationCount++ │
│ │ │
│ │ ──── proof receipt ──────────►│
│ │ │
│ │ │ share with
│ │ │ verifier
```

## Deployment

Wave 1 runs entirely against the Compact simulator: `yarn demo` requires no
Docker, no node, no wallet. For a real deployment:

1. Start the Midnight devnet (`midnight-local-dev` or the Docker compose in
   the `midnight-local-dev` repo).
2. Start the proof server:
   `docker run -p 6300:6300 midnightntwrk/proof-server:8.1.0 midnight-proof-server -v`
3. Populate `.env` with the node + indexer URLs.
4. `yarn deploy:devnet` — replace the simulator harness with a
   `MidnightWalletProvider` and the contract address will be printed.

The frontend (Wave 2) wires the same contract to Lace and a browser proof
server.

## Testnet contract (Wave 2)

Will be published at the start of Wave 2 under the `midnightntwrk` topic.