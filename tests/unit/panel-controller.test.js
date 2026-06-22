// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  hidePanelAfterClose,
  wireEscapeToClose,
  installPanelResizer,
} from '../../js/panel-controller.js';

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '';
});

describe('hidePanelAfterClose', () => {
  it('removes the open class immediately and hides after 300ms when still closed', () => {
    const panel = document.createElement('div');
    panel.classList.add('p--open');
    panel.removeAttribute('hidden');
    hidePanelAfterClose(panel, 'p--open', () => false);
    expect(panel.classList.contains('p--open')).toBe(false);
    expect(panel.hasAttribute('hidden')).toBe(false);
    vi.advanceTimersByTime(300);
    expect(panel.hasAttribute('hidden')).toBe(true);
  });

  it('does not hide if the panel was reopened within the window', () => {
    const panel = document.createElement('div');
    hidePanelAfterClose(panel, 'p--open', () => true); // reopened → isOpen() true
    vi.advanceTimersByTime(300);
    expect(panel.hasAttribute('hidden')).toBe(false);
  });
});

describe('wireEscapeToClose', () => {
  it('calls close only on Escape while open', () => {
    const close = vi.fn();
    let open = true;
    wireEscapeToClose(() => open, close);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(close).toHaveBeenCalledTimes(1);
    open = false;
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(close).toHaveBeenCalledTimes(1);
  });
});

describe('installPanelResizer', () => {
  it('is a no-op when the handle is absent', () => {
    expect(() =>
      installPanelResizer({ handleSelector: '.missing', getPanel: () => null })
    ).not.toThrow();
  });

  it('resizes the panel on drag, clamped to the minimum width', () => {
    const handle = document.createElement('div');
    handle.className = 'h';
    const panel = document.createElement('div');
    document.body.append(handle, panel);
    Object.defineProperty(window, 'innerWidth', { value: 1000, configurable: true });

    installPanelResizer({ handleSelector: '.h', getPanel: () => panel, minWidth: 280 });
    handle.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    // clientX 700 → width = 1000-700 = 300 (above min)
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 700 }));
    expect(panel.style.width).toBe('300px');
    // clientX 900 → width 100 → clamped up to 280
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 900 }));
    expect(panel.style.width).toBe('280px');
    document.dispatchEvent(new MouseEvent('mouseup'));
    // after mouseup, further moves are ignored
    document.dispatchEvent(new MouseEvent('mousemove', { clientX: 500 }));
    expect(panel.style.width).toBe('280px');
  });
});
