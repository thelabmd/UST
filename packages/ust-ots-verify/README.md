<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# @ust-protocol/ots-verify

The **opt-in Bitcoin cross-check** for [UST](https://github.com/thelabmd/UST-Protocol) anchors. The
zero-dependency reference verifier (`ust-protocol`) never embeds a blockchain — a portable verifier must
not carry a Bitcoin node. It takes `substrateVerify` as an **injection**; this package is that injection,
backed by [OpenTimestamps](https://opentimestamps.org).

```js
import { substrateVerify } from '@ust-protocol/ots-verify';
import { resolveByDiscovery } from 'ust-protocol';

const { verdict } = await resolveByDiscovery(doc, { context: 'data' }, { substrateVerify });
// witness genesis anchor cross-checked against Bitcoin → VALID:HIGH when the anchor is final
```

Without it, an anchor is honestly `unproven` → the verdict reports **HIGH pending** (never a faked HIGH).
With it, the witness genesis's Bitcoin-OTS anchor is verified: `{ final, time }`.

The `ust` CLI and `@ust-protocol/mcp` auto-detect this package (a graceful dynamic import) — install it
to turn on the cross-check; nobody is forced to.
