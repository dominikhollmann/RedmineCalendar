// ── Redmine connection state machine (Feature 054) ────────────────
// DOM-light core (mapError / nextState / isFooterEnabled) is pure and
// unit-tested in tests/unit/settings-connection.test.js. The DOM binder
// (bindConnection) renders the status pill, drives the Verbinden button,
// runs the real getCurrentUser() check, and reports state changes to the
// orchestrator. See contracts/connection-state-machine.md.

import { t } from './i18n.js';

/** @typedef {'disconnected'|'checking'|'connected'|'error'} ConnState */
/** @typedef {null|'invalid'|'network'|'server'} ConnError */

/**
 * Map a RedmineError-like object to a connection-error reason.
 *  - 401/403 → invalid credentials
 *  - status 0 / TypeError / fetch failure → network
 *  - 5xx / anything else → server
 * @param {{status?: number, name?: string}} [err]
 * @returns {ConnError}
 */
export function mapError(err) {
  const status = err?.status ?? 0;
  if (status === 401 || status === 403) return 'invalid';
  if (status === 0 || err?.name === 'TypeError') return 'network';
  return 'server';
}

/**
 * Pure reducer for the connection state machine.
 * @param {ConnState} current
 * @param {'connect'|'resolved'|'rejected'|'editCreds'|'switchMode'} event
 * @param {{ reason?: ConnError }} [ctx]
 * @returns {{ state: ConnState, error: ConnError }}
 */
export function nextState(current, event, ctx = {}) {
  switch (event) {
    case 'connect':
      if (current === 'disconnected' || current === 'error') {
        return { state: 'checking', error: null };
      }
      return { state: current, error: ctx.reason ?? null };
    case 'resolved':
      return { state: 'connected', error: null };
    case 'rejected':
      return { state: 'error', error: ctx.reason ?? 'server' };
    case 'editCreds':
      return { state: 'disconnected', error: null };
    case 'switchMode':
      return { state: 'disconnected', error: null };
    default:
      return { state: current, error: ctx.reason ?? null };
  }
}

/**
 * The footer "Kalender öffnen →" CTA is enabled only when connected.
 * @param {ConnState} state
 * @returns {boolean}
 */
export function isFooterEnabled(state) {
  return state === 'connected';
}

/**
 * i18n key for the pill text of a given state/reason.
 * @param {ConnState} state
 * @param {ConnError} error
 * @returns {string}
 */
export function pillKey(state, error) {
  if (state === 'error') return `settings.conn.error.${error ?? 'server'}`;
  return `settings.conn.${state}`;
}

/**
 * Wire the connection UI. Returns a small controller the orchestrator uses to
 * trigger transitions (connect, invalidate) and read the current state.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.pill            status pill element
 * @param {HTMLButtonElement} opts.button    the Verbinden button
 * @param {HTMLElement} opts.hint            inline hint element (creds-changed)
 * @param {() => Promise<any>} opts.checkConnection   real getCurrentUser wrapper
 * @param {() => Promise<void>} opts.persistCredentials  encrypt + store creds
 * @param {(msg: string) => void} opts.announce          aria-live announcer
 * @param {(state: ConnState) => void} opts.onChange     state-change callback
 * @returns {{ connect: () => Promise<void>, invalidate: (event?: 'editCreds'|'switchMode') => void, getState: () => ConnState }}
 */
export function bindConnection(opts) {
  const { pill, button, hint, checkConnection, persistCredentials, announce, onChange } = opts;
  /** @type {ConnState} */
  let state = 'disconnected';
  /** @type {ConnError} */
  let error = null;

  function setHint(show) {
    if (hint) hint.classList.toggle('hidden', !show);
  }

  function render() {
    if (pill) {
      pill.dataset.state = state;
      pill.textContent = t(pillKey(state, error));
    }
    if (button) {
      button.disabled = state === 'checking';
      if (state === 'checking') button.setAttribute('aria-busy', 'true');
      else button.removeAttribute('aria-busy');
    }
    onChange?.(state);
  }

  function set(nextSt, nextErr) {
    state = nextSt;
    error = nextErr;
    render();
    if (announce) announce(t(pillKey(state, error)));
  }

  async function connect() {
    if (state === 'checking') return;
    setHint(false);
    set('checking', null);
    try {
      await persistCredentials();
      await checkConnection();
      set('connected', null);
    } catch (err) {
      set('error', mapError(err));
    }
  }

  /** @param {'editCreds'|'switchMode'} [event] */
  function invalidate(event = 'editCreds') {
    if (state === 'connected' || state === 'checking' || state === 'error') {
      const r = nextState(state, event);
      set(r.state, r.error);
      setHint(event === 'editCreds');
    }
  }

  render();
  return { connect, invalidate, getState: () => state };
}
