// SPDX-License-Identifier: Apache-2.0
// MODEL ↔ CODE LOCKSTEP GUARD — "math is provable through code". The formal model (NON-NORMATIVE) cites each theorem's
// realization as an italicised conformance-check label: *"...check label..."*. This guard asserts every such citation
// is a REAL check in conformance.mjs — so a theorem cannot claim a property the running suite does not verify. Pair it
// with `node conformance.mjs` (which must be green): together they show each formal claim maps to a passing check.
import { readFileSync } from 'node:fs';

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
