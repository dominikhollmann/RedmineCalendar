import { defineConfig } from '@playwright/test';
import { existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const hasCerts =
  existsSync(resolve(repoRoot, '.certs/cert.pem')) &&
  existsSync(resolve(repoRoot, '.certs/key.pem'));

// When local dev certs exist, run UI tests against the HTTPS dev-server
// (matching what developers see manually). Otherwise fall back to plain HTTP
// served by `npx serve` — useful in CI where certs aren't generated.
const useHttps = hasCerts;
const baseURL = useHttps ? 'https://localhost:3000' : 'http://localhost:3000';
const webServerCommand = useHttps ? 'node scripts/dev-server.mjs' : 'npx serve . -p 3000';

export default defineConfig({
  testDir: './ui',
  testMatch: '**/*.spec.js',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL,
    headless: true,
    screenshot: 'only-on-failure',
    ignoreHTTPSErrors: true,
  },
  webServer: {
    command: webServerCommand,
    cwd: '..',
    port: 3000,
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
