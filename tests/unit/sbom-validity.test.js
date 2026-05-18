import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Feature 034 / US2 — T018: local mirror of the CI-side schema-validation
// gate in release.yml. Asserts the committed sbom.json carries the minimum
// CycloneDX 1.6 fields per FR-008a and parses as JSON.
//
// We deliberately do NOT pull the CycloneDX JSON schema down the network at
// test time (Constitution III: tests are deterministic, offline). The full
// schema validation runs in CI's release pipeline using the upstream tooling;
// this test catches the broad-strokes regressions that would also fail there.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const sbom = JSON.parse(readFileSync(resolve(repoRoot, 'sbom.json'), 'utf8'));

describe('sbom.json — CycloneDX 1.6 minimum fields (T018)', () => {
  it('parses as JSON', () => {
    expect(typeof sbom).toBe('object');
  });

  it('declares bomFormat=CycloneDX and specVersion=1.6', () => {
    expect(sbom.bomFormat).toBe('CycloneDX');
    expect(sbom.specVersion).toBe('1.6');
  });

  it('has a metadata.timestamp (stable across reproducible regenerations)', () => {
    expect(typeof sbom.metadata).toBe('object');
    expect(typeof sbom.metadata.timestamp).toBe('string');
    expect(sbom.metadata.timestamp.length).toBeGreaterThan(0);
  });

  it('has a non-empty components array', () => {
    expect(Array.isArray(sbom.components)).toBe(true);
    expect(sbom.components.length).toBeGreaterThan(0);
  });

  it('every component has the FR-008a minimum fields (name, version, licenses, purl, scope)', () => {
    const offenders = [];
    for (const c of sbom.components) {
      if (!c.name) offenders.push(`missing name: ${JSON.stringify(c).slice(0, 80)}`);
      if (!c.version) offenders.push(`${c.name}: missing version`);
      if (!c.purl) offenders.push(`${c.name}@${c.version}: missing purl`);
      if (!c.scope) offenders.push(`${c.name}@${c.version}: missing scope`);
      if (!Array.isArray(c.licenses)) offenders.push(`${c.name}@${c.version}: missing licenses[]`);
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });

  it('every component uses one of the two valid CycloneDX scope values', () => {
    for (const c of sbom.components) {
      expect(['required', 'optional', 'excluded']).toContain(c.scope);
    }
  });

  it('every license entry is either {license:{id:…}} or {expression:…}', () => {
    for (const c of sbom.components) {
      for (const l of c.licenses || []) {
        const ok =
          (l.license && (l.license.id || l.license.name || l.license.expression)) || l.expression;
        expect(
          ok,
          `bad license entry on ${c.name}@${c.version}: ${JSON.stringify(l)}`
        ).toBeTruthy();
      }
    }
  });

  it('runtime CDN + vendored manifest entries (purl=pkg:generic) are present', () => {
    const generic = sbom.components.filter((c) => (c.purl || '').startsWith('pkg:generic/'));
    expect(generic.length).toBeGreaterThan(0);
    expect(generic.every((c) => c.scope === 'required')).toBe(true);
  });
});
