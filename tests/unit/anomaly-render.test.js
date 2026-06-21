/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  attachAnomalyBadge,
  buildWarningBadge,
  buildInlineWarningBadge,
  attachFixedTooltip,
} from '../../js/anomaly-render.js';

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

describe('buildWarningBadge (direct)', () => {
  it('single reason sets tooltip text and ids', () => {
    const { badge, tooltip } = buildWarningBadge('tip-1', 'Label', ['Only reason'], t);
    expect(badge.getAttribute('aria-describedby')).toBe('tip-1');
    expect(badge.getAttribute('aria-label')).toBe('Label');
    expect(tooltip.id).toBe('tip-1');
    expect(tooltip.textContent).toBe('Only reason');
    expect(tooltip.hidden).toBe(true);
  });

  it('multi reason WITH t renders header + list items', () => {
    const { tooltip } = buildWarningBadge('tip-2', 'Label', ['A', 'B'], t);
    expect(tooltip.querySelector('.anomaly-tooltip__header').textContent).toBe(
      'anomaly.multipleReasons:2'
    );
    expect(tooltip.querySelectorAll('li').length).toBe(2);
  });

  it('multi reason WITHOUT t leaves header text empty (no crash)', () => {
    const { tooltip } = buildWarningBadge('tip-3', 'Label', ['A', 'B']);
    expect(tooltip.querySelector('.anomaly-tooltip__header').textContent).toBe('');
    expect(tooltip.querySelectorAll('li').length).toBe(2);
  });

  it('click toggles the tooltip', () => {
    const { badge, tooltip } = buildWarningBadge('tip-4', 'Label', ['x'], t);
    badge.click();
    expect(tooltip.hidden).toBe(false);
    badge.click();
    expect(tooltip.hidden).toBe(true);
  });
});

describe('buildInlineWarningBadge', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('badge gets the inline class; tooltip is a fixed, hidden tooltip with reason text', () => {
    const { badge, tooltip } = buildInlineWarningBadge('cti-1', 'Closed');
    expect(badge.classList.contains('warning-badge--inline')).toBe(true);
    expect(badge.classList.contains('fc-event__anomaly-badge')).toBe(true);
    expect(tooltip.classList.contains('anomaly-tooltip')).toBe(true);
    expect(tooltip.classList.contains('anomaly-tooltip--fixed')).toBe(true);
    expect(tooltip.id).toBe('cti-1');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.textContent).toBe('Closed');
    expect(tooltip.hidden).toBe(true);
  });

  it('mouseenter portals the tooltip to <body>, positions and shows it', () => {
    const { badge, tooltip } = buildInlineWarningBadge('cti-2', 'Closed');
    badge.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.parentNode).toBe(document.body);
    expect(tooltip.style.top).not.toBe('');
    expect(tooltip.style.left).not.toBe('');
  });

  it('mouseleave hides and removes the tooltip from <body>', () => {
    const { badge, tooltip } = buildInlineWarningBadge('cti-3', 'Closed');
    badge.dispatchEvent(new MouseEvent('mouseenter'));
    badge.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tooltip.hidden).toBe(true);
    expect(tooltip.parentNode).toBe(null);
  });

  it('focus shows, blur hides', () => {
    const { badge, tooltip } = buildInlineWarningBadge('cti-4', 'Closed');
    badge.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip.hidden).toBe(false);
    badge.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(tooltip.hidden).toBe(true);
  });

  it('click toggles show → hide', () => {
    const { badge, tooltip } = buildInlineWarningBadge('cti-5', 'Closed');
    badge.click();
    expect(tooltip.hidden).toBe(false);
    badge.click();
    expect(tooltip.hidden).toBe(true);
  });

  it('Enter/Space toggle; an unrelated key is a no-op', () => {
    const { badge, tooltip } = buildInlineWarningBadge('cti-6', 'Closed');
    badge.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    expect(tooltip.hidden).toBe(false);
    badge.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', cancelable: true }));
    expect(tooltip.hidden).toBe(true);
    badge.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    expect(tooltip.hidden).toBe(true);
  });

  it('repeated show does not append the tooltip to <body> twice', () => {
    const { badge } = buildInlineWarningBadge('cti-7', 'Closed');
    badge.dispatchEvent(new MouseEvent('mouseenter'));
    badge.dispatchEvent(new MouseEvent('mouseenter'));
    expect(document.body.querySelectorAll('.anomaly-tooltip').length).toBe(1);
  });
});

describe('attachFixedTooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('creates a hidden, styled tooltip and links it via aria-describedby', () => {
    const trigger = document.createElement('label');
    const { tooltip } = attachFixedTooltip(trigger, 'Explains the thing', 'tip-x');
    expect(tooltip.classList.contains('anomaly-tooltip')).toBe(true);
    expect(tooltip.classList.contains('anomaly-tooltip--fixed')).toBe(true);
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.textContent).toBe('Explains the thing');
    expect(tooltip.hidden).toBe(true);
    expect(trigger.getAttribute('aria-describedby')).toBe('tip-x');
  });

  it('shows on mouseenter (portaled to body) and hides on mouseleave', () => {
    const trigger = document.createElement('label');
    document.body.appendChild(trigger);
    const { tooltip } = attachFixedTooltip(trigger, 'Hint', 'tip-y');
    trigger.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.parentNode).toBe(document.body);
    trigger.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tooltip.hidden).toBe(true);
    expect(tooltip.parentNode).toBe(null);
  });

  it('shows when a focusable child receives focus (focusin) and hides on focusout', () => {
    const trigger = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    trigger.appendChild(checkbox);
    document.body.appendChild(trigger);
    const { tooltip } = attachFixedTooltip(trigger, 'Hint', 'tip-z');
    checkbox.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip.hidden).toBe(false);
    checkbox.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(tooltip.hidden).toBe(true);
  });

  it('exposes show/hide controls', () => {
    const trigger = document.createElement('label');
    const { tooltip, show, hide } = attachFixedTooltip(trigger, 'Hint', 'tip-w');
    show();
    expect(tooltip.hidden).toBe(false);
    hide();
    expect(tooltip.hidden).toBe(true);
  });
});
