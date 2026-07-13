// #69 Theme A2 regression: finality REQUIRES the committed value to match the REAL Bitcoin block merkle root
// AND >= minConfirmations. Offline: a captured real genesis .ots + a mock explorer serving the real block.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeSubstrateVerify, parseOtsBitcoin } from './index.mjs';

const F = JSON.parse(readFileSync(new URL('./test-fixture.json', import.meta.url)));

// a mock explorer: block-height→hash, block→{merkle_root,timestamp}, tip→height. `merkle` and `tip` overridable.
const mockExplorer = ({ merkle = F.merkle_root, tip = F.height + 100 } = {}) =>
  (async (url) => {
    const u = String(url);
    if (u.endsWith(`/block-height/${F.height}`)) return { text: async () => F.hash };
    if (u.endsWith(`/block/${F.hash}`)) return { json: async () => ({ merkle_root: merkle, timestamp: F.timestamp }) };
    if (u.endsWith('/blocks/tip/height')) return { text: async () => String(tip) };
    throw new Error('unexpected ' + u);
  });

test('real genesis .ots + honest explorer → final:true (real block merkle + ≥6 conf)', async () => {
  const sv = makeSubstrateVerify({ fetchImpl: mockExplorer(), explorers: ['x'] });
  const r = await sv({ substrate: 'bitcoin-ots', ots: F.ots }, F.root);
  assert.equal(r.final, true);
});

test('P0 #69 A2 — explorer returns a WRONG merkle root → NOT final (structure alone is not proof)', async () => {
  const sv = makeSubstrateVerify({ fetchImpl: mockExplorer({ merkle: '00'.repeat(32) }), explorers: ['x'] });
  const r = await sv({ substrate: 'bitcoin-ots', ots: F.ots }, F.root);
  assert.equal(r.final, false);
});

test('block not yet buried (tip = height+2 → 3 conf) → NOT final', async () => {
  const sv = makeSubstrateVerify({ fetchImpl: mockExplorer({ tip: F.height + 2 }), explorers: ['x'] });
  const r = await sv({ substrate: 'bitcoin-ots', ots: F.ots }, F.root);
  assert.equal(r.final, false);
});

test('explorer unreachable → unproven, never a false final', async () => {
  const down = async () => { throw new Error('network'); };
  const sv = makeSubstrateVerify({ fetchImpl: down, explorers: ['x'] });
  const r = await sv({ substrate: 'bitcoin-ots', ots: F.ots }, F.root);
  assert.equal(r.final, false);
});

test('.ots does not attest THIS root → null (claim ≠ proof)', async () => {
  const sv = makeSubstrateVerify({ fetchImpl: mockExplorer(), explorers: ['x'] });
  const r = await sv({ substrate: 'bitcoin-ots', ots: F.ots }, 'sha256:' + 'cd'.repeat(32));
  assert.equal(r, null);
});

test('non-bitcoin substrate → null (router delegates onward)', async () => {
  const sv = makeSubstrateVerify({ fetchImpl: mockExplorer(), explorers: ['x'] });
  assert.equal(await sv({ substrate: 'rekor' }, F.root), null);
});

test('parseOtsBitcoin extracts the attested block height', () => {
  const parsed = parseOtsBitcoin(Buffer.from(F.ots, 'base64'));
  assert.equal(parsed.height, F.height);
});
