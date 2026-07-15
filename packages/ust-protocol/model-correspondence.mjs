// SPDX-License-Identifier: Apache-2.0
// MODEL ↔ CODE LOCKSTEP GUARD — "math is provable through code". The formal model (NON-NORMATIVE) cites each theorem's
// realization as an italicised conformance-check label: *"...check label..."*. This guard asserts every such citation
// is a REAL check in conformance.mjs — so a theorem cannot claim a property the running suite does not verify. Pair it
// with `node conformance.mjs` (which must be green): together they show each formal claim maps to a passing check.
import { readFileSync } from 'node:fs';
import { ASSURANCE_AXES, EVIDENCE_CAPS_UNIVERSE } from './index.mjs';

const model = readFileSync(new URL('../../spec/UST-1.0-formal-model.md', import.meta.url), 'utf8');
const conf = readFileSync(new URL('./conformance.mjs', import.meta.url), 'utf8');

const cites = [...model.matchAll(/\*"([^"]+)"\*/g)].map((m) => m[1]);
let ok = 0; const miss = [];
for (const c of cites) {
  // a citation may be fragmented with "..." (shared prefix elided); require its LONGEST verbatim fragment in conformance
  const frag = c.split('...').map((s) => s.trim()).filter((s) => s.length >= 12).sort((a, b) => b.length - a.length)[0] || c.trim();
  if (conf.includes(frag)) ok++; else miss.push({ c, frag });
}

console.log(`\n  model ↔ conformance: ${ok}/${cites.length} cited theorem checks found in conformance.mjs`);
if (miss.length) {
  console.log('  ✗ a formal-model theorem cites a check that does not exist:');
  for (const m of miss) console.log('    MISSING: "' + m.frag + '"   (cited as: "' + m.c + '")');
  process.exit(1);
}
console.log('  ✓ every theorem the formal model cites is a real conformance check (math ⇒ code)');

// ── INTERNAL MATH-CONSISTENCY (UST-1n1) — the rc.35 M1 contradiction class: the model DEFINED EvidenceBasis as a
//    SET yet COUNTED it as a 4-chain (2·4·4·2·4 = 256), and the citation guard above could not see it (it checks
//    labels exist, not that the model's numbers are consistent with the code's structures). This section recomputes
//    every NUMERIC claim the model makes about code-defined structures from the structures themselves.
const axisSizes = Object.values(ASSURANCE_AXES).map((vs) => vs.length);
const strengthCount = axisSizes.reduce((a, b) => a * b, 1);
const claims = [];
// a claim inside a documented-ERROR passage (the model quoting the rc.35 mistake it corrects) is exempt; the
// exemption is the CONTEXT naming the error, so a live section cannot smuggle a stale count.
const isHistorical = (idx) => /rc\.35|self-contradictory|category error|\*\*Error/i.test(model.slice(Math.max(0, idx - 300), idx + 100));
// every "a·b·c(·d…) = N" product claim over the strength axes must equal the LIVE product AND the live factorization
for (const m of model.matchAll(/`?(\d+(?:·\d+)+)\s*=\s*(\d+)`?/g)) {
  const factors = m[1].split('·').map(Number), stated = Number(m[2]);
  if (factors.length < 3 || isHistorical(m.index)) continue;                   // <3 factors = unrelated small products; historical = the quoted rc.35 error
  claims.push({ kind: 'strength product', text: m[0].trim(),
    ok: stated === strengthCount && factors.length === axisSizes.length && factors.every((f, i) => f === axisSizes[i])
      && factors.reduce((a, b) => a * b, 1) === stated });
}
// |Caps| and |P(Caps)| claims must match the single-sourced universe
for (const m of model.matchAll(/\|Caps\|\s*=\s*(\d+)/g)) { if (!isHistorical(m.index)) claims.push({ kind: '|Caps|', text: m[0], ok: Number(m[1]) === EVIDENCE_CAPS_UNIVERSE.length }); }
for (const m of model.matchAll(/\|P\(Caps\)\|\s*=\s*(\d+)/g)) { if (!isHistorical(m.index)) claims.push({ kind: '|P(Caps)|', text: m[0], ok: Number(m[1]) === 2 ** EVIDENCE_CAPS_UNIVERSE.length }); }
const bad = claims.filter((c) => !c.ok);
const audited = claims.length;
if (!audited) { console.log('  ✗ math-consistency: found NO numeric structure claims in the model — extraction broke'); process.exit(1); }
if (bad.length) {
  console.log('  ✗ math-consistency (UST-1n1): the model asserts a count its own code structures contradict:');
  for (const b of bad) console.log(`    ${b.kind}: "${b.text}" vs live ${b.kind === 'strength product' ? strengthCount + ' (axes ' + axisSizes.join('·') + ')' : b.kind === '|Caps|' ? EVIDENCE_CAPS_UNIVERSE.length : 2 ** EVIDENCE_CAPS_UNIVERSE.length}`);
  process.exit(1);
}
console.log(`  ✓ math-consistency (UST-1n1): ${audited} numeric structure claims recomputed from ASSURANCE_AXES/EVIDENCE_CAPS_UNIVERSE — axis-def ⟺ axis-claim ⟺ state-count`);
