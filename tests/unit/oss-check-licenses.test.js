import { describe, it, expect } from 'vitest';
import {
  checkLicenses,
  checkComponent,
  expressionAllowed,
} from '../../scripts/oss-check-licenses.mjs';
import spdxParse from 'spdx-expression-parse';

const defaultAllowed = ['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'ISC'];

function ctx(allowedList, exemptionsList = []) {
  return {
    allowed: new Set(allowedList),
    exemptions: new Map(exemptionsList.map((e) => [`${e.name}@${e.version}`, e])),
  };
}

function comp(overrides) {
  return {
    type: 'library',
    name: 'pkg',
    version: '1.0.0',
    purl: 'pkg:npm/pkg@1.0.0',
    scope: 'required',
    licenses: [{ license: { id: 'MIT' } }],
    ...overrides,
  };
}

describe('expressionAllowed (T023)', () => {
  it('passes a single allowlisted leaf', () => {
    expect(expressionAllowed(spdxParse('MIT'), new Set(['MIT']))).toBe(true);
  });
  it('fails a single non-allowlisted leaf', () => {
    expect(expressionAllowed(spdxParse('GPL-3.0-only'), new Set(['MIT']))).toBe(false);
  });
  it('OR passes when ANY child is allowlisted (FR-017)', () => {
    expect(expressionAllowed(spdxParse('MIT OR GPL-3.0-only'), new Set(['MIT']))).toBe(true);
  });
  it('OR fails when no child is allowlisted', () => {
    expect(expressionAllowed(spdxParse('GPL-3.0-only OR AGPL-3.0-only'), new Set(['MIT']))).toBe(
      false
    );
  });
  it('AND requires ALL children allowlisted', () => {
    expect(expressionAllowed(spdxParse('MIT AND Apache-2.0'), new Set(['MIT', 'Apache-2.0']))).toBe(
      true
    );
  });
  it('AND fails when one term is non-allowlisted', () => {
    expect(expressionAllowed(spdxParse('MIT AND GPL-3.0-only'), new Set(['MIT']))).toBe(false);
  });
});

describe('checkComponent (T023)', () => {
  it('(a) single allowlisted license (MIT) passes', () => {
    const r = checkComponent(comp(), ctx(['MIT']));
    expect(r.ok).toBe(true);
  });

  it('(a) single allowlisted license (Apache-2.0) passes', () => {
    const r = checkComponent(
      comp({ licenses: [{ license: { id: 'Apache-2.0' } }] }),
      ctx(defaultAllowed)
    );
    expect(r.ok).toBe(true);
  });

  it('(b) single non-allowlisted license (GPL-3.0-only) fails', () => {
    const r = checkComponent(
      comp({ licenses: [{ license: { id: 'GPL-3.0-only' } }] }),
      ctx(defaultAllowed)
    );
    expect(r.ok).toBe(false);
    expect(r.license).toBe('GPL-3.0-only');
  });

  it('(c) OR expression passes if any term is allowlisted (FR-017)', () => {
    const r = checkComponent(
      comp({ licenses: [{ expression: 'GPL-3.0-only OR MIT' }] }),
      ctx(defaultAllowed)
    );
    expect(r.ok).toBe(true);
  });

  it('(d) AND expression fails if any term is non-allowlisted', () => {
    const r = checkComponent(
      comp({ licenses: [{ expression: 'MIT AND GPL-3.0-only' }] }),
      ctx(defaultAllowed)
    );
    expect(r.ok).toBe(false);
  });

  it('(e) missing license fails (FR-015)', () => {
    const r = checkComponent(comp({ licenses: [] }), ctx(defaultAllowed));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/no license metadata/);
  });

  it('(f) NOASSERTION fails (FR-015)', () => {
    const r = checkComponent(
      comp({ licenses: [{ license: { name: 'NOASSERTION' } }] }),
      ctx(defaultAllowed)
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('NOASSERTION');
  });

  it('(g) exact name@version exemption passes (FR-016)', () => {
    const r = checkComponent(
      comp({ name: 'foo', version: '1.0.0', licenses: [{ license: { id: 'GPL-3.0-only' } }] }),
      ctx(defaultAllowed, [
        {
          name: 'foo',
          version: '1.0.0',
          license: 'GPL-3.0-only',
          justification: 'audited 2026-05-18 by maintainer',
        },
      ])
    );
    expect(r.ok).toBe(true);
    expect(r.reason).toBe('exempted');
  });

  it('(h) exemption pinned to 1.0.0 does NOT cover 1.0.1 (FR-016)', () => {
    const r = checkComponent(
      comp({ name: 'foo', version: '1.0.1', licenses: [{ license: { id: 'GPL-3.0-only' } }] }),
      ctx(defaultAllowed, [
        {
          name: 'foo',
          version: '1.0.0',
          license: 'GPL-3.0-only',
          justification: 'audited 2026-05-18 by maintainer',
        },
      ])
    );
    expect(r.ok).toBe(false);
  });

  it('(j) vendored + CDN entries are also checked (FR-014 Q3 scope)', () => {
    const cdn = {
      type: 'library',
      name: 'evil-cdn',
      version: '0.1.0',
      purl: 'pkg:generic/evil-cdn@0.1.0?download_url=https%3A%2F%2Fexample.org%2Fx.js',
      scope: 'required',
      licenses: [{ license: { id: 'GPL-3.0-only' } }],
      properties: [{ name: 'oss-manifest:supplier', value: 'cdn' }],
    };
    const r = checkComponent(cdn, ctx(defaultAllowed));
    expect(r.ok).toBe(false);
    expect(r.channel).toBe('cdn');
  });

  it('group/name composes correctly for scoped npm packages', () => {
    const r = checkComponent(
      comp({ group: '@scoped', name: 'thing', licenses: [{ license: { id: 'MIT' } }] }),
      ctx(['MIT'])
    );
    expect(r.ok).toBe(true);
  });
});

describe('checkLicenses — full SBoM pass (T023)', () => {
  it('returns an empty failure list for an SBoM with only allowlisted licenses', () => {
    const sbom = {
      components: [
        comp({ name: 'a', licenses: [{ license: { id: 'MIT' } }] }),
        comp({ name: 'b', licenses: [{ license: { id: 'Apache-2.0' } }] }),
      ],
    };
    const allowlist = { allowedLicenses: defaultAllowed, exemptions: [] };
    expect(checkLicenses(sbom, allowlist)).toEqual([]);
  });

  it('returns failures for each disallowed component', () => {
    const sbom = {
      components: [
        comp({ name: 'good', licenses: [{ license: { id: 'MIT' } }] }),
        comp({ name: 'bad', licenses: [{ license: { id: 'GPL-3.0-only' } }] }),
        comp({ name: 'also-bad', licenses: [] }),
      ],
    };
    const allowlist = { allowedLicenses: defaultAllowed, exemptions: [] };
    const fails = checkLicenses(sbom, allowlist);
    expect(fails.map((f) => f.name).sort()).toEqual(['also-bad', 'bad']);
  });
});
