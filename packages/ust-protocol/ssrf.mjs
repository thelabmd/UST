// SPDX-License-Identifier: Apache-2.0
// #71 — the SHARED Node-side SSRF resolution guard. `isPublicDnsShard` (index.mjs) is the PORTABLE lexical floor
// (all a browser can do); it cannot catch a syntactically-public NAME that RESOLVES to an internal ADDRESS
// (127.0.0.1, 10/8, 169.254/16, ::1, fc00::/7 …). This module resolves the host and refuses the fetch if ANY
// A/AAAA record is private/loopback/link-local — BEFORE any connection. It is a Node-ONLY OPT-IN subpath
// (`ust-protocol/ssrf`), never imported by the zero-dep/browser core; the MCP and CLI both pass its wrapper as
// the `fetchImpl` to resolveByDiscovery, so every auto-fetching Node surface shares one guard (audit: MCP-only → all).
//
// Bounded residual (documented): resolves-then-fetches without pinning the exact socket, so a DNS-rebind flip
// between the check and the connection is not closed here (that needs a pinning dispatcher). Impact is already
// bounded — the fetched genesis/key-log is content-addressed + signature-checked, so SSRF here is an internal
// reachability probe, never an identity forgery.
import { promises as dns } from 'node:dns';
import net from 'node:net';

export function isPrivateIp(ip) {
  const v = net.isIP(ip);
  if (v === 4) {
    const o = ip.split('.').map(Number);
    if (o.length !== 4 || o.some((n) => !(n >= 0 && n <= 255))) return true;   // malformed → refuse
    return (
      o[0] === 0 || o[0] === 10 || o[0] === 127 ||                              // 0/8, 10/8, loopback
      (o[0] === 100 && o[1] >= 64 && o[1] <= 127) ||                            // 100.64/10 CGNAT
      (o[0] === 169 && o[1] === 254) ||                                         // link-local
      (o[0] === 172 && o[1] >= 16 && o[1] <= 31) ||                             // 172.16/12
      (o[0] === 192 && o[1] === 168) ||                                         // 192.168/16
      (o[0] === 192 && o[1] === 0 && o[2] === 0) ||                             // 192.0.0/24
      o[0] >= 224                                                              // multicast/reserved 224+
    );
  }
  if (v === 6) {
    // round-49 P1-01 — classify by BYTE RANGE, not textual spelling: the old `^::ffff:(dotted-decimal)$` regex missed the
    // equivalent HEX form (`::ffff:7f00:1` = 127.0.0.1) and every compressed variant, so a mapped-loopback SSRF slipped through.
    const b = ipv6ToBytes(ip.toLowerCase().split('%')[0]);
    if (!b) return true;                                                        // unparseable (net.isIP said v6, but be safe) → refuse
    if (b.every((x) => x === 0)) return true;                                   // :: unspecified
    if (b.slice(0, 15).every((x) => x === 0) && b[15] === 1) return true;       // ::1 loopback
    const mapped = b.slice(0, 10).every((x) => x === 0) && b[10] === 0xff && b[11] === 0xff;   // ::ffff:0:0/96 IPv4-mapped
    const compat = b.slice(0, 12).every((x) => x === 0);                        // ::/96 IPv4-compatible (deprecated)
    const nat64 = b[0] === 0x00 && b[1] === 0x64 && b[2] === 0xff && b[3] === 0x9b && b.slice(4, 12).every((x) => x === 0);   // 64:ff9b::/96 NAT64
    if (mapped || compat || nat64) return isPrivateIp(b.slice(12).join('.'));   // classify the embedded IPv4 via the v4 policy — ANY spelling
    if ((b[0] & 0xfe) === 0xfc) return true;                                    // fc00::/7 unique-local
    if (b[0] === 0xfe && (b[1] & 0xc0) === 0x80) return true;                   // fe80::/10 link-local
    return false;
  }
  return true;                                                                  // not an IP literal → caller resolves
}

// Parse a lower-cased IPv6 literal to its 16 octets (handles `::` compression + an embedded IPv4 tail `::ffff:1.2.3.4` /
// `::1.2.3.4`). round-49 P1-01 — the mapped range must be caught in EVERY spelling, so classification runs over bytes, not text.
function ipv6ToBytes(a) {
  let s = a, v4 = null;
  const li = s.lastIndexOf(':');
  if (li >= 0 && s.slice(li + 1).includes('.')) {                              // embedded dotted IPv4 tail
    const parts = s.slice(li + 1).split('.');
    if (parts.length !== 4 || parts.some((p) => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
    v4 = parts.map(Number); s = s.slice(0, li + 1);                            // keep the trailing ':' before the tail
  }
  const dbl = s.split('::');
  if (dbl.length > 2) return null;
  const lh = dbl[0] ? dbl[0].split(':').filter(Boolean) : [];
  const rh = dbl.length === 2 ? (dbl[1] ? dbl[1].split(':').filter(Boolean) : []) : null;
  const need = 8 - (v4 ? 2 : 0);
  const hextets = rh === null ? lh : [...lh, ...Array(need - lh.length - rh.length).fill('0'), ...rh];
  if (rh === null ? hextets.length !== need : (need - lh.length - rh.length) < 0) return null;
  const bytes = [];
  for (const h of hextets) { if (!/^[0-9a-f]{1,4}$/.test(h)) return null; const n = parseInt(h, 16); bytes.push((n >> 8) & 0xff, n & 0xff); }
  if (v4) bytes.push(...v4);
  return bytes.length === 16 ? bytes : null;
}

// Wrap a fetch so a discovery target that resolves to a private address is refused before connecting.
export function makeSsrfSafeFetch(baseFetch = fetch, { resolver = dns.lookup } = {}) {
  return async function ssrfSafeFetch(url, opts) {
    let host;
    try { host = new URL(String(url)).hostname; } catch { throw new Error('SSRF guard: unparseable URL'); }
    const bracketless = host.replace(/^\[|\]$/g, '');
    if (net.isIP(bracketless) !== 0) {
      if (isPrivateIp(bracketless)) throw new Error('SSRF guard: refusing private IP literal ' + bracketless);
    } else {
      let addrs;
      try { addrs = await resolver(host, { all: true }); } catch { throw new Error('SSRF guard: cannot resolve ' + host); }
      const list = Array.isArray(addrs) ? addrs : [{ address: addrs }];
      for (const a of list) if (isPrivateIp(a.address)) throw new Error('SSRF guard: ' + host + ' resolves to private ' + a.address);
    }
    return baseFetch(url, opts);
  };
}
