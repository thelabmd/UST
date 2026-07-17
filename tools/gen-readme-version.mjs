// SPDX-License-Identifier: Apache-2.0
// README version sync gate — the README Status line tracks the CANONICAL `VERSION.spec` (packages/ust-protocol/index.mjs),
// the ONE version source (rc.6 "one version source"; the Status line & appendix must agree). This is the counterpart to
// gen-spec-registry.mjs for the spec: run it, then `git diff --exit-code README.md`, so the README can never silently drift
// behind the spec/package version again (it had done — rc.17 while spec/package were rc.36). Idempotent: same version in ⇒
// no diff out. The wire version `ust: "1.0"` is a DIFFERENT axis (stable across rc's) and is intentionally left untouched.
import { readFileSync, writeFileSync } from 'node:fs';
import { VERSION } from '../packages/ust-protocol/index.mjs';

const path = new URL('../README.md', import.meta.url);
const readme = readFileSync(path, 'utf8');
// the Status line carries the canonical spec version in the FIRST backticks after `**Status:` — replace only that token,
// preserving the surrounding prose. Matching `[^`]+` (not a version shape) stays correct when rc → 1.0.0 final.
const re = /(\*\*Status:\s*`)[^`]+(`)/;
if (!re.test(readme)) {
  console.error('  ✗ README Status line not found (expected a "**Status: `<version>`**" line) — update the anchor if the README format changed');
  process.exit(1);
}
const before = (readme.match(re) || [])[0];
const updated = readme.replace(re, `$1${VERSION.spec}$2`);
writeFileSync(path, updated);
const after = (updated.match(re) || [])[0];
console.log(`  ✓ README Status → ${VERSION.spec} (canonical VERSION.spec)` + (before === after ? '  [already in sync]' : `  [was: ${before.replace(/\*\*Status:\s*`|`/g, '')}]`));
