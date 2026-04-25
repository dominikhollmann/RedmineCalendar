import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../js/crypto.js';

describe('crypto.js', () => {
  it('encrypt returns an object with iv and ciphertext', async () => {
    const result = await encrypt('hello world');
    expect(result).toHaveProperty('iv');
    expect(result).toHaveProperty('ciphertext');
    expect(typeof result.iv).toBe('string');
    expect(typeof result.ciphertext).toBe('string');
  });

  it('encrypted output differs from plaintext', async () => {
    const result = await encrypt('secret-api-key');
    expect(result.ciphertext).not.toBe('secret-api-key');
  });

  it('decrypt reverses encrypt (round-trip)', async () => {
    const plaintext = 'my-secret-value-123';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypt produces different iv each time', async () => {
    const a = await encrypt('same input');
    const b = await encrypt('same input');
    expect(a.iv).not.toBe(b.iv);
  });
});

describe('crypto.js extended', () => {
  it('round-trip with multi-line unicode text', async () => {
    const plaintext = 'Line 1: Hello\nLine 2: Welt\nLine 3: Unicode chars';
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });

  it('IV is always 12 bytes (AES-GCM standard)', async () => {
    const result = await encrypt('test');
    // IV is base64-encoded; 12 bytes => 16 base64 chars
    const ivBytes = Uint8Array.from(atob(result.iv), c => c.charCodeAt(0));
    expect(ivBytes.length).toBe(12);
  });

  it('different plaintext produces different ciphertext', async () => {
    const a = await encrypt('plaintext-alpha');
    const b = await encrypt('plaintext-bravo');
    expect(a.ciphertext).not.toBe(b.ciphertext);
  });

  it('encrypt returns object with exactly {iv, ciphertext} keys', async () => {
    const result = await encrypt('check keys');
    const keys = Object.keys(result).sort();
    expect(keys).toEqual(['ciphertext', 'iv']);
  });

  it('decrypt with corrupted ciphertext throws or returns wrong data', async () => {
    const encrypted = await encrypt('original');
    // Corrupt the ciphertext by replacing it with invalid base64 content
    const corrupted = { iv: encrypted.iv, ciphertext: 'AAAA' };
    // The XOR mock won't throw, but the result should differ from original
    const decrypted = await decrypt(corrupted);
    expect(decrypted).not.toBe('original');
  });

  it('round-trip with empty string', async () => {
    const encrypted = await encrypt('');
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe('');
  });

  it('round-trip with long text', async () => {
    const plaintext = 'A'.repeat(10000);
    const encrypted = await encrypt(plaintext);
    const decrypted = await decrypt(encrypted);
    expect(decrypted).toBe(plaintext);
  });
});
