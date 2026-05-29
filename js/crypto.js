const DB_NAME = 'redmine_calendar_keystore';
const STORE_NAME = 'keys';
const KEY_ID = 'encryption_key';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE_NAME);
    req.onsuccess = () => resolve(req.result);
    /* c8 ignore next — defensive IndexedDB error path; fake-indexeddb mock never errors in tests. */
    req.onerror = () => reject(req.error);
  });
}

async function getOrCreateKey() {
  const db = await openDB();

  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(KEY_ID);
    req.onsuccess = () => resolve(req.result ?? null);
    /* c8 ignore next — defensive IndexedDB error path; fake-indexeddb mock never errors in tests. */
    req.onerror = () => reject(req.error);
  });

  if (existing) return existing;

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, [
    'encrypt',
    'decrypt',
  ]);

  await /** @type {Promise<void>} */ (
    new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).put(key, KEY_ID);
      req.onsuccess = () => /** @type {(v?: any) => void} */ (resolve)();
      /* c8 ignore next — defensive IndexedDB error path; fake-indexeddb mock never errors in tests. */
      req.onerror = () => reject(req.error);
    })
  );

  return key;
}

function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(str) {
  const bin = atob(str);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf;
}

/**
 * Encrypt a plaintext string with AES-GCM-256 using the per-browser IndexedDB key.
 * @param {string} plaintext
 * @returns {Promise<{iv: string, ciphertext: string}>} Base64 IV + ciphertext envelope
 */
export async function encrypt(plaintext) {
  const key = await getOrCreateKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return { iv: toBase64(iv), ciphertext: toBase64(ciphertext) };
}

/**
 * Decrypt an envelope previously produced by `encrypt()`.
 * @param {{iv: string, ciphertext: string}} envelope
 * @returns {Promise<string>} The original plaintext.
 * @throws if the IndexedDB key is missing or the ciphertext is tampered.
 */
export async function decrypt(envelope) {
  const key = await getOrCreateKey();
  const iv = fromBase64(envelope.iv);
  const ciphertext = fromBase64(envelope.ciphertext);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}
