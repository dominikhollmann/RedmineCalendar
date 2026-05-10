#!/usr/bin/env node
// Merge Vitest unit + Playwright UI coverage into a unified line-level report.
//
// Strategy:
//   1. Vitest writes coverage/unit/coverage-final.json   (istanbul shape, line-level)
//   2. Playwright dumps per-test V8 raw entries to coverage/.tmp/playwright/
//   3. We aggregate (2) into coverage/ui/coverage-final.json via monocart's
//      V8 → istanbul converter (so it's the same shape as vitest's output)
//   4. We compute per-file line-level UNION of "covered" line sets across
//      both istanbul outputs and emit a unified text summary + JSON.
//
// Why two passes (rather than mixing raw V8 + istanbul in one monocart call)?
// Monocart crashes when istanbul + V8 entries land in the same report (its V8
// converter routes the istanbul entries through a CSS code path). Two separate
// monocart runs each handle a single source format cleanly.

import { CoverageReport } from 'monocart-coverage-reports';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── Step A: aggregate Playwright dumps into istanbul-shape coverage-final.json ──

const pwDir = resolve(root, 'coverage/.tmp/playwright');
if (!existsSync(pwDir)) {
  console.error(
    `⚠ Playwright UI: ${pwDir.replace(root + '/', '')} missing — run npm run test:ui:coverage first.`
  );
  process.exit(1);
}

const mcr = new CoverageReport({
  name: 'Playwright UI',
  outputDir: resolve(root, 'coverage/ui'),
  reports: [
    ['v8', { metrics: ['lines', 'branches', 'functions'] }],
    'console-summary',
    'json', // writes coverage-final.json (istanbul shape) — what we read in Step B
    ['json-summary', { file: 'summary.json' }],
  ],
  entryFilter: { '**/node_modules/**': false, '**/js/**': true },
  sourceFilter: { '**/js/**': true },
  cleanCache: true,
});

let pwEntries = 0;
const pwFiles = (await readdir(pwDir)).filter((f) => f.endsWith('.json'));
for (const f of pwFiles) {
  const data = JSON.parse(await readFile(resolve(pwDir, f), 'utf8'));
  const entries = Array.isArray(data) ? data : (data.result ?? []);
  const cleaned = entries
    .map((e) => {
      if (!e?.url) return null;
      const m = e.url.match(/\/js\/([^?#]+\.js)(?:[?#].*)?$/);
      if (!m) return null;
      e.url = `js/${m[1]}`;
      e.type = 'js';
      return e;
    })
    .filter(Boolean);
  if (cleaned.length) {
    await mcr.add(cleaned);
    pwEntries += cleaned.length;
  }
}
await mcr.generate();
console.log(`✓ Playwright UI: ${pwFiles.length} dumps, ${pwEntries} V8 entries → coverage/ui/`);

// ── Step B: compute line-level union across both istanbul outputs ──

const unitFinal = resolve(root, 'coverage/unit/coverage-final.json');
const uiFinal = resolve(root, 'coverage/ui/coverage-final.json');

if (!existsSync(unitFinal)) {
  console.error(
    '⚠ Vitest unit: coverage/unit/coverage-final.json missing — run npm run test:coverage first.'
  );
  process.exit(1);
}

const unit = JSON.parse(await readFile(unitFinal, 'utf8'));
const ui = JSON.parse(await readFile(uiFinal, 'utf8'));

// Normalize keys: both sources should map to `js/<file>.js`. Istanbul keys are
// typically absolute paths; monocart's istanbul output may use relative paths.
function canonicalKey(k) {
  const m = k.match(/\/js\/([^?#]+\.js)$/) || k.match(/^js\/([^?#]+\.js)$/);
  return m ? `js/${m[1]}` : null;
}
function reindex(istanbul) {
  const out = {};
  for (const [k, v] of Object.entries(istanbul)) {
    const ck = canonicalKey(k);
    if (ck) out[ck] = v;
  }
  return out;
}
const unitN = reindex(unit);
const uiN = reindex(ui);

// Per-file line union: a line is "covered" if EITHER source executed any
// statement on that line. Istanbul's `s` map is { stmtId: count }; the
// `statementMap` maps stmtId → { start: { line, col }, end: { line, col } }.
function coveredLines(fileCov) {
  const lines = new Set();
  if (!fileCov?.statementMap || !fileCov?.s) return { covered: lines, total: 0 };
  const allLines = new Set();
  for (const [stmtId, info] of Object.entries(fileCov.statementMap)) {
    const startLine = info?.start?.line;
    if (typeof startLine !== 'number') continue;
    allLines.add(startLine);
    if (fileCov.s[stmtId] > 0) lines.add(startLine);
  }
  return { covered: lines, total: allLines.size };
}

const allFiles = new Set([...Object.keys(unitN), ...Object.keys(uiN)]);
const rows = [];
let unionCovered = 0,
  unionTotal = 0;
for (const file of [...allFiles].sort()) {
  const u = coveredLines(unitN[file]);
  const i = coveredLines(uiN[file]);
  const totalLines = Math.max(u.total, i.total);
  const union = new Set([...u.covered, ...i.covered]);
  const pct = totalLines > 0 ? (union.size / totalLines) * 100 : 0;
  rows.push({
    file,
    unitPct: u.total ? (u.covered.size / u.total) * 100 : null,
    uiPct: i.total ? (i.covered.size / i.total) * 100 : null,
    unionPct: pct,
    covered: union.size,
    total: totalLines,
  });
  unionCovered += union.size;
  unionTotal += totalLines;
}

console.log();
console.log(' % Unified coverage (line-level union of Vitest unit + Playwright UI)');
console.log('---------------------------|---------|---------|---------|--------');
console.log(' File                      | Unit %  | UI %    | Union % | Lines');
console.log('---------------------------|---------|---------|---------|--------');
for (const r of rows) {
  const name = r.file.split('/').pop().padEnd(25);
  const u = r.unitPct == null ? '   —  ' : `${r.unitPct.toFixed(1).padStart(5)}%`;
  const i = r.uiPct == null ? '   —  ' : `${r.uiPct.toFixed(1).padStart(5)}%`;
  const x = `${r.unionPct.toFixed(1).padStart(5)}%`;
  console.log(` ${name} |  ${u}  |  ${i}  |  ${x}  | ${r.covered}/${r.total}`);
}
console.log('---------------------------|---------|---------|---------|--------');
const totalPct = unionTotal > 0 ? (unionCovered / unionTotal) * 100 : 0;
console.log(
  ` ${'TOTAL'.padEnd(25)} |         |         |  ${totalPct.toFixed(1).padStart(5)}%  | ${unionCovered}/${unionTotal}`
);
console.log();

// Write a compact JSON summary too.
const out = {
  total: { lines: { covered: unionCovered, total: unionTotal, pct: +totalPct.toFixed(2) } },
  files: rows.reduce((acc, r) => {
    acc[r.file] = {
      unit: r.unitPct == null ? null : +r.unitPct.toFixed(2),
      ui: r.uiPct == null ? null : +r.uiPct.toFixed(2),
      union: +r.unionPct.toFixed(2),
      coveredLines: r.covered,
      totalLines: r.total,
    };
    return acc;
  }, {}),
};
const outFile = resolve(root, 'coverage/unified-summary.json');
await writeFile(outFile, JSON.stringify(out, null, 2));
console.log(`✓ Unified summary written to coverage/unified-summary.json`);
console.log(
  `✓ HTML reports: coverage/unit/index.html (vitest) + coverage/ui/index.html (playwright)`
);
