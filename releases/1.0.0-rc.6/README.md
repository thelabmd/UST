<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Release evidence — ust-protocol 1.0.0-rc.6

`release-evidence.ust.txt` is a signed UST (`class: derivation`) binding this release's artifacts into one
verifiable object: the source **git commit**, the published **npm tarball integrity**, the **conformance
vectors hash** and the **machine test report** (`test-report.txt`, 74/0). Its `based_on` carries the audit
lineage: follow-up audit → rc.6 response → the original rc.5 audit — each a signed UST; walk the chain with a
resolver.

Verify: decode the base64 after `———UST(base64)———`, then `verify(doc, { context: "data" })` with
[`ust-protocol`](https://www.npmjs.com/package/ust-protocol), or paste the whole file into
[the web verifier](https://thelabmd.github.io/UST-Protocol/).

This implements P0-4 of the follow-up audit ("signed release evidence") and is the template for every future
release: a release is not a claim, it is a verifiable chain.
