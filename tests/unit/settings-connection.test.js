// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import {
  mapError,
  nextState,
  isFooterEnabled,
  pillKey,
  bindConnection,
} from '../../js/settings-connection.js';

describe('settings-connection — mapError', () => {
  it('maps 401/403 to invalid', () => {
    expect(mapError({ status: 401 })).toBe('invalid');
    expect(mapError({ status: 403 })).toBe('invalid');
  });

  it('maps status 0 / TypeError to network', () => {
    expect(mapError({ status: 0 })).toBe('network');
    expect(mapError({ name: 'TypeError' })).toBe('network');
    expect(mapError(undefined)).toBe('network');
  });

  it('maps 5xx and other statuses to server', () => {
    expect(mapError({ status: 500 })).toBe('server');
    expect(mapError({ status: 503 })).toBe('server');
    expect(mapError({ status: 418 })).toBe('server');
  });
});

describe('settings-connection — nextState', () => {
  it('connect from disconnected/error → checking', () => {
    expect(nextState('disconnected', 'connect')).toEqual({ state: 'checking', error: null });
    expect(nextState('error', 'connect')).toEqual({ state: 'checking', error: null });
  });

  it('connect is ignored mid-check / when connected', () => {
    expect(nextState('checking', 'connect').state).toBe('checking');
    expect(nextState('connected', 'connect').state).toBe('connected');
  });

  it('resolved → connected, rejected → error with reason', () => {
    expect(nextState('checking', 'resolved')).toEqual({ state: 'connected', error: null });
    expect(nextState('checking', 'rejected', { reason: 'invalid' })).toEqual({
      state: 'error',
      error: 'invalid',
    });
    expect(nextState('checking', 'rejected').error).toBe('server');
  });

  it('editCreds / switchMode → disconnected', () => {
    expect(nextState('connected', 'editCreds')).toEqual({ state: 'disconnected', error: null });
    expect(nextState('connected', 'switchMode')).toEqual({ state: 'disconnected', error: null });
  });

  it('connect while connected preserves state + carries ctx.reason', () => {
    expect(nextState('connected', 'connect', { reason: 'invalid' })).toEqual({
      state: 'connected',
      error: 'invalid',
    });
  });

  it('unknown event falls through to the default branch', () => {
    expect(nextState('connected', 'bogus')).toEqual({ state: 'connected', error: null });
  });
});

describe('settings-connection — isFooterEnabled / pillKey', () => {
  it('footer enabled only when connected', () => {
    expect(isFooterEnabled('connected')).toBe(true);
    expect(isFooterEnabled('disconnected')).toBe(false);
    expect(isFooterEnabled('checking')).toBe(false);
    expect(isFooterEnabled('error')).toBe(false);
  });

  it('pillKey maps state/reason to i18n keys', () => {
    expect(pillKey('disconnected', null)).toBe('settings.conn.disconnected');
    expect(pillKey('checking', null)).toBe('settings.conn.checking');
    expect(pillKey('connected', null)).toBe('settings.conn.connected');
    expect(pillKey('error', 'network')).toBe('settings.conn.error.network');
    expect(pillKey('error', null)).toBe('settings.conn.error.server');
  });
});

describe('settings-connection — bindConnection (DOM binder)', () => {
  function setup() {
    const pill = document.createElement('span');
    const button = document.createElement('button');
    const hint = document.createElement('p');
    hint.classList.add('hidden');
    const announce = vi.fn();
    const onChange = vi.fn();
    return { pill, button, hint, announce, onChange };
  }

  it('runs the happy path: checking → connected, footer enabled', async () => {
    const els = setup();
    let resolveCheck;
    const checkPromise = new Promise((r) => (resolveCheck = r));
    const ctrl = bindConnection({
      ...els,
      checkConnection: () => checkPromise,
      persistCredentials: () => Promise.resolve(),
    });
    expect(ctrl.getState()).toBe('disconnected');
    const p = ctrl.connect();
    // mid-check: button busy + disabled
    expect(els.button.disabled).toBe(true);
    expect(els.button.getAttribute('aria-busy')).toBe('true');
    expect(els.pill.dataset.state).toBe('checking');
    resolveCheck({ id: 1 });
    await p;
    expect(ctrl.getState()).toBe('connected');
    expect(els.button.disabled).toBe(false);
    expect(els.pill.dataset.state).toBe('connected');
    expect(els.onChange).toHaveBeenCalledWith('connected');
  });

  it('maps a rejected check to an error state with reason', async () => {
    const els = setup();
    const ctrl = bindConnection({
      ...els,
      checkConnection: () => Promise.reject({ status: 401 }),
      persistCredentials: () => Promise.resolve(),
    });
    await ctrl.connect();
    expect(ctrl.getState()).toBe('error');
    expect(els.pill.dataset.state).toBe('error');
    expect(els.announce).toHaveBeenCalled();
  });

  it('ignores connect() while already checking', async () => {
    const els = setup();
    const ctrl = bindConnection({
      ...els,
      checkConnection: () => new Promise(() => {}),
      persistCredentials: () => Promise.resolve(),
    });
    ctrl.connect();
    expect(ctrl.getState()).toBe('checking');
    ctrl.connect(); // no-op
    expect(ctrl.getState()).toBe('checking');
  });

  it('invalidate(editCreds) from connected → disconnected with reconnect hint', async () => {
    const els = setup();
    const ctrl = bindConnection({
      ...els,
      checkConnection: () => Promise.resolve({ id: 1 }),
      persistCredentials: () => Promise.resolve(),
    });
    await ctrl.connect();
    ctrl.invalidate('editCreds');
    expect(ctrl.getState()).toBe('disconnected');
    expect(els.hint.classList.contains('hidden')).toBe(false);
  });

  it('invalidate is a no-op while disconnected', () => {
    const els = setup();
    const ctrl = bindConnection({
      ...els,
      checkConnection: () => Promise.resolve(),
      persistCredentials: () => Promise.resolve(),
    });
    ctrl.invalidate('switchMode');
    expect(ctrl.getState()).toBe('disconnected');
  });

  it('invalidate(switchMode) from connected → disconnected without showing the hint', async () => {
    const els = setup();
    const ctrl = bindConnection({
      ...els,
      checkConnection: () => Promise.resolve({ id: 1 }),
      persistCredentials: () => Promise.resolve(),
    });
    await ctrl.connect();
    els.hint.classList.add('hidden');
    ctrl.invalidate('switchMode');
    expect(ctrl.getState()).toBe('disconnected');
    expect(els.hint.classList.contains('hidden')).toBe(true);
  });

  it('tolerates missing pill/button/hint and absent announce/onChange', async () => {
    const ctrl = bindConnection({
      pill: null,
      button: null,
      hint: null,
      checkConnection: () => Promise.reject({ status: 500 }),
      persistCredentials: () => Promise.resolve(),
    });
    await ctrl.connect();
    expect(ctrl.getState()).toBe('error');
  });
});
