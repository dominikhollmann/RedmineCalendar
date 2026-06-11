#!/usr/bin/env node
/**
 * SRI integrity check — fails if any CDN <script src="https://..."> in an HTML
 * file is missing the integrity attribute.
 *
 * Run:  node scripts/sri-check.mjs
 * CI:   npm run sri:check
 *
 * When to re-run: after bumping a CDN version in any *.html file.
 * To compute a new hash:
 *   curl -sL <cdn-url> | openssl dgst -sha384 -binary | openssl base64 -A
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const htmlFiles = readdirSync(ROOT).filter((f) => f.endsWith('.html'));

// Matches <script ... src="https://..." ...> (single line, case-insensitive).
const CDN_SCRIPT_RE = /<script\b[^>]*\bsrc="(https:\/\/[^"]+)"[^>]*>/gi;

let failed = false;

for (const file of htmlFiles) {
  const content = readFileSync(join(ROOT, file), 'utf8');
  let match;
  CDN_SCRIPT_RE.lastIndex = 0;
  while ((match = CDN_SCRIPT_RE.exec(content)) !== null) {
    const tag = match[0];
    if (!tag.includes('integrity=')) {
      console.error(`\nERROR  ${file}`);
      console.error(`  CDN script without integrity attribute:`);
      console.error(`  ${tag.length > 120 ? tag.slice(0, 117) + '...' : tag}`);
      failed = true;
    }
  }
}

if (failed) {
  console.error(
    '\nFix: add integrity="sha384-<hash>" crossorigin="anonymous" to every CDN <script>.'
  );
  console.error('Hash: curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A');
  process.exit(1);
}

console.log(
  `SRI check passed — ${htmlFiles.length} HTML file(s) checked, all CDN scripts have integrity attributes.`
);
