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
        // by Playwright UI tests in tests/ui/. Both modules use `// @ts-nocheck`.
        'js/settings-page.js',
        'js/anomaly-render.js',
      ],
      // 'json' writes coverage-final.json (istanbul shape — consumed by scripts/coverage-merge.mjs)
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage/unit', // separate from coverage/.tmp/playwright/
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
        branches: 65,
      },
    },
  },
});
