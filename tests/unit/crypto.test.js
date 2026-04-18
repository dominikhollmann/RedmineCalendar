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
