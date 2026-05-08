#!/usr/bin/env node
// Aggregate per-test V8 coverage dumps from coverage/.tmp/playwright/ and
// print a per-module summary (lines touched / total) similar to vitest's
// text reporter. This is a deliberately small, dependency-free implementation
// — for richer reporting (HTML, merge with vitest), drop in
// monocart-coverage-reports later.
//
// V8 raw coverage entry shape:
//   { url, scriptId, source?, functions: [{ ranges: [{ startOffset, endOffset, count }] }] }
// We treat any byte-range with count > 0 as "covered" and report the
// covered-byte percentage per file.

import { readdir, readFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const COV_DIR   = resolve(__dirname, '../coverage/.tmp/playwright');

if (!existsSync(COV_DIR)) {
  console.error(`No Playwright coverage dumps found in ${COV_DIR}`);
  console.error('Run `PW_COVERAGE=1 npm run test:ui` first.');
  process.exit(1);
}

// per-module: { totalBytes, uncoveredRanges: [[start,end], ...] across runs }
const modules = new Map();

const files = (await readdir(COV_DIR)).filter(f => f.endsWith('.json'));
if (files.length === 0) {
  console.error(`No coverage-*.json files in ${COV_DIR}`);
  process.exit(1);
}

// V8 raw coverage semantics:
//   Each function entry has ranges. The first range covers the whole function;
//   subsequent ranges are nested blocks (branches). count===0 on the outermost
//   range means the function never executed; count===0 on a nested range means
//   that branch was not taken. We collect the count===0 ranges as "uncovered".
//   covered = totalBytes - union(uncoveredRanges).
//
// Per-test dumps must be intersected: a range only counts as uncovered if it
// is uncovered in EVERY test (intersection across runs). We approximate by
// keeping per-file uncovered ranges from each run separately and intersecting
// at report time.

for (const file of files) {
  const data = JSON.parse(await readFile(resolve(COV_DIR, file), 'utf8'));
  for (const entry of data) {
    const u = new URL(entry.url);
    const path = u.pathname;
    if (!path.startsWith('/js/')) continue;
    const mod = basename(path);
    let m = modules.get(mod);
    if (!m) {
      m = { totalBytes: 0, runs: [] };
      modules.set(mod, m);
    }
    const runUncovered = [];
    for (const fn of entry.functions ?? []) {
      for (const range of fn.ranges ?? []) {
        if (range.endOffset > m.totalBytes) m.totalBytes = range.endOffset;
        if (range.count === 0) {
          runUncovered.push([range.startOffset, range.endOffset]);
        }
      }
    }
    m.runs.push(runUncovered);
  }
}

function unionLength(ranges) {
  if (ranges.length === 0) return 0;
  ranges.sort((a, b) => a[0] - b[0]);
  let total = 0, curStart = ranges[0][0], curEnd = ranges[0][1];
  for (let i = 1; i < ranges.length; i++) {
    const [s, e] = ranges[i];
    if (s > curEnd) { total += curEnd - curStart; curStart = s; curEnd = e; }
    else if (e > curEnd) curEnd = e;
  }
  total += curEnd - curStart;
  return total;
}

// Intersect uncovered ranges across runs: a byte position is "uncovered" only
// if it is uncovered in EVERY run that loaded the file. Implemented as:
// uncovered_total = intersection_of(union(uncovered_in_run_i)) for all i.
function intersectUncoveredAcrossRuns(runs) {
  if (runs.length === 0) return 0;
  // Convert each run's uncovered ranges to a sorted, merged list
  const merged = runs.map(r => mergeRanges(r));
  // Intersect pairwise
  let acc = merged[0];
  for (let i = 1; i < merged.length; i++) acc = intersect(acc, merged[i]);
  return acc.reduce((sum, [s, e]) => sum + (e - s), 0);
}

function mergeRanges(ranges) {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const out = [sorted[0].slice()];
  for (let i = 1; i < sorted.length; i++) {
    const [s, e] = sorted[i];
    const last = out[out.length - 1];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

function intersect(a, b) {
  const out = [];
  let i = 0, j = 0;
  while (i < a.length && j < b.length) {
    const lo = Math.max(a[i][0], b[j][0]);
    const hi = Math.min(a[i][1], b[j][1]);
    if (lo < hi) out.push([lo, hi]);
    if (a[i][1] < b[j][1]) i++; else j++;
  }
  return out;
}

console.log();
console.log(' % Coverage report (Playwright UI tests, byte-range proxy for line coverage)');
console.log('-------------------|---------|----------');
console.log('File               | % Bytes | Covered / Total');
console.log('-------------------|---------|----------');
const rows = [];
let totalAll = 0, coveredAll = 0;
for (const [mod, m] of [...modules.entries()].sort()) {
  const uncovered = intersectUncoveredAcrossRuns(m.runs);
  const covered   = m.totalBytes - uncovered;
  const pct       = m.totalBytes > 0 ? (covered / m.totalBytes) * 100 : 0;
  rows.push({ mod, pct, covered, total: m.totalBytes });
  totalAll   += m.totalBytes;
  coveredAll += covered;
}
for (const r of rows) {
  const name = r.mod.length > 18 ? '...' + r.mod.slice(-15) : r.mod.padEnd(18);
  console.log(` ${name} | ${r.pct.toFixed(2).padStart(7)} | ${r.covered} / ${r.total}`);
}
console.log('-------------------|---------|----------');
const overall = totalAll > 0 ? (coveredAll / totalAll) * 100 : 0;
console.log(` All UI-touched modules | ${overall.toFixed(2)}% | ${coveredAll} / ${totalAll} bytes`);
console.log();
console.log(`(${files.length} per-test coverage dumps aggregated)`);
console.log();
console.log('Note: this metric is byte-range based, not line-based. Use it as a relative');
console.log('signal — modules with low %, that have no UI test coverage, are clear gaps.');
