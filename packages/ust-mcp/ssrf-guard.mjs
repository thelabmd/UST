// SPDX-License-Identifier: Apache-2.0
// #71 — moved to the shared core adapter `ust-protocol/ssrf` (one guard for MCP + CLI + any Node surface).
// Kept as a re-export for backward compatibility.
export { isPrivateIp, makeSsrfSafeFetch } from 'ust-protocol/ssrf';
