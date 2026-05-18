import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validate } from '../../scripts/oss-lib/validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

const manifest = JSON.parse(readFileSync(resolve(repoRoot, 'oss-manifest.json'), 'utf8'));
const schema = JSON.parse(
  readFileSync(
    resolve(repoRoot, 'specs/034-sbom-and-attributions/contracts/oss-manifest.schema.json'),
    'utf8'
  )
);

describe('oss-manifest.json — schema conformance (T005)', () => {
  it('passes the contracts/oss-manifest.schema.json validator', () => {
    const errors = validate(manifest, schema);
    expect(errors).toEqual([]);
  });

  it('has at least one entry', () => {
    expect(Array.isArray(manifest.entries)).toBe(true);
    expect(manifest.entries.length).toBeGreaterThan(0);
  });

  it('each entry has a non-empty stable identifier (name, version, license, supplier, scope)', () => {
    for (const e of manifest.entries) {
      expect(typeof e.name).toBe('string');
      expect(e.name.length).toBeGreaterThan(0);
      expect(typeof e.version).toBe('string');
      expect(e.version.length).toBeGreaterThan(0);
      expect(typeof e.license).toBe('string');
      expect(e.license.length).toBeGreaterThan(0);
      expect(['cdn', 'vendored']).toContain(e.supplier);
      expect(e.scope).toBe('runtime');
    }
  });

  it('cdn entries carry an https cdnUrl; vendored entries carry a non-empty vendoredPath', () => {
    for (const e of manifest.entries) {
      if (e.supplier === 'cdn') {
        expect(typeof e.cdnUrl).toBe('string');
        expect(e.cdnUrl.startsWith('https://')).toBe(true);
      }
      if (e.supplier === 'vendored') {
        expect(typeof e.vendoredPath).toBe('string');
        expect(e.vendoredPath.length).toBeGreaterThan(0);
      }
    }
  });

  it('detects a malformed manifest (missing required field)', () => {
    const bad = {
      entries: [
        {
          name: 'broken',
          version: '1.0.0',
          // license missing
          homepageUrl: 'https://example.org/',
          supplier: 'cdn',
          scope: 'runtime',
          cdnUrl: 'https://example.org/x.js',
        },
      ],
    };
    const errors = validate(bad, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toMatch(/license/);
  });

  it('detects a cdn entry missing cdnUrl (allOf/if-then branch)', () => {
    const bad = {
      entries: [
        {
          name: 'broken-cdn',
          version: '1.0.0',
          license: 'MIT',
          homepageUrl: 'https://example.org/',
          supplier: 'cdn',
          scope: 'runtime',
        },
      ],
    };
    const errors = validate(bad, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toMatch(/cdnUrl/);
  });
});
