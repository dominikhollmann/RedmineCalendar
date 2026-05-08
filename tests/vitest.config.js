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
      exclude: [
        'scripts/**',
        'tests/**',
        '.specify/**',
        '**/node_modules/**',
      ],
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: './coverage',
      // Reporting only for now — no thresholds enforced. Once a target is
      // agreed (e.g. 80% lines), add `thresholds: { lines: 80, ... }` here
      // and the run will fail on regression.
    },
  },
});
