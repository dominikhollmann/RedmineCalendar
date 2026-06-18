#!/usr/bin/env node
// Baseline-ratchet gate for duplicate-code detection (Constitution VII).
// Runs jscpd, reads the JSON report, and compares against dup-baseline.json.
// Fails (exit 1) if the current clone count or duplication percentage exceeds
// the baseline. A drop is allowed (and prints a reminder to update the baseline).
// Mirrors the structure of scripts/oss-drift-check.mjs (exported pure fn +
// invokedDirectly guard + clear console.error/exit(1)).

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const BASELINE_PATH = resolve(REPO_ROOT, 'dup-baseline.json');
const REPORT_PATH = resolve(REPO_ROOT, 'coverage/jscpd/jscpd-report.json');
const JSCPD_CONFIG = resolve(REPO_ROOT, '.jscpd.json');

/**
 * Run jscpd and return the parsed report. Throws on jscpd failure.
 * @param {string} root absolute path to repository root
 * @returns {object} parsed jscpd JSON report
 */
export function runJscpd(root) {
  const result = spawnSync('node_modules/.bin/jscpd', ['--config', JSCPD_CONFIG], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // jscpd exits non-zero when clones are found; that's expected — we gate
  // on baseline delta, not on presence. Only throw on missing binary etc.
  if (result.status !== 0 && !existsSync(REPORT_PATH)) {
    const stderr = result.stderr?.toString() ?? '';
    throw new Error(`jscpd failed to produce a report: ${stderr}`);
  }
  return JSON.parse(readFileSync(REPORT_PATH, 'utf8'));
}

/**
 * Read and validate the committed baseline file.
 * @param {string} baselinePath
 * @returns {{ clones: number, percentage: number }}
 */
function readBaseline(baselinePath) {
  if (!existsSync(baselinePath)) {
    console.error('::error::dup-baseline.json not found.');
    console.error('  Run "npm run dup:report" locally to generate it, then:');
    console.error(
      '  node scripts/dup-check.mjs --seed   (writes dup-baseline.json from latest report)'
    );
    console.error('  Commit dup-baseline.json before pushing.');
    process.exit(1);
  }
  const b = JSON.parse(readFileSync(baselinePath, 'utf8'));
  if (typeof b.clones !== 'number' || typeof b.percentage !== 'number') {
    console.error('::error::dup-baseline.json is malformed — expected { clones, percentage }');
    process.exit(1);
  }
  return b;
}

/**
 * Extract clone count and duplication percentage from jscpd report.
 * @param {object} report
 * @returns {{ clones: number, percentage: number }}
 */
function extractStats(report) {
  const stats = report?.statistics?.total ?? {};
  const clones = stats.clones ?? stats.cloneNumbers ?? 0;
  const percentage = stats.percentage ?? stats.duplicatedPercentage ?? 0;
  return { clones, percentage };
}

/**
 * Run the full ratchet check from a given repo root. Returns { ok, current, baseline }.
 * @param {string} root
 * @returns {{ ok: boolean, current: {clones:number,percentage:number}, baseline: {clones:number,percentage:number} }}
 */
export function runDupCheck(root) {
  const report = runJscpd(root);
  const baseline = readBaseline(BASELINE_PATH);
  const current = extractStats(report);
  const cloneIncrease = current.clones > baseline.clones;
  const percentageIncrease = current.percentage > baseline.percentage + 0.01;
  return {
    ok: !cloneIncrease && !percentageIncrease,
    current,
    baseline,
    cloneIncrease,
    percentageIncrease,
  };
}

function seed(root) {
  const report = runJscpd(root);
  const current = extractStats(report);
  writeFileSync(
    BASELINE_PATH,
    JSON.stringify({ clones: current.clones, percentage: current.percentage }, null, 2) + '\n'
  );
  console.log(
    `dup-baseline.json seeded: ${current.clones} clones, ${current.percentage.toFixed(2)}% duplication`
  );
}

function main() {
  if (process.argv.includes('--seed')) {
    seed(REPO_ROOT);
    return;
  }

  const { ok, current, baseline, cloneIncrease, percentageIncrease } = runDupCheck(REPO_ROOT);

  if (ok) {
    console.log(
      `dup:check OK — ${current.clones} clones (baseline ${baseline.clones}), ` +
        `${current.percentage.toFixed(2)}% (baseline ${baseline.percentage.toFixed(2)}%)`
    );
    if (current.clones < baseline.clones || current.percentage < baseline.percentage - 0.01) {
      console.log('  Duplication improved! Update dup-baseline.json: npm run dup:check --seed');
    }
    process.exit(0);
  }

  console.error('::error::Duplicate-code ratchet exceeded — Constitution VII violated');
  if (cloneIncrease) {
    console.error(
      `  Clones: ${current.clones} (baseline ${baseline.clones}) — ${current.clones - baseline.clones} new clone(s)`
    );
  }
  if (percentageIncrease) {
    console.error(
      `  Duplication: ${current.percentage.toFixed(2)}% (baseline ${baseline.percentage.toFixed(2)}%)`
    );
  }
  console.error('');
  console.error('  Review the full report: npm run dup:report → open coverage/jscpd/index.html');
  console.error('  Fix: extract the duplicated logic into a shared module (Constitution VII).');
  console.error('  If duplication is intentional, document it in the plan Complexity Tracking');
  console.error('  table and update the baseline: node scripts/dup-check.mjs --seed');
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
