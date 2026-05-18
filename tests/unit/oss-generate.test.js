import { describe, it, expect } from 'vitest';
import {
  buildOutputs,
  manifestEntryToComponent,
  componentToLicenseString,
} from '../../scripts/oss-generate.mjs';

// Synthetic CycloneDX-shaped fixture stubbing what @cyclonedx/cyclonedx-npm
// emits. Captures the variants we care about: prod, dev, dual-license, missing
// license, same-name-two-versions, scoped (group) package.
const fixtureBom = () => ({
  $schema: 'http://cyclonedx.org/schema/bom-1.6.schema.json',
  bomFormat: 'CycloneDX',
  specVersion: '1.6',
  version: 1,
  metadata: {
    component: {
      type: 'application',
      name: 'redmine-calendar',
      version: '1.0.0',
      'bom-ref': 'redmine-calendar@1.0.0',
    },
  },
  components: [
    {
      type: 'library',
      name: 'prod-mit',
      version: '1.0.0',
      'bom-ref': 'redmine-calendar@1.0.0|prod-mit@1.0.0',
      purl: 'pkg:npm/prod-mit@1.0.0',
      licenses: [{ license: { id: 'MIT' } }],
      externalReferences: [{ type: 'website', url: 'https://prod-mit.example/' }],
    },
    {
      type: 'library',
      name: 'dev-mit',
      version: '2.0.0',
      'bom-ref': 'redmine-calendar@1.0.0|dev-mit@2.0.0',
      purl: 'pkg:npm/dev-mit@2.0.0',
      licenses: [{ license: { id: 'MIT' } }],
      properties: [{ name: 'cdx:npm:package:development', value: 'true' }],
    },
    {
      type: 'library',
      name: 'dual-license',
      version: '3.0.0',
      'bom-ref': 'redmine-calendar@1.0.0|dual-license@3.0.0',
      purl: 'pkg:npm/dual-license@3.0.0',
      licenses: [{ expression: 'MIT OR Apache-2.0' }],
    },
    {
      type: 'library',
      name: 'no-license',
      version: '0.0.1',
      'bom-ref': 'redmine-calendar@1.0.0|no-license@0.0.1',
      purl: 'pkg:npm/no-license@0.0.1',
    },
    {
      type: 'library',
      name: 'multi-version',
      version: '1.0.0',
      'bom-ref': 'redmine-calendar@1.0.0|multi-version@1.0.0',
      purl: 'pkg:npm/multi-version@1.0.0',
      licenses: [{ license: { id: 'BSD-3-Clause' } }],
    },
    {
      type: 'library',
      name: 'multi-version',
      version: '2.0.0',
      'bom-ref': 'redmine-calendar@1.0.0|multi-version@2.0.0',
      purl: 'pkg:npm/multi-version@2.0.0',
      licenses: [{ license: { id: 'BSD-3-Clause' } }],
    },
    {
      type: 'library',
      name: 'eslint',
      group: '@scoped',
      version: '1.0.0',
      'bom-ref': 'redmine-calendar@1.0.0|@scoped/eslint@1.0.0',
      purl: 'pkg:npm/%40scoped/eslint@1.0.0',
      licenses: [{ license: { id: 'MIT' } }],
      externalReferences: [{ type: 'website', url: 'https://scoped.example/' }],
    },
  ],
});

const fixtureManifest = () => ({
  entries: [
    {
      name: 'fullcalendar',
      version: '6.1.0',
      license: 'MIT',
      copyright: 'Copyright (c) Adam Shaw',
      homepageUrl: 'https://fullcalendar.io/',
      supplier: 'cdn',
      scope: 'runtime',
      cdnUrl: 'https://cdn.jsdelivr.net/npm/fullcalendar@6.1.0/index.global.min.js',
    },
    {
      name: 'spec-kit',
      version: '0.8.8',
      license: 'MIT',
      copyright: 'Copyright (c) GitHub, Inc.',
      homepageUrl: 'https://github.com/github/spec-kit',
      supplier: 'vendored',
      scope: 'runtime',
      vendoredPath: '.specify/',
    },
  ],
});

describe('oss-generate — buildOutputs (T006)', () => {
  it('marks dev components scope=optional, runtime components scope=required', () => {
    const { sbom } = buildOutputs(fixtureBom(), { entries: [] }, '1.0.0');
    const byName = (n) => sbom.components.find((c) => c.name === n && c.group === undefined);
    expect(byName('prod-mit').scope).toBe('required');
    expect(byName('dev-mit').scope).toBe('optional');
  });

  it('appends manifest entries with the right purl shape', () => {
    const { sbom } = buildOutputs(fixtureBom(), fixtureManifest(), '1.0.0');
    const fc = sbom.components.find((c) => c.name === 'fullcalendar');
    expect(fc).toBeTruthy();
    expect(fc.purl.startsWith('pkg:generic/fullcalendar@6.1.0?download_url=')).toBe(true);
    expect(fc.scope).toBe('required');
    expect(fc.externalReferences.some((r) => r.type === 'distribution')).toBe(true);
    const sk = sbom.components.find((c) => c.name === 'spec-kit');
    expect(sk).toBeTruthy();
    expect(sk.purl.startsWith('pkg:generic/spec-kit@0.8.8?vcs_url=')).toBe(true);
    expect(sk.externalReferences.some((r) => r.type === 'vcs')).toBe(true);
    expect(sk.externalReferences.some((r) => r.type === 'other')).toBe(true);
  });

  it('preserves dual-license expressions verbatim in the SBoM', () => {
    const { sbom } = buildOutputs(fixtureBom(), { entries: [] }, '1.0.0');
    const dl = sbom.components.find((c) => c.name === 'dual-license');
    expect(dl.licenses[0].expression).toBe('MIT OR Apache-2.0');
  });

  it('emits same-name-two-versions as two distinct components', () => {
    const { sbom } = buildOutputs(fixtureBom(), { entries: [] }, '1.0.0');
    const multi = sbom.components.filter((c) => c.name === 'multi-version');
    expect(multi.length).toBe(2);
    expect(new Set(multi.map((c) => c.version))).toEqual(new Set(['1.0.0', '2.0.0']));
    expect(new Set(multi.map((c) => c.purl)).size).toBe(2);
  });

  it('attributions.json contains only runtime entries', () => {
    const { attributions } = buildOutputs(fixtureBom(), fixtureManifest(), '1.0.0');
    const names = attributions.entries.map((e) => e.name);
    expect(names).toContain('prod-mit');
    expect(names).not.toContain('dev-mit');
    expect(names).toContain('fullcalendar');
    expect(names).toContain('spec-kit');
  });

  it('attributions entries are sorted alphabetically (case-insensitive) then by version', () => {
    const { attributions } = buildOutputs(fixtureBom(), fixtureManifest(), '1.0.0');
    const names = attributions.entries.map((e) => e.name.toLowerCase());
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
    // Same-name multi-version ordering not directly testable here because
    // both versions are dev-marked in the fixture; add a targeted test:
    const fixture = fixtureBom();
    // Force both multi-version entries to runtime by stripping the dev prop
    // (none had it in the first place — they're already runtime).
    const { attributions: a2 } = buildOutputs(fixture, { entries: [] }, '1.0.0');
    const multi = a2.entries.filter((e) => e.name === 'multi-version');
    expect(multi.map((e) => e.version)).toEqual(['1.0.0', '2.0.0']);
  });

  it('generatedAt is identical between sbom and attributions (invariant 4)', () => {
    const { sbom, attributions } = buildOutputs(fixtureBom(), fixtureManifest(), '1.0.0');
    expect(attributions.generatedAt).toBe(sbom.metadata.timestamp);
  });

  it('cross-file invariant: every required component in sbom matches attributions on license + homepage', () => {
    const { sbom, attributions } = buildOutputs(fixtureBom(), fixtureManifest(), '1.0.0');
    const sbomByKey = new Map();
    for (const c of sbom.components) {
      if (c.scope !== 'required' || c.type !== 'library') continue;
      const name = c.group ? `${c.group}/${c.name}` : c.name;
      sbomByKey.set(`${name}@${c.version}`, c);
    }
    for (const e of attributions.entries) {
      const c = sbomByKey.get(`${e.name}@${e.version}`);
      expect(c, `sbom must have ${e.name}@${e.version}`).toBeTruthy();
      const lic = componentToLicenseString(c);
      expect(e.license).toBe(lic);
      // homepage match (compare via externalReferences extraction)
      const refs = c.externalReferences || [];
      const website = refs.find((r) => r.type === 'website');
      expect(e.homepageUrl).toBe(website ? website.url : e.homepageUrl);
    }
  });

  it('UNKNOWN license maps to NOASSERTION in sbom and UNKNOWN in attributions', () => {
    const entry = {
      name: 'unknown-lib',
      version: '0.0.1',
      license: 'UNKNOWN',
      copyright: null,
      homepageUrl: 'https://example.org/',
      supplier: 'cdn',
      scope: 'runtime',
      cdnUrl: 'https://example.org/x.js',
    };
    const comp = manifestEntryToComponent(entry);
    // CycloneDX 1.6: license.id must be a real SPDX id, so the NOASSERTION
    // sentinel goes in license.name instead.
    expect(comp.licenses[0].license.name).toBe('NOASSERTION');
    const fixture = { entries: [entry] };
    const { attributions } = buildOutputs({ components: [], metadata: {} }, fixture, '1.0.0');
    const a = attributions.entries.find((e) => e.name === 'unknown-lib');
    expect(a.license).toBe('UNKNOWN');
  });

  it('appVersion is honoured', () => {
    const { attributions } = buildOutputs(fixtureBom(), { entries: [] }, '1.99.42');
    expect(attributions.appVersion).toBe('1.99.42');
  });

  it('output is byte-stable across two invocations on identical inputs', () => {
    const a = buildOutputs(fixtureBom(), fixtureManifest(), '1.0.0');
    const b = buildOutputs(fixtureBom(), fixtureManifest(), '1.0.0');
    expect(JSON.stringify(a.sbom)).toBe(JSON.stringify(b.sbom));
    expect(JSON.stringify(a.attributions)).toBe(JSON.stringify(b.attributions));
  });

  it('scoped-package name appears with group prefix in attributions', () => {
    const { attributions } = buildOutputs(fixtureBom(), { entries: [] }, '1.0.0');
    expect(attributions.entries.some((e) => e.name === '@scoped/eslint')).toBe(true);
  });
});
