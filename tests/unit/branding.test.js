import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { applyCorporateIdentity, isValidCi } from '../../js/branding.js';

function makeRoot() {
  const props = {};
  return {
    style: {
      setProperty: (k, v) => {
        props[k] = v;
      },
      removeProperty: (k) => {
        delete props[k];
      },
      getPropertyValue: (k) => props[k] ?? '',
    },
    _props: props,
  };
}

let warnSpy;
let _logoEl;

beforeEach(() => {
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  _logoEl = { src: '', hidden: true, removeAttribute: vi.fn() };
  globalThis.document = {
    querySelector: vi.fn((sel) => (sel === '.brand-logo' ? _logoEl : null)),
  };
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('isValidCi', () => {
  it('returns false for null / undefined / not-object', () => {
    expect(isValidCi(null)).toBe(false);
    expect(isValidCi(undefined)).toBe(false);
    expect(isValidCi('foo')).toBe(false);
  });

  it('returns false for empty object', () => {
    expect(isValidCi({})).toBe(false);
  });

  it('returns true when at least one field is valid', () => {
    expect(isValidCi({ brandPrimary: '#fff' })).toBe(true);
    expect(isValidCi({ brandAccent: '#0F6CBD' })).toBe(true);
    expect(isValidCi({ brandLogoUrl: 'https://example.com/logo.svg' })).toBe(true);
    expect(isValidCi({ brandFontFamily: 'Segoe UI, sans-serif' })).toBe(true);
  });

  it('returns false when only invalid fields are present', () => {
    expect(isValidCi({ brandPrimary: 'red' })).toBe(false);
    expect(isValidCi({ brandPrimary: '#zzz' })).toBe(false);
    expect(isValidCi({ brandLogoUrl: 'http://example.com/logo.svg' })).toBe(false);
    expect(isValidCi({ brandLogoUrl: 'javascript:alert(1)' })).toBe(false);
    expect(isValidCi({ brandFontFamily: '' })).toBe(false);
    expect(isValidCi({ brandFontFamily: '}' })).toBe(false);
  });
});

describe('applyCorporateIdentity — brandPrimary', () => {
  it('sets --ci-primary when valid', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandPrimary: '#0F6CBD' });
    expect(root._props['--ci-primary']).toBe('#0F6CBD');
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('skips invalid hex (red); warns ONCE', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandPrimary: 'red' });
    expect(root._props['--ci-primary']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('skips invalid hex (#zzz)', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandPrimary: '#zzz' });
    expect(root._props['--ci-primary']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('clears --ci-primary when field is missing', () => {
    const root = makeRoot();
    root.style.setProperty('--ci-primary', '#stale');
    applyCorporateIdentity(root, {});
    expect(root._props['--ci-primary']).toBeUndefined();
  });
});

describe('applyCorporateIdentity — brandAccent', () => {
  it('sets --ci-accent when valid', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandAccent: '#1B5BAB' });
    expect(root._props['--ci-accent']).toBe('#1B5BAB');
  });

  it('warns on invalid', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandAccent: '12345' });
    expect(root._props['--ci-accent']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('applyCorporateIdentity — brandFontFamily', () => {
  it('sets --ci-font-family when valid', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandFontFamily: '"Acme Sans", Segoe UI, system-ui' });
    expect(root._props['--ci-font-family']).toBe('"Acme Sans", Segoe UI, system-ui');
  });

  it('rejects empty', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandFontFamily: '' });
    expect(root._props['--ci-font-family']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects font name containing CSS-escape characters (})', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandFontFamily: 'foo} body{x:y' });
    expect(root._props['--ci-font-family']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects font name longer than 200 chars', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandFontFamily: 'a'.repeat(201) });
    expect(root._props['--ci-font-family']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe('applyCorporateIdentity — brandLogoUrl', () => {
  it('shows the logo with a valid https URL', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandLogoUrl: 'https://example.com/logo.svg' });
    expect(_logoEl.src).toBe('https://example.com/logo.svg');
    expect(_logoEl.hidden).toBe(false);
  });

  it('hides the logo for http://', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandLogoUrl: 'http://example.com/logo.svg' });
    expect(_logoEl.hidden).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('hides the logo for javascript: URLs', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandLogoUrl: 'javascript:alert(1)' });
    expect(_logoEl.hidden).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('hides the logo for data: URLs', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandLogoUrl: 'data:image/png;base64,xyz' });
    expect(_logoEl.hidden).toBe(true);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('hides the logo when field is missing', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, {});
    expect(_logoEl.hidden).toBe(true);
  });
});

describe('applyCorporateIdentity — idempotency + mixed', () => {
  it('mixed valid + invalid: only the valid one is applied; one warning', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, { brandPrimary: '#0F6CBD', brandAccent: 'NOT_A_HEX' });
    expect(root._props['--ci-primary']).toBe('#0F6CBD');
    expect(root._props['--ci-accent']).toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('applying the same ci twice yields the same DOM state', () => {
    const root = makeRoot();
    const ci = { brandPrimary: '#0F6CBD', brandLogoUrl: 'https://example.com/l.svg' };
    applyCorporateIdentity(root, ci);
    const snapshot1 = { ...root._props, logoSrc: _logoEl.src, logoHidden: _logoEl.hidden };
    applyCorporateIdentity(root, ci);
    const snapshot2 = { ...root._props, logoSrc: _logoEl.src, logoHidden: _logoEl.hidden };
    expect(snapshot2).toEqual(snapshot1);
  });

  it('applying an empty object clears any previously-set ci', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, {
      brandPrimary: '#0F6CBD',
      brandLogoUrl: 'https://example.com/l.svg',
    });
    expect(_logoEl.hidden).toBe(false);
    applyCorporateIdentity(root, {});
    expect(root._props['--ci-primary']).toBeUndefined();
    expect(_logoEl.hidden).toBe(true);
  });

  it('null ci is treated as empty (defensive)', () => {
    const root = makeRoot();
    applyCorporateIdentity(root, null);
    expect(root._props['--ci-primary']).toBeUndefined();
  });

  it('null root is a no-op', () => {
    expect(() => applyCorporateIdentity(null, { brandPrimary: '#fff' })).not.toThrow();
  });
});
