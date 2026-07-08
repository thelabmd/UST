// SPDX-License-Identifier: Apache-2.0
import * as W from './lib/ust-web-signer.mjs';
import { verify } from './lib/ust-verify.mjs';

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open('ust-signer', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('keys');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function idbGet(key) {
  const db = await openDB();
  return new Promise((res) => { const t = db.transaction('keys').objectStore('keys').get(key); t.onsuccess = () => res(t.result ?? null); t.onerror = () => res(null); });
}

(async () => {
  const stored = await idbGet('ed25519');
  if (!stored?.publicKey) {
    document.getElementById('id').textContent = 'no identity yet — use "Make it UST" once to create it';
    document.getElementById('pub').textContent = '—';
    return;
  }
  const s = await W.signerFromKeys(stored.privateKey, stored.publicKey);
  document.getElementById('id').textContent = s.key_id;
  document.getElementById('pub').textContent = s.pub;
})();

// ── Verify mode: the extension is the RECIPIENT'S trusted verifier. It regenerates everything it shows from the
// SIGNED bytes — the sender's preamble (Source:, header) is never displayed as truth. Runs locally; nothing leaves
// the browser. Same extraction as the web verifier: full blob / bare base64 / raw JSON. ──
const vin = document.getElementById('vin'), vout = document.getElementById('vout');
const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function b64decodeUtf8(b64) {
  const bin = atob(b64.replace(/\s+/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
function extractDoc(input) {
  let s = input.trim();
  const marker = '———UST(base64)———';
  if (s.includes(marker)) s = s.slice(s.lastIndexOf(marker) + marker.length).trim();
  if (s.startsWith('{')) return JSON.parse(s);
  return JSON.parse(b64decodeUtf8(s));
}
function renderContent(data) {
  return Object.entries(data || {}).map(([name, part]) => {
    if (part && part.value !== undefined) {
      const v = part.value;
      const text = (v && typeof v === 'object' && typeof v.text === 'string') ? v.text : JSON.stringify(v, null, 2);
      return '<div class="lbl">' + esc(name) + (part.kind ? ' · ' + esc(part.kind) : '') + '</div><div class="content">' + esc(text) + '</div>';
    }
    return '<div class="lbl">' + esc(name) + ' · ' + esc(part && part.privacy || 'private') + '</div><div class="content">' + esc(part && part.commit || '(private — committed, not revealed)') + '</div>';
  }).join('');
}

async function runVerify() {
  const raw = vin.value.trim();
  vout.innerHTML = '';
  if (!raw) return;

  let doc;
  try { doc = extractDoc(raw); }
  catch { vout.innerHTML = '<div class="verdict bad">UNREADABLE</div><div class="err">Not a UST blob, base64, or JSON.</div>'; return; }

  try {
    const r = await verify(doc, { context: 'data' });
    const valid = typeof r.result === 'string' && r.result.slice(0, 6) === 'VALID:';
    const st = doc.state || {}, id = st.id || {};
    if (valid) {
      vout.innerHTML = '<div class="verdict ok">' + esc(r.result) + '</div>' +
        renderContent(st.data) +
        '<div class="kv"><span>key</span> ' + esc(id.key_id || '') + '<br><span>time</span> ' + esc(st.time && st.time.generated_at || '') + ' · <span>frame</span> ' + esc(id.ust_id || '') + '</div>' +
        '<p class="note">Proven: the exact bytes above · the signing key · the claimed time. <b>Not</b> proven: who published it, or where it came from — a <i>Source:</i> line in the pasted text is the sender\'s unverified claim.</p>';
    } else {
      vout.innerHTML = '<div class="verdict bad">' + esc(r.result || 'INVALID') + '</div>' +
        '<div class="err">' + esc(r.error || '') + (r.detail ? ' — ' + esc(r.detail) : '') + '</div>' +
        '<p class="note">The bytes, hashes, or signature are inconsistent — a genuine UST edited in transit fails exactly here.</p>';
    }
  } catch (e) {
    vout.innerHTML = '<div class="verdict bad">ERROR</div><div class="err">' + esc(e.message || String(e)) + '</div>';
  }
}
vin.addEventListener('input', runVerify);
