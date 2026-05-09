import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.js'],
    environment: 'node',
    setupFiles: ['tests/unit/setup.js'],
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      // Production code only — exclude dev tooling, specs, and templates.
      include: ['js/**/*.js'],
      exclude: ['scripts/**', 'tests/**', '.specify/**', '**/node_modules/**'],
      // 'json' writes coverage-final.json (istanbul shape — consumed by scripts/coverage-merge.mjs)
      reporter: ['text', 'html', 'json-summary', 'json'],
      reportsDirectory: './coverage/unit', // separate from coverage/.tmp/playwright/
      // perFile: true enforces the threshold on EACH module (not just overall).
      // Lines/statements at 95% match the project's per-module coverage goal;
      // current actual is 99.6%/99.6%, so there's ~5pp of headroom for refactors.
      // Functions and branches are looser because two modules have unreachable
      // defensive paths in this test environment: crypto.js's IndexedDB onerror
      // handlers (functions 78.6% — the indexedDB mock never errors) and
      // i18n.js's de-locale formatDate branch (branches 66.7% — re-evaluating
      // the module to test it pollutes other tests' locale state).
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
