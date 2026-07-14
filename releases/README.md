<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Releases — evidence, not folders

This directory holds **at most: the currently-published rc + final releases**. It is not an archive — git is.

- When a new rc supersedes the previous one, the old rc folder is **deleted in the same PR**. Nothing is lost:
  git history keeps it forever (`git checkout <tag|commit> -- releases/…`), and its bytes stay verifiable by hash.
- **Final releases (1.0.0, 1.1.0, …) stay in the tree permanently.**
- Release HISTORY lives in the **evidence chain itself**, not in folders: each release-evidence UST carries
  `based_on = [ the audit-lineage head, the PREVIOUS release evidence ]` — a hash-linked chain any resolver can
  walk. The tree holds the head; the chain holds the history. (The same shape as the anchor chain.)

Produce and gate evidence with the mechanism — never by hand:

```
node tools/release-evidence.mjs generate --based-on sha256:<audit head> [--prev sha256:<previous evidence>]
node tools/release-evidence.mjs check
```

**When:** evidence is a POST-PUBLISH artifact — `generate`/`check` re-derive the npm tarball integrity, so they
run **at a real release** (a published version), gated in the release workflow, NOT on every in-repo `rc` bump.
While the repo is ahead of npm ("publish pending"), the per-commit CI `npm-drift` gate holds version immutability;
release evidence is produced when that version is actually published. Empty here ⇒ no release since the last cleanup,
which is the honest state, not a gap.
