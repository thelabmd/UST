// SPDX-License-Identifier: Apache-2.0
// Version sync gate — the README Status line AND the private monorepo-root package.json version both track the CANONICAL
// `VERSION.spec` (packages/ust-protocol/index.mjs), the ONE version source (rc.6 "one version source"). Counterpart to
// gen-spec-registry.mjs for the spec: run it, then `git diff --exit-code README.md package.json`, so neither can silently
// drift behind the spec/package version again (README had — rc.17; root package.json had — rc.34, while spec/package were
// rc.36). Idempotent. Per-WORKSPACE package versions (cli/mcp/…) version independently and are NOT touched here; the wire
// version `ust: "1.0"` is a different axis (stable across rc's) and is untouched.
import { readFileSync, writeFileSync } from 'node:fs';
import { VERSION } from '../packages/ust-protocol/index.mjs';

// 1) README status — the Status prose moved into the TUI SVG panel (gen-status-svg.mjs, .github/status.svg); the markdown
// carries it as the image ALT text (searchable + screen-reader text). Replace only the version token in that alt's backticks.
const readmePath = new URL('../README.md', import.meta.url);
const readme = readFileSync(readmePath, 'utf8');
const reReadme = /(!\[UST status:\s*`)[^`]+(`)/;
if (!reReadme.test(readme)) {
  console.error('  ✗ README status image not found (expected an "![UST status: `<version>` — …](.github/status.svg)" line) — update the anchor if the README format changed');
  process.exit(1);
}
const readmeBefore = (readme.match(reReadme) || [])[0];
writeFileSync(readmePath, readme.replace(reReadme, `$1${VERSION.spec}$2`));
console.log(`  ✓ README status alt → ${VERSION.spec} (canonical VERSION.spec)` + (readmeBefore.includes(VERSION.spec) ? '  [already in sync]' : `  [was: ${readmeBefore.replace(/!\[UST status:\s*`|`/g, '')}]`));

// 2) root package.json version — the FIRST `"version": "..."` in the file is the root package's own (deps never use that
// key). Replace only that token, so JSON formatting is byte-preserved (no reformat, minimal diff).
const pkgPath = new URL('../package.json', import.meta.url);
const pkg = readFileSync(pkgPath, 'utf8');
const rePkg = /("version":\s*")[^"]+(")/;
if (!rePkg.test(pkg)) {
  console.error('  ✗ root package.json has no "version" field');
  process.exit(1);
}
const pkgBefore = (pkg.match(rePkg) || [])[0];
writeFileSync(pkgPath, pkg.replace(rePkg, `$1${VERSION.spec}$2`));
console.log(`  ✓ root package.json version → ${VERSION.spec}` + (pkgBefore.includes(VERSION.spec) ? '  [already in sync]' : `  [was: ${pkgBefore.replace(/"version":\s*"|"/g, '')}]`));
