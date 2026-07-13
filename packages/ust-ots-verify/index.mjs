// SPDX-License-Identifier: Apache-2.0
// @ust-protocol/ots-verify — the OPT-IN Bitcoin substrateVerify for UST anchors (#68 Ф1b / #69 A2).
//
// WHY A SEPARATE PACKAGE: the zero-dependency reference verifier (ust-protocol) must never embed a
// blockchain / the heavy opentimestamps lib. resolveByDiscovery / verifyAnchor take `substrateVerify` as an
// OPTIONAL injection: without it, an anchor is honestly `unproven`; WITH this package it is cross-checked
// against Bitcoin.
//
// #69 A2 (P0) — `isTimestampComplete()` only means "a Bitcoin attestation EXISTS in the .ots tree"; it does
// NOT mean that block actually commits the root, nor that it is buried. A fabricated 'complete' .ots would
// pass. So finality now REQUIRES: (1) the .ots attests THIS root; (2) the committed value equals the REAL
// merkle root of the Bitcoin block at the attested height (fetched from a read-only explorer — public
// consensus, the explorer only mirrors it); (3) the block is buried under >= minConfirmations (default 6,
// §17). The explorer is untrusted: a wrong answer fails the merkle match (claim ≠ proof); unreachable →
// `unproven`, never a false `final`.
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const OTS = createRequire(import.meta.url)('opentimestamps');

const EXPLORERS = ['https://blockstream.info/api', 'https://mempool.space/api'];
const OTS_BTC_TAG = Buffer.from([0x05, 0x88, 0x96, 0x0d, 0x73, 0xd7, 0x19, 0x01]);
const sha256 = (b) => createHash('sha256').update(b).digest();
const hexToBytes = (hex) => Buffer.from(hex.replace(/^sha256:/, ''), 'hex');
const bytesEq = (a, b) => Buffer.from(a).equals(Buffer.from(b));

// Parse an OpenTimestamps proof (canonical Timestamp.deserialize grammar: 0xff separates sibling branches at
// a node, an op recurses into a sub-timestamp on the transformed message, an attestation fixes the node's
// message) down to its BitcoinBlockHeaderAttestation → { height, merkle (internal byte order) }. sha256/
// append/prepend only — an unsupported op throws and the parse fails closed. (Same logic proven in the web
// verifier docs/ust-resolve.mjs, against a live block header.)
export function parseOtsBitcoin(ots) {
  let pos = 31; pos++; /* major version */ pos++; /* file-hash op */
  const digest = ots.subarray(pos, pos + 32); pos += 32;
  const readVarint = () => { let r = 0, sh = 0; for (;;) { const b = ots[pos++]; r += (b & 0x7f) * (2 ** sh); if (!(b & 0x80)) break; sh += 7; } return r; };
  let found = null;
  const applyOp = (tag, msg) => {
    if (tag === 0xf0) { const n = readVarint(); const a = ots.subarray(pos, pos + n); pos += n; return Buffer.concat([msg, a]); }
    if (tag === 0xf1) { const n = readVarint(); const a = ots.subarray(pos, pos + n); pos += n; return Buffer.concat([a, msg]); }
    if (tag === 0x08) return sha256(msg);
    throw new Error('ots op 0x' + tag.toString(16) + ' unsupported');
  };
  const doOne = (tag, msg) => {
    if (tag === 0x00) {
      const at = ots.subarray(pos, pos + 8); pos += 8; const len = readVarint(); const payload = ots.subarray(pos, pos + len); pos += len;
      if (at.equals(OTS_BTC_TAG)) { let h = 0, sh = 0, p = 0; for (;;) { const b = payload[p++]; h += (b & 0x7f) * (2 ** sh); if (!(b & 0x80)) break; sh += 7; } found = { height: h, merkle: Buffer.from(msg) }; }
    } else { deserialize(applyOp(tag, msg)); }
  };
  function deserialize(msg) { let tag = ots[pos++]; while (tag === 0xff) { doOne(ots[pos++], msg); tag = ots[pos++]; } doOne(tag, msg); }
  deserialize(digest);
  return found ? { height: found.height, merkle: found.merkle, digest } : null;
}

export function makeSubstrateVerify({ upgrade = true, fetchImpl = fetch, explorers = EXPLORERS, minConfirmations = 6 } = {}) {
  return async function substrateVerify(anchor, root) {
    const sub = anchor?.substrate ?? anchor?.anchor?.substrate;
    if (sub && sub !== 'bitcoin-ots') return null;                 // not ours → router delegates onward
    const otsB64 = anchor?.ots ?? anchor?.anchor?.ots;
    if (!otsB64 || typeof root !== 'string') return null;
    let det;
    try { det = OTS.DetachedTimestampFile.deserialize(Uint8Array.from(Buffer.from(otsB64, 'base64'))); }
    catch { return null; }
    // the .ots MUST attest THIS root — otherwise it proves nothing about our genesis
    if (!bytesEq(new Uint8Array(det.timestamp.msg), hexToBytes(root))) return null;
    if (!det.timestamp.isTimestampComplete() && upgrade) {
      try { await OTS.upgrade(det); } catch { /* calendar unreachable → stays pending */ }
    }
    if (!det.timestamp.isTimestampComplete()) return { final: false, time: 'unproven' };

    // #69 A2 — parse to the Bitcoin attestation and PROVE it against the real chain (not just structure).
    let parsed;
    try { parsed = parseOtsBitcoin(Buffer.from(det.serializeToBytes())); } catch { return { final: false, time: 'unproven' }; }
    if (!parsed || typeof parsed.height !== 'number') return { final: false, time: 'unproven' };
    const wantMerkle = Buffer.from(parsed.merkle).reverse().toString('hex');   // block header displays reversed

    for (const base of explorers) {
      try {
        const hash = (await (await fetchImpl(`${base}/block-height/${parsed.height}`, { signal: AbortSignal.timeout(10000) })).text()).trim();
        if (!/^[0-9a-f]{64}$/.test(hash)) continue;
        const blk = await (await fetchImpl(`${base}/block/${hash}`, { signal: AbortSignal.timeout(10000) })).json();
        if (!blk || blk.merkle_root !== wantMerkle) return { final: false, time: 'unproven' };  // definitive NO
        const tip = Number((await (await fetchImpl(`${base}/blocks/tip/height`, { signal: AbortSignal.timeout(10000) })).text()).trim());
        const confirmations = Number.isFinite(tip) ? tip - parsed.height + 1 : 0;
        if (confirmations < minConfirmations) return { final: false, time: 'unproven' };         // not yet buried
        return { final: true, time: blk.timestamp ? new Date(blk.timestamp * 1000).toISOString().slice(0, 19) + 'Z' : 'bitcoin-block-' + parsed.height };
      } catch { /* explorer unreachable — try the next */ }
    }
    return { final: false, time: 'unproven' };                    // no explorer could confirm → honest unproven
  };
}

// Convenience default (upgrade-on-verify). Pass to resolveByDiscovery/verifyAnchor as `substrateVerify`.
export const substrateVerify = makeSubstrateVerify();
