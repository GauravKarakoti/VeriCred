# VeriCred — Privacy Model (Wave 2)

## The invariant

> **No witness-derived value reaches the public ledger without an explicit
> `disclose()` call. The Compact compiler enforces this.**

This is not a policy. It is a compile-time property. The `privacy.test.ts`
suite verifies it adversarially by compiling a deliberately-broken contract
and asserting that the compiler rejects it.

## Disclosure map

For every circuit, this is the complete list of values that reach the chain.

| Circuit            | Disclosed                                    | Private                          |
|--------------------|----------------------------------------------|----------------------------------|
| `registerIssuer`   | `issuerPub`                                  | governance secret                |
| `deregisterIssuer` | `issuerPub`                                  | governance secret                |
| `issueCredential`  | `commitment`, `issuerPub`                    | license number, board, dates     |
| `proveCredential`  | `commitment`, `nullifier`, `true`            | credential contents, identity    |
| `revokeCredential` | `commitment`                                 | issuer secret, holder link       |

## Why each public value is safe

- **`issuerPub`** — issuers are public authorities. Their registration is
  intended to be public.
- **`commitment`** — a one-way hash of the credential. Given the commitment,
  an observer cannot recover the license number, expiry, or issuing board.
  It is pseudonymous, not anonymous.
- **`nullifier`** — `H(commitment, requirementId, domainSeparator)`. Scoped
  to a specific requirement. Two verifiers asking different questions see
  two unlinkable nullifiers.
- **`true`** — the boolean result. A `false` result reverts the circuit, so
  only successful proofs produce a transaction.

## Known limitation (documented, fixed in Wave 2)

The credential commitment **is disclosed during `proveCredential`** so the
circuit can check the public revocation set. This means:

- A verifier who observes two proofs can tell whether the **same commitment**
  was proven.
- The verifier cannot link that commitment to a person without the holder's
  secret key.
- The holder cannot prove to two different verifiers without the two
  verifications being linkable *to each other*.

**Wave 2 fix:** replace the public `revoked: Set<Bytes<32>>` with a sparse
Merkle tree of revoked commitments. The circuit proves **non-membership**
without revealing which leaf was checked. The commitment is no longer
disclosed. This is the single most important privacy improvement between
Wave 1 and Wave 2.

## Threat model

| Adversary                         | Learns                                             | Does NOT learn                    |
|-----------------------------------|----------------------------------------------------|-----------------------------------|
| Passive chain observer            | which issuers exist, how many verifications        | who holds what, license numbers   |
| Verifier                          | that *some* valid credential met the requirement   | holder identity, license number   |
| Other holders                     | nothing about each other                           | —                                 |
| Compromised issuer                | their own issued credentials                       | other issuers' credentials        |
| Compromised verifier              | the boolean + the commitment for that session      | anything else                     |

## What Wave 2 deliberately defers

1. **Merkle non-membership** — see above.
2. **Encrypted credential delivery** — the issuer sends the credential to the
   holder over a secure off-chain channel. Wave 2 adds an encrypted on-chain
   inbox.
3. **Mobile proof generation** — Wave 1 proves on a laptop. Wave 2 explores
   the Kuira SDK and delegated proving.
4. **Issuer federation** — Wave 1 has a single global issuer set. Wave 2 adds
   scoped registries per credential type.