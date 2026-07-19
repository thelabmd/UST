// SPDX-License-Identifier: Apache-2.0
// Conformance badge — a shields.io "endpoint" JSON generated from the REAL, drift-gated counts, NEVER hand-typed.
// `vectors` = the language-neutral conformance corpora (byte-vectors + arc-vectors — the cross-implementation arbiters,
// each already committed + gated by test:byte-vectors / test:vectors); `fuzz` = the reference-checker robustness probe
// count, MEASURED by running the deterministic fuzz and reading its own report (never a hardcoded number). Written to
// .github/badge-conformance.json; test:spec-sync git-diff gates it, so the badge can never silently drift from the suite
// (measured, not estimated). The README embeds it via
// https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/thelabmd/UST-Protocol/main/.github/badge-conformance.json
import { readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const byte = JSON.parse(readFileSync(new URL('../vectors/checker-byte-vectors.json', import.meta.url), 'utf8'));
const arc = JSON.parse(readFileSync(new URL('../vectors/arc-vectors.json', import.meta.url), 'utf8'));
if (!Array.isArray(byte.vectors) || !Array.isArray(arc.vectors)) { console.error('  ✗ vector corpora missing a .vectors array'); process.exit(1); }
const vectors = byte.vectors.length + arc.vectors.length;   // language-neutral conformance vectors (byte + arc)

// MEASURE the fuzz probe count from the runner's own deterministic report — not a constant.
const fuzzPath = fileURLToPath(new URL('../packages/ust-protocol/reference-checker.fuzz.mjs', import.meta.url));
const fuzzOut = execSync('node ' + JSON.stringify(fuzzPath), { encoding: 'utf8' });
const m = fuzzOut.match(/\((\d+) probes\)/);
if (!m) { console.error('  ✗ could not read the fuzz probe count from the runner output'); process.exit(1); }
const fuzz = Number(m[1]);

const badge = { schemaVersion: 1, label: 'conformance', message: `${vectors} vectors · ${fuzz} fuzz`, color: 'brightgreen' };
writeFileSync(new URL('../.github/badge-conformance.json', import.meta.url), JSON.stringify(badge) + '\n');
console.log(`  ✓ .github/badge-conformance.json → "${badge.message}" (${byte.vectors.length} byte + ${arc.vectors.length} arc vectors, fuzz measured)`);
