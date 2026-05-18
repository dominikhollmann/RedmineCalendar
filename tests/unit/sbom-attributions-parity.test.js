import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Feature 034 / US2 — T019: runtime enforcement of data-model.md cross-file
// invariants 1–4. Every runtime entry in attributions.json MUST appear in
// sbom.json as a scope=required component with matching license + homepage.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const sbom = JSON.parse(readFileSync(resolve(repoRoot, 'sbom.json'), 'utf8'));
const attributions = JSON.parse(readFileSync(resolve(repoRoot, 'attributions.json'), 'utf8'));

function componentName(c) {
  return c.group ? `${c.group}/${c.name}` : c.name;
}

function componentLicense(c) {
  const l = (c.licenses || [])[0];
  if (!l) return 'UNKNOWN';
  if (l.expression) return l.expression;
  if (l.license && l.license.id) {
    return l.license.id === 'NOASSERTION' ? 'UNKNOWN' : l.license.id;
  }
  if (l.license && l.license.name) return l.license.name;
  return 'UNKNOWN';
}

function componentHomepage(c) {
  const refs = c.externalReferences || [];
  const website = refs.find((r) => r.type === 'website');
  if (website) return website.url;
  const vcs = refs.find((r) => r.type === 'vcs');
  if (vcs) return vcs.url;
  const dist = refs.find((r) => r.type === 'distribution');
  return dist ? dist.url : null;
}

describe('cross-file invariants — sbom.json ↔ attributions.json (T019)', () => {
  it('invariant 4: generatedAt and metadata.timestamp are identical', () => {
    expect(attributions.generatedAt).toBe(sbom.metadata.timestamp);
  });

  it('every attributions entry has a matching scope=required component in sbom', () => {
    const sbomByKey = new Map();
    for (const c of sbom.components) {
      if (c.scope !== 'required' || c.type !== 'library') continue;
      sbomByKey.set(`${componentName(c)}@${c.version}`, c);
    }
    for (const e of attributions.entries) {
      const key = `${e.name}@${e.version}`;
      const c = sbomByKey.get(key);
      expect(c, `sbom must have scope=required component for ${key}`).toBeTruthy();
      expect(componentLicense(c)).toBe(e.license);
      expect(componentHomepage(c)).toBe(e.homepageUrl);
    }
  });

  it('every scope=required library in sbom has a matching attributions entry', () => {
    const attrByKey = new Map();
    for (const e of attributions.entries) attrByKey.set(`${e.name}@${e.version}`, e);
    const missing = [];
    for (const c of sbom.components) {
      if (c.scope !== 'required' || c.type !== 'library') continue;
      const key = `${componentName(c)}@${c.version}`;
      if (!attrByKey.has(key)) missing.push(key);
    }
    expect(missing, `attributions.json missing entries for: ${missing.join(', ')}`).toEqual([]);
  });
});
