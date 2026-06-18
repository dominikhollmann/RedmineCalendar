/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { attachAnomalyBadge } from '../../js/anomaly-render.js';

// Pass t as a parameter — anomaly-render.js has no i18n import of its own.
const t = (key, vars) => (vars?.count !== undefined ? `${key}:${vars.count}` : key);

describe('attachAnomalyBadge', () => {
  let el;

  beforeEach(() => {
    el = document.createElement('div');
  });

  it('does nothing when eventEl is null', () => {
    expect(() => attachAnomalyBadge(null, { reasons: ['x'] }, t, 1)).not.toThrow();
  });

  it('does nothing when tag is null', () => {
    attachAnomalyBadge(el, null, t, 1);
    expect(el.children.length).toBe(0);
  });

  it('does nothing when tag.reasons is empty', () => {
    attachAnomalyBadge(el, { reasons: [] }, t, 1);
    expect(el.children.length).toBe(0);
  });

  it('appends badge and tooltip for a single reason', () => {
    attachAnomalyBadge(el, { reasons: ['Too short'] }, t, 42);
    const badge = el.querySelector('.fc-event__anomaly-badge');
    const tooltip = el.querySelector('.anomaly-tooltip');
    expect(badge).not.toBeNull();
    expect(tooltip).not.toBeNull();
    expect(tooltip.textContent).toBe('Too short');
  });

  it('tooltip is hidden on creation', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 1);
    const tooltip = el.querySelector('.anomaly-tooltip');
    expect(tooltip.hidden).toBe(true);
  });

  it('badge has correct ARIA attributes', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 42);
    const badge = el.querySelector('.fc-event__anomaly-badge');
    expect(badge.getAttribute('role')).toBe('button');
    expect(badge.getAttribute('tabindex')).toBe('0');
    expect(badge.getAttribute('aria-describedby')).toBe('anomaly-tooltip-42');
    expect(badge.getAttribute('aria-label')).toBe('anomaly.badge.aria');
  });

  it('tooltip id and role match badge aria-describedby', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 7);
    const tooltip = el.querySelector('.anomaly-tooltip');
    expect(tooltip.id).toBe('anomaly-tooltip-7');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
  });

  it('badge contains the inline SVG warning icon', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 1);
    const svg = el.querySelector('.fc-event__anomaly-badge svg');
    expect(svg).not.toBeNull();
  });

  it('multi-reason: renders header + list items', () => {
    attachAnomalyBadge(el, { reasons: ['Reason A', 'Reason B'] }, t, 1);
    const tooltip = el.querySelector('.anomaly-tooltip');
    const header = tooltip.querySelector('.anomaly-tooltip__header');
    const items = tooltip.querySelectorAll('li');
    expect(header).not.toBeNull();
    expect(header.textContent).toBe('anomaly.multipleReasons:2');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toBe('Reason A');
    expect(items[1].textContent).toBe('Reason B');
  });

  it('click on badge toggles tooltip visible → hidden → visible', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 1);
    const badge = el.querySelector('.fc-event__anomaly-badge');
    const tooltip = el.querySelector('.anomaly-tooltip');
    expect(tooltip.hidden).toBe(true);
    badge.click();
    expect(tooltip.hidden).toBe(false);
    badge.click();
    expect(tooltip.hidden).toBe(true);
  });

  it('Enter key on badge shows tooltip', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 1);
    const badge = el.querySelector('.fc-event__anomaly-badge');
    const tooltip = el.querySelector('.anomaly-tooltip');
    badge.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
    );
    expect(tooltip.hidden).toBe(false);
  });

  it('Space key on badge shows tooltip', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 1);
    const badge = el.querySelector('.fc-event__anomaly-badge');
    const tooltip = el.querySelector('.anomaly-tooltip');
    badge.dispatchEvent(
      new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })
    );
    expect(tooltip.hidden).toBe(false);
  });

  it('unrelated key on badge does not change tooltip visibility', () => {
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 1);
    const badge = el.querySelector('.fc-event__anomaly-badge');
    const tooltip = el.querySelector('.anomaly-tooltip');
    badge.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(tooltip.hidden).toBe(true);
  });

  it('second call replaces badge and tooltip, not duplicates them', () => {
    attachAnomalyBadge(el, { reasons: ['first'] }, t, 1);
    attachAnomalyBadge(el, { reasons: ['second'] }, t, 1);
    expect(el.querySelectorAll('.fc-event__anomaly-badge').length).toBe(1);
    expect(el.querySelectorAll('.anomaly-tooltip').length).toBe(1);
    expect(el.querySelector('.anomaly-tooltip').textContent).toBe('second');
  });

  it('each call on different elements is independent (no shared state)', () => {
    const el2 = document.createElement('div');
    const el3 = document.createElement('div');
    attachAnomalyBadge(el, { reasons: ['x'] }, t, 1);
    attachAnomalyBadge(el2, { reasons: ['y'] }, t, 2);
    attachAnomalyBadge(el3, { reasons: ['z'] }, t, 3);
    expect(el.querySelectorAll('.fc-event__anomaly-badge').length).toBe(1);
    expect(el2.querySelectorAll('.fc-event__anomaly-badge').length).toBe(1);
    expect(el3.querySelectorAll('.fc-event__anomaly-badge').length).toBe(1);
  });
});
