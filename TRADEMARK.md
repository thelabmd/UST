<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Name & Compatibility Policy

This is a plain-language statement of how the names around Universal State Transcript (UST) may be used. It is
policy, not a legal grant: **no trademark is registered yet.** It exists so the names stay meaningful as the
protocol outlives any single author.

## You MAY use the names when you conform

The names **"UST"**, **"UST Protocol"**, **"Universal State Transcript"**, and the claim **"UST-compatible"** may
be used by an implementation that:

1. conforms to the specification in [`spec/UST-1.0.md`](spec/UST-1.0.md), and
2. passes the official conformance vectors.

The conformance vectors live in [`vectors/`](vectors/) today. *(TODO: an official `test-vectors/` package with a
standalone conformance runner is forthcoming; until it lands, `vectors/conformance-vectors.json` is the
authoritative suite.)*

If you conform, you need no permission — say so freely: "UST-compatible."

## Forks and derivatives are welcome — under a different name

Forks and non-conforming derivatives are **welcome** under the content licenses (code: Apache-2.0; specification
text: CC BY 4.0). But a derivative that changes the wire format, the canonical bytes, the hashes, the signatures,
or the verdicts — anything that would make it fail the vectors — **MUST use a different name** and **MUST NOT
claim UST compatibility.** This is the whole point: "UST-compatible" must mean one verifiable thing, so that a
consumer can trust the claim without trusting the claimant.

## Status

No trademark registration is claimed at this time. This document states the intended use policy. It may be
formalized later; until then, please honor it in the spirit of keeping an open protocol's name honest.
