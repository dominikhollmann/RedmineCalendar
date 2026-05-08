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
      reportsDirectory: './coverage/unit',  // separate from coverage/.tmp/playwright/
      // Thresholds set ~5pp below current baseline so regressions break the
      // build but normal day-to-day work stays green. Branches kept tight
      // (current 83%, floor 80%) since branch coverage is the most stable
      // signal in this codebase.
      thresholds: {
        lines:      50,
        statements: 50,
        functions:  50,
        branches:   80,
      },
    },
  },
});
