import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validate } from '../../scripts/oss-lib/validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

const allowlist = JSON.parse(readFileSync(resolve(repoRoot, 'oss-allowlist.json'), 'utf8'));
const schema = JSON.parse(
  readFileSync(
    resolve(repoRoot, 'specs/034-sbom-and-attributions/contracts/oss-allowlist.schema.json'),
    'utf8'
  )
);

describe('oss-allowlist.json — schema conformance (T024)', () => {
  it('passes the contracts/oss-allowlist.schema.json validator', () => {
    const errors = validate(allowlist, schema);
    expect(errors).toEqual([]);
  });

  it('has at least one allowed license', () => {
    expect(Array.isArray(allowlist.allowedLicenses)).toBe(true);
    expect(allowlist.allowedLicenses.length).toBeGreaterThan(0);
  });

  it('exemptions array is present (empty is OK)', () => {
    expect(Array.isArray(allowlist.exemptions)).toBe(true);
  });

  it('rejects an exemption with too-short justification (minLength: 20)', () => {
    const bad = {
      allowedLicenses: ['MIT'],
      exemptions: [
        {
          name: 'pkg',
          version: '1.0.0',
          license: 'GPL-3.0',
          justification: 'short',
        },
      ],
    };
    const errors = validate(bad, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toMatch(/justification|minLength/);
  });

  it('rejects an exemption missing the version field', () => {
    const bad = {
      allowedLicenses: ['MIT'],
      exemptions: [
        {
          name: 'pkg',
          license: 'GPL-3.0',
          justification: 'Audited 2026-05-18: smoke-test exemption for the unit test suite.',
        },
      ],
    };
    const errors = validate(bad, schema);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.join(' ')).toMatch(/version/);
  });
});
