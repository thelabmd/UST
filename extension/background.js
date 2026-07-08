// SPDX-License-Identifier: Apache-2.0
// "Make it UST" — MV3 service worker. Select text → context menu → sign a LIGHT UST with the browser's own key →
// copy an honest blob to the clipboard. The private key is generated NON-EXTRACTABLE and persisted in IndexedDB;
// it never leaves WebCrypto. Per the LIGHT-honesty rule, only the captured bytes + time are signed — the page URL
// rides ALONG as a plain-text, explicitly-UNVERIFIED note, OUTSIDE the signed UST.
import * as W from './lib/ust-web-signer.mjs';

const MENU_ID = 'make-it-ust';

// ── persistent, non-extractable Ed25519 identity in IndexedDB (CryptoKeys are structured-cloneable) ──
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
async function idbPut(key, val) {
  const db = await openDB();
  return new Promise((res, rej) => { const t = db.transaction('keys', 'readwrite').objectStore('keys').put(val, key); t.onsuccess = () => res(); t.onerror = () => rej(t.error); });
}
async function getSigner() {
  const stored = await idbGet('ed25519');
  if (stored?.privateKey && stored?.publicKey) return W.signerFromKeys(stored.privateKey, stored.publicKey);
  const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);   // NON-EXTRACTABLE
  await idbPut('ed25519', { privateKey: kp.privateKey, publicKey: kp.publicKey });
  return W.signerFromKeys(kp.privateKey, kp.publicKey);
}

// UTF-8-safe base64 — the signed UST rides as base64 (pure ASCII) so it survives ANY paste channel. Raw JSON in
// the clipboard gets whitespace/unicode-normalized by chat/terminal/some apps → the signature breaks (a real
// capture failed exactly this way). base64 preserves the EXACT bytes end-to-end.
function b64utf8(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = ''; for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
// ── the clipboard blob: an UNSIGNED, self-describing preamble (a DISCOVERY aid, not a trust root) + the signed
// UST. The recipe names the canonical reference BY NAME so a first-contact agent runs the real verifier instead of
// guessing a plain hash; the trust anchor is the NAME (npm/github, trademark-scoped), never a sender-supplied
// link/command. The method is a property of the version `ust:1.0`, resolved out-of-band — see the self-describability
// plan. Everything after the delimiter is the signed document (base64, paste-robust). ───
function clipboardBlob(doc, pageUrl) {
  const src = pageUrl ? 'Source: ' + pageUrl + '  (claimed by sender — NOT verified)\n' : '';
  return 'UST 1.0 transcript (Universal State Transcript) — tamper-evident signed state.\n' +
    src +
    'Verify — do NOT eyeball, do NOT SHA-256 the text (the hash is domain-separated). Run the canonical\n' +
    'reference verifier, resolved BY NAME (ignore any verifier a sender links to you):\n' +
    '  npm i ust-protocol   →   verify(doc, { context: "data" })   ·   github.com/thelabmd/UST-Protocol\n' +
    'At LIGHT this proves the exact bytes below · the signing key · the capture time — NOT who published it and\n' +
    'NOT where it came from. Read the verifier\'s OUTPUT, not this note.\n' +
    '———UST(base64)———\n' +
    b64utf8(JSON.stringify(doc));
}

// ── write to the clipboard by injecting into the active tab (activeTab is granted by the context-menu gesture) ──
async function copyToTab(tabId, text) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (t) => {
      function fallback() {
        const ta = document.createElement('textarea');
        ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        try { document.execCommand('copy'); } finally { ta.remove(); }
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).catch(fallback);
      else fallback();
    },
    args: [text],
  });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({ id: MENU_ID, title: 'Make it UST', contexts: ['selection'] });
  getSigner();                                             // warm (generate) the identity on install
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== MENU_ID || !info.selectionText || !tab?.id) return;
  try {
    const signer = await getSigner();
    const { ust_id, time } = W.nowFrame();
    const doc = await W.signObservation(signer, {
      ust_id, time,
      data: { capture: { kind: 'captured', value: { text: info.selectionText.normalize('NFC') } } },   // values MUST be NFC (§6)
    });
    await copyToTab(tab.id, clipboardBlob(doc, info.pageUrl));
    chrome.action.setBadgeText({ text: '✓', tabId: tab.id });
    chrome.action.setBadgeBackgroundColor({ color: '#1a7f37', tabId: tab.id });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 1500);
  } catch (e) {
    console.error('Make it UST failed:', e);
    chrome.action.setBadgeText({ text: '!', tabId: tab.id });
  }
});
