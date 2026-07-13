// #69 Theme A1 regression: the anchor terminates at Rekor's SIGNED tree head, never a self-consistent
// Merkle object. Uses a captured REAL rekor.sigstore.dev anchor (noosphere genesis) as an offline vector.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { makeSubstrateVerify, verifyCheckpoint, verifyInclusion } from './index.mjs';

const sha256 = (b) => createHash('sha256').update(b).digest();
const FIX = JSON.parse(readFileSync(new URL('./test-fixture.json', import.meta.url)));
const sv = makeSubstrateVerify();

test('REAL rekor.sigstore.dev anchor (captured) → final:true', async () => {
  const r = await sv(FIX.anchor, FIX.root);
  assert.equal(r.final, true);
});

test('P0 #69 A1 — fabricated treeSize=1 tree (rootHash=leaf, unsigned checkpoint) → NOT final', async () => {
  const root = 'sha256:' + 'ab'.repeat(32);
  const artifactHash = createHash('sha256').update(Buffer.from(root.slice(7), 'utf8')).digest('hex');
  const body = Buffer.from(JSON.stringify({ spec: { data: { hash: { value: artifactHash } } } })).toString('base64');
  const leaf = sha256(Buffer.concat([Buffer.from([0x00]), Buffer.from(body, 'base64')]));
  const fake = {
    substrate: 'rekor', body, integratedTime: 700000000,
    inclusionProof: { logIndex: 0, treeSize: 1, hashes: [], rootHash: leaf.toString('hex'),
      checkpoint: 'rekor.sigstore.dev - 1\n1\n' + leaf.toString('base64') + '\n\n— rekor.sigstore.dev AAAAAAAA' },
  };
  const r = await sv(fake, root);
  assert.equal(r.final, false); // the checkpoint carries no valid Rekor signature
});

test('tampered checkpoint signature on the real anchor → NOT final', async () => {
  const a = structuredClone(FIX.anchor);
  // corrupt a byte DEEP in the base64 signature (past the 4-byte key hint the verifier skips → hits the DER sig)
  const lines = a.inclusionProof.checkpoint.split('\n');
  const si = lines.findIndex((l) => l.startsWith('— '));
  const [pre, name, sig] = lines[si].split(' ');
  const k = 16; // well past the ~6 base64 chars of the key hint
  lines[si] = [pre, name, sig.slice(0, k) + (sig[k] === 'A' ? 'B' : 'A') + sig.slice(k + 1)].join(' ');
  a.inclusionProof.checkpoint = lines.join('\n');
  assert.notEqual(a.inclusionProof.checkpoint, FIX.anchor.inclusionProof.checkpoint); // ensure we actually tampered
  const r = await sv(a, FIX.root);
  assert.equal(r.final, false);
});

test('checkpoint root ≠ inclusion-proof root → verifyCheckpoint false (signed head must match)', () => {
  const ck = FIX.anchor.inclusionProof.checkpoint;
  assert.equal(verifyCheckpoint(ck, 'sha256:' + '00'.repeat(32), FIX.anchor.inclusionProof.treeSize, undefined) , false);
});

test('entry that does not attest our root → null (claim ≠ proof)', async () => {
  const r = await sv(FIX.anchor, 'sha256:' + 'cd'.repeat(32));
  assert.equal(r, null);
});

test('verifyInclusion: single-leaf tree is self-consistent (why (3) is REQUIRED)', () => {
  const leaf = sha256(Buffer.from('x'));
  assert.equal(verifyInclusion({ leafHash: leaf, index: 0, treeSize: 1, hashes: [], rootHash: leaf.toString('hex') }), true);
});
