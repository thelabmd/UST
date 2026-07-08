<!-- SPDX-License-Identifier: CC-BY-4.0 -->
# Governance

Deliberately minimal. This document will grow when there is a second independent implementer; until then, a
heavy process would be theatre.

## How changes are made

Changes are proposed via **issues and pull requests** against this repository. Discussion happens in the open.

## What counts as a breaking change

A **breaking change** is anything that affects the **canonical bytes, hashes, signatures, or verdicts** — i.e.
anything that could make a previously-conforming document verify differently, or a conforming implementation
disagree. Editorial, documentation, and additive-tooling changes are not breaking.

Breaking changes require a **version bump** and a **declared cutover `ust_id`** per **§19** of the specification,
so every consumer can tell exactly which frames fall under which version.

## Decisions

Anyone may propose; the **maintainer decides** in case of dispute. When a second independent implementation
exists, this section will be replaced by a real multi-party process.

## Contributions — inbound = outbound

By contributing you agree your contribution is licensed under the **same licenses as the project**: **Apache-2.0**
for code and **CC BY 4.0** for specification/documentation text (see `LICENSE`, `LICENSE-SPEC`). There is **no
CLA** — inbound = outbound.
