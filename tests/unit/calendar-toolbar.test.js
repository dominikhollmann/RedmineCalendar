import { describe, it, expect, vi, beforeEach } from 'vitest';

// calendar-toolbar.js (feature 035 split from calendar.js) imports only
// settings / i18n / config — mock the first two; config.js is plain constants.
vi.mock('../../js/i18n.js', () => ({
  t: vi.fn((k) => k),
  locale: 'en',
}));
const _settingsMock = { readWorkingHours: vi.fn(() => null) };
vi.mock('../../js/settings.js', () => _settingsMock);

const {
  computeOverflowSets,
  getSuppressSelectFlag,
  buildCustomButtons,
  getInitialHiddenDays,
  getEffectiveTimeRange,
  isMobileView,
  installToolbarButtons,
  installMobileNavigation,
} = await import('../../js/calendar-toolbar.js');

beforeEach(() => {
  globalThis.localStorage.clear();
  _settingsMock.readWorkingHours.mockReturnValue(null);
});

describe('calendar-toolbar — computeOverflowSets (pure)', () => {
  it('flags entries starting before the window as overflowUp + tracks earliest start', () => {
    const { overflowUp, earliestUpMin } = computeOverflowSets(
      [{ date: '2026-05-07', startTime: '06:00', hours: 1 }],
      480, // 08:00 window start
      1080 // 18:00 window end
    );
    expect([...overflowUp]).toEqual(['2026-05-07']);
    expect(earliestUpMin).toBe(360);
  });

  it('flags entries ending after the window as overflowDown', () => {
    const { overflowDown } = computeOverflowSets(
      [{ date: '2026-05-08', startTime: '17:00', hours: 3 }],
      480,
      1080
    );
    expect([...overflowDown]).toEqual(['2026-05-08']);
  });

  it('returns empty sets when every entry fits inside the window', () => {
    const r = computeOverflowSets(
      [{ date: '2026-05-07', startTime: '09:00', hours: 2 }],
      480,
      1080
    );
    expect(r.overflowUp.size).toBe(0);
    expect(r.overflowDown.size).toBe(0);
  });
});

describe('calendar-toolbar — toggle + custom-button surface', () => {
  it('getSuppressSelectFlag returns a stable shared flag object', () => {
    const flag = getSuppressSelectFlag();
    expect(flag).toEqual({ value: false });
    expect(getSuppressSelectFlag()).toBe(flag); // same reference across calls
  });

  it('buildCustomButtons registers fullWeekToggle + viewModeToggle with click handlers', () => {
    const btns = buildCustomButtons();
    expect(Object.keys(btns).sort()).toEqual(['fullWeekToggle', 'viewModeToggle']);
    expect(typeof btns.fullWeekToggle.click).toBe('function');
    expect(typeof btns.viewModeToggle.click).toBe('function');
  });

  it('getInitialHiddenDays defaults to the workweek (hides Sunday + Saturday)', () => {
    expect(getInitialHiddenDays()).toEqual([0, 6]);
  });

  it('getInitialHiddenDays returns [] when the stored day-range is full-week', () => {
    globalThis.localStorage.setItem('redmine_calendar_day_range', 'full-week');
    expect(getInitialHiddenDays()).toEqual([]);
  });

  it('getEffectiveTimeRange returns full 24h when no working hours are configured', () => {
    expect(getEffectiveTimeRange()).toEqual({ slotMinTime: '00:00', slotMaxTime: '24:00' });
  });

  it('getEffectiveTimeRange returns the configured range under working-hours view', () => {
    _settingsMock.readWorkingHours.mockReturnValue({ start: '08:00', end: '17:00' });
    globalThis.localStorage.setItem('redmine_calendar_view_mode', 'working');
    expect(getEffectiveTimeRange()).toEqual({ slotMinTime: '08:00', slotMaxTime: '17:00' });
  });
});

describe('calendar-toolbar — install* wiring', () => {
  it('isMobileView reflects the viewport width against the 768px breakpoint', () => {
    global.window.innerWidth = 500;
    expect(isMobileView()).toBe(true);
    global.window.innerWidth = 1200;
    expect(isMobileView()).toBe(false);
  });

  it('installToolbarButtons is a safe no-op when the toolbar buttons are absent', () => {
    expect(() => installToolbarButtons({ setOption: vi.fn() })).not.toThrow();
  });

  it('installMobileNavigation wires the resize + touch-swipe listeners', () => {
    global.window.addEventListener = vi.fn();
    global.window.innerWidth = 1200;
    const calendarEl = { addEventListener: vi.fn() };
    installMobileNavigation(calendarEl, { changeView: vi.fn(), next: vi.fn(), prev: vi.fn() });
    expect(global.window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    expect(calendarEl.addEventListener).toHaveBeenCalledWith('touchstart', expect.any(Function), {
      passive: true,
    });
    expect(calendarEl.addEventListener).toHaveBeenCalledWith('touchend', expect.any(Function), {
      passive: true,
    });
  });
});
