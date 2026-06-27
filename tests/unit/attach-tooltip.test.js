/** @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from 'vitest';
import { attachFixedTooltip, attachLabelTooltip } from '../../js/anomaly-render.js';

describe('attachFixedTooltip — multi-line (array) input', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one .anomaly-tooltip__line per array entry and adds --multiline', () => {
    const trigger = document.createElement('div');
    const lines = ['#1 Fix login', 'ACME — web', '09:00 – 09:30 (30m)'];
    const { tooltip } = attachFixedTooltip(trigger, lines, 'evt-1');
    expect(tooltip.classList.contains('anomaly-tooltip--multiline')).toBe(true);
    const lineEls = tooltip.querySelectorAll('.anomaly-tooltip__line');
    expect(lineEls.length).toBe(3);
    expect(lineEls[0].textContent).toBe('#1 Fix login');
    expect(lineEls[2].textContent).toBe('09:00 – 09:30 (30m)');
  });

  it('sets role=tooltip and links trigger via aria-describedby', () => {
    const trigger = document.createElement('div');
    const { tooltip } = attachFixedTooltip(trigger, ['a', 'b'], 'evt-2');
    expect(tooltip.getAttribute('role')).toBe('tooltip');
    expect(tooltip.id).toBe('evt-2');
    expect(trigger.getAttribute('aria-describedby')).toBe('evt-2');
  });

  it('content is set via textContent (untrusted text is not parsed as HTML)', () => {
    const trigger = document.createElement('div');
    const { tooltip } = attachFixedTooltip(trigger, ['<img src=x onerror=alert(1)>'], 'evt-xss');
    const lineEl = tooltip.querySelector('.anomaly-tooltip__line');
    expect(lineEl.querySelector('img')).toBeNull();
    expect(lineEl.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('shows on focusin and hides + removes the node on focusout', () => {
    const trigger = document.createElement('div');
    document.body.appendChild(trigger);
    const { tooltip } = attachFixedTooltip(trigger, ['a', 'b'], 'evt-3');
    trigger.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip.hidden).toBe(false);
    expect(tooltip.parentNode).toBe(document.body);
    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
    expect(tooltip.hidden).toBe(true);
    expect(tooltip.parentNode).toBe(null);
  });

  it('string input is still single-line (backward compatible — no --multiline)', () => {
    const trigger = document.createElement('div');
    const { tooltip } = attachFixedTooltip(trigger, 'just one line', 'evt-4');
    expect(tooltip.classList.contains('anomaly-tooltip--multiline')).toBe(false);
    expect(tooltip.querySelectorAll('.anomaly-tooltip__line').length).toBe(0);
    expect(tooltip.textContent).toBe('just one line');
  });
});

describe('attachLabelTooltip', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('removes the native title attribute from the trigger', () => {
    const btn = document.createElement('button');
    btn.title = 'Open settings';
    attachLabelTooltip(btn, 'Open settings', 'lbl-1');
    expect(btn.hasAttribute('title')).toBe(false);
  });

  it('guarantees aria-describedby pointing at the tooltip id', () => {
    const btn = document.createElement('button');
    attachLabelTooltip(btn, 'Refresh', 'lbl-2');
    expect(btn.getAttribute('aria-describedby')).toBe('lbl-2');
    expect(document.getElementById('lbl-2')).toBeTruthy;
  });

  it('generates a tooltip id when none is supplied', () => {
    const btn = document.createElement('button');
    const { tooltip } = attachLabelTooltip(btn, 'Help');
    expect(tooltip.id).toBeTruthy();
    expect(btn.getAttribute('aria-describedby')).toBe(tooltip.id);
  });

  it('wires hover + keyboard focus (shows on mouseenter and focusin)', () => {
    const btn = document.createElement('button');
    document.body.appendChild(btn);
    const { tooltip } = attachLabelTooltip(btn, 'Refresh', 'lbl-3');
    expect(tooltip.hidden).toBe(true);
    btn.dispatchEvent(new MouseEvent('mouseenter'));
    expect(tooltip.hidden).toBe(false);
    btn.dispatchEvent(new MouseEvent('mouseleave'));
    expect(tooltip.hidden).toBe(true);
    btn.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect(tooltip.hidden).toBe(false);
  });

  it('is a single-line tooltip (no --multiline class)', () => {
    const btn = document.createElement('button');
    const { tooltip } = attachLabelTooltip(btn, 'Refresh', 'lbl-4');
    expect(tooltip.classList.contains('anomaly-tooltip--multiline')).toBe(false);
    expect(tooltip.textContent).toBe('Refresh');
  });

  it('is a no-op on empty text (no tooltip, no aria-describedby)', () => {
    const btn = document.createElement('button');
    const result = attachLabelTooltip(btn, '', 'lbl-5');
    expect(result).toBeUndefined();
    expect(btn.hasAttribute('aria-describedby')).toBe(false);
    expect(document.getElementById('lbl-5')).toBeNull();
  });
});
