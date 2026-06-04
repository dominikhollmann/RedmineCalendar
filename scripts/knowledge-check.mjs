// Checks that every js/*.js module is either referenced in a topic in
// js/knowledge.topics.json or listed in IGNORE below. Exits non-zero on violations.
// Run via: npm run knowledge:check

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(import.meta.url), '../../');
const JS_DIR = join(ROOT, 'js');
const TOPICS_FILE = join(JS_DIR, 'knowledge.topics.json');

// Files intentionally excluded from AI knowledge routing.
// Only add infrastructure/glue files here — files with no user-facing logic
// that would never be relevant to answer a user question.
const IGNORE = new Set([
  'js/knowledge.js', // the routing system itself
  'js/notify.js', // internal toast helper — no domain logic
  'js/page-init.js', // page bootstrap glue — no domain logic
]);

const topics = JSON.parse(readFileSync(TOPICS_FILE, 'utf8'));
const referenced = new Set(topics.flatMap((t) => t.files ?? []));

const jsFiles = readdirSync(JS_DIR, { withFileTypes: true })
  .filter((e) => e.isFile() && e.name.endsWith('.js'))
  .map((e) => `js/${e.name}`);

const uncovered = jsFiles.filter((f) => !referenced.has(f) && !IGNORE.has(f));

if (uncovered.length === 0) {
  console.log('knowledge:check ✓  all js/ modules are covered');
  process.exit(0);
}

console.error('knowledge:check FAILED — uncovered JS modules:\n');
uncovered.forEach((f) => console.error(`  • ${f}`));
console.error(
  '\nFor each file above, either:\n' +
    '  • add it to a topic in js/knowledge.topics.json, or\n' +
    '  • add it to the IGNORE set in scripts/knowledge-check.mjs\n' +
    '    (only for infrastructure/glue files with no user-facing logic).'
);
process.exit(1);
