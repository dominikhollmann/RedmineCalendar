import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    setupFiles: ['tests/unit/setup.js'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      // Production code only — exclude dev tooling, specs, templates, and
      // DOM-heavy modules that are exercised by Playwright UI tests instead.
      include: ['js/**/*.js'],
      exclude: [
        'scripts/**',
        'tests/**',
        '.specify/**',
        '**/node_modules/**',
        // DOM-heavy modules — wire DOM elements to runtime behaviour at module
        // import time. Not unit-testable without extensive JSDOM mocking; covered
        // by Playwright UI tests in tests/ui/. These modules use `// @ts-nocheck`
        // or pass FullCalendar callbacks/DOM-element references that can't be
        // exercised meaningfully outside a real browser.
        'js/settings-page.js',
        'js/anomaly-render.js',
        // page-init.js: DOM-only i18n wiring for index.html (aria-labels, text
        // content). Runs only in a real browser context; covered by Playwright
        // UI tests (a11y.spec.js aria-label assertions, etc.).
        'js/page-init.js',
        // calendar.js: 600+ LOC of inline FC v6 config callbacks (eventClassNames,
        // eventDidMount, eventWillUnmount, etc.) that can only be invoked by a
        // running FullCalendar instance. 029 + 030 quietly pushed it under 95%
        // by adding more such callbacks. The Playwright UI suite (calendar.spec.js,
        // anomalies.spec.js, copy-paste.spec.js, ...) exercises the full module.
        // calendar-toolbar.js + calendar-overlays.js: 035 split off calendar.js;
        // same DOM-heavy rationale — wire FC callbacks / DOM-element references
        // that can't be exercised outside a real browser.
        'js/calendar.js',
        'js/calendar-toolbar.js',
        'js/calendar-overlays.js',
        // feedback.js: creates FAB + dialog DOM at module import time (auto-init
        // pattern). DOM rendering helpers (renderBugContext, renderSuggestionContext,
        // handleSubmit, openFeedbackDialog) require a real browser; covered by
        // Playwright UI tests in tests/ui/feedback.spec.js.
        'js/feedback.js',
        // planning-view*.js: DOM-heavy orchestration and rendering modules for the
        // Planning View feature. Pure-logic exports (classifyProposal, isFullyCovered,
        // prevDay, nextDay, toToday, normaliseCall, normaliseMeeting) are unit-tested;
        // the rest is covered by Playwright UI tests in tests/ui/planning-view.spec.js
        // and tests/ui/planning-view-teams.spec.js.
        'js/planning-view.js',
        'js/planning-view-bookings.js',
        'js/planning-view-outlook.js',
        'js/planning-view-teams.js',
        // undo-actions.js: registers document event listeners (keydown, undo:push,
        // undo:navigate, etc.) at module import time and dispatches Redmine API
        // calls in response to keyboard/event input. The DOM-event-driven handler
        // logic is exercised by Playwright UI tests in tests/ui/undo.spec.js.
        'js/undo-actions.js',
      ],
      // 'json' writes coverage-final.json (istanbul shape — consumed by scripts/coverage-merge.mjs)
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage/unit', // separate from coverage/.tmp/playwright/
      // clean: false so a two-pass test:coverage run (pass 1 excludes sqi-threshold
      // to seed the coverage file; pass 2 runs the full suite) doesn't wipe the
      // coverage written by pass 1 before the SQI subprocess in sqi-threshold runs.
      clean: false,
      // perFile: true enforces the threshold on EACH module (not just overall).
      // Lines/statements at 95% match the project's per-module coverage goal.
      // Functions/branches are looser because some modules have defensive
      // error paths that the test environment cannot exercise; those handlers
      // are marked with `/* c8 ignore next */` comments inline where they live
      // (crypto.js IndexedDB onerror handlers; knowledge.js browser fetch
      // fallback). The remaining branch slack accommodates the i18n.js
      // de-locale formatDate branch — covered by tests/unit/i18n.test.js via
      // `vi.resetModules()` + navigator override (the pattern preferred over
      // global locale mocking because it scopes the pollution to one describe
      // block).
      thresholds: {
        perFile: true,
        lines: 95,
        statements: 95,
        functions: 75,
        branches: 90,
      },
    },
  },
});
