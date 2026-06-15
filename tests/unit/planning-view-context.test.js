import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerPlanningView,
  showPlanningView,
  setCalendarRef,
  isPlanningViewActive,
  refreshPlanningView,
} from '../../js/planning-view-context.js';

beforeEach(() => {
  // Reset registry state between tests by registering no-ops
  registerPlanningView({ show: null, setRef: null, isActive: null, refresh: null });
});

describe('planning-view-context — before registration', () => {
  it('showPlanningView is a no-op when nothing is registered', () => {
    expect(() => showPlanningView('2026-06-13')).not.toThrow();
  });

  it('setCalendarRef is a no-op when nothing is registered', () => {
    expect(() => setCalendarRef({})).not.toThrow();
  });

  it('isPlanningViewActive returns false when nothing is registered', () => {
    expect(isPlanningViewActive()).toBe(false);
  });
});

describe('planning-view-context — after registration', () => {
  it('showPlanningView delegates to the registered show function', () => {
    const show = vi.fn();
    registerPlanningView({ show, setRef: vi.fn(), isActive: vi.fn(() => false) });
    showPlanningView('2026-06-13');
    expect(show).toHaveBeenCalledWith('2026-06-13');
  });

  it('setCalendarRef delegates to the registered setRef function', () => {
    const setRef = vi.fn();
    registerPlanningView({ show: vi.fn(), setRef, isActive: vi.fn(() => false) });
    const cal = { render: vi.fn() };
    setCalendarRef(cal);
    expect(setRef).toHaveBeenCalledWith(cal);
  });

  it('isPlanningViewActive returns the value from the registered isActive function', () => {
    registerPlanningView({ show: vi.fn(), setRef: vi.fn(), isActive: vi.fn(() => true) });
    expect(isPlanningViewActive()).toBe(true);
  });

  it('isPlanningViewActive returns false when isActive returns false', () => {
    registerPlanningView({ show: vi.fn(), setRef: vi.fn(), isActive: vi.fn(() => false) });
    expect(isPlanningViewActive()).toBe(false);
  });

  it('refreshPlanningView is a no-op when nothing is registered', () => {
    expect(() => refreshPlanningView()).not.toThrow();
  });

  it('refreshPlanningView delegates to the registered refresh function', () => {
    const refresh = vi.fn();
    registerPlanningView({ show: vi.fn(), setRef: vi.fn(), isActive: vi.fn(() => false), refresh });
    refreshPlanningView();
    expect(refresh).toHaveBeenCalledOnce();
  });
});
