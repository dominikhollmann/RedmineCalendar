// Custom Playwright fixture that captures per-test V8 JS coverage when the
// PW_COVERAGE=1 environment variable is set. Raw coverage entries are dumped
// to coverage/.tmp/playwright/ and aggregated by scripts/playwright-coverage-summary.mjs.
//
// Usage in specs: replace `import { test, expect } from '@playwright/test'`
// with `import { test, expect } from './coverage-fixture.js'`.

import { test as base, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COV_DIR   = resolve(__dirname, '../../coverage/.tmp/playwright');
const ENABLED   = process.env.PW_COVERAGE === '1';

export const test = base.extend({
  page: async ({ page }, use, testInfo) => {
    if (ENABLED) {
      await page.coverage.startJSCoverage({ resetOnNavigation: false });
    }
    await use(page);
    if (ENABLED) {
      const entries = await page.coverage.stopJSCoverage();
      // Keep only OUR JS modules — drop CDN libraries, inline scripts, etc.
      const ours = entries.filter(e => e.url.includes('/js/') && !e.url.includes('node_modules'));
      if (ours.length === 0) return;
      await mkdir(COV_DIR, { recursive: true });
      const safe = testInfo.titlePath.join('-').replace(/[^a-z0-9-]/gi, '_').slice(0, 100);
      const file = `${COV_DIR}/coverage-${safe}-${Date.now()}.json`;
      await writeFile(file, JSON.stringify(ours));
    }
  },
});

export { expect };
