<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Security Policy

UST is trust infrastructure: the reference **verifier/checker** (`checkAuthorityProofBytes` and the
`resolveKeys` / `resolveAuthority` / `verify` / `verifyAsync` / `resolveByDiscovery` name-binding path) is the TCB —
a soundness or totality defect there is treated as **critical**. The specification and its measure-theoretic formal
model (`spec/UST-1.0-formal-model.md`) are part of the security surface: a claim the model asserts but the code does
not realize is a security issue, not a documentation issue.

## Reporting a vulnerability

**Report privately — do not open a public issue for a suspected vulnerability.**

- Preferred: GitHub **private vulnerability reporting** — the repository's **Security → Report a vulnerability** tab
  (opens a private advisory only maintainers can see).
- A minimal, runnable reproduction against the exact commit is the most useful report: bytes/inputs in, the
  verdict out, and the invariant you believe is violated (cite the `spec/` or formal-model passage where possible).

We aim to acknowledge a report within a few days. Because the project is small, please allow reasonable time to
remediate structurally before any public disclosure; we will credit reporters who wish to be named.

## What is in scope

- The reference verifier and the name-binding resolver (the TCB above) returning `VALID(J)` / `authoritative` /
  `anchored` for an input with no genuine derivation of `J`; any way to make it throw, loop, or return a
  non-deterministic / non-tri-state result; or any cross-implementation divergence at the canonical byte boundary.
- The conformance vectors (`vectors/`) or the spec/model being unsound or internally inconsistent.

## Out of scope

- The untrusted object-encoding adapter `checkAuthorityProof(obj)` (only the immutable-byte `…Bytes` boundary is
  the TCB), and the producer/prover stack.
- Operational deployment of a specific operator (that is the operator's own security surface).

## Supported versions

Active development is on the `1.0.0-rc.x` line; fixes land on `main`. There is no long-term-support branch yet —
pin an exact version and track `main` for the current state.
