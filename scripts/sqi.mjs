#!/usr/bin/env node
// Software Quality Index (SQI) — 8-metric composite scorer.
//
// Covers 7 structural metrics plus an 8th supply-chain metric (npm audit)
// as a single composite score:
//
//   1. Module cycles            — module dependency cycles (madge)
//   2. ACD                       — Lakos Average Component Dependency (madge graph)
//   3. Test coverage             — line% from coverage/unified-summary.json
//   4. Module size               — worst file's effective-LOC overage over the
//      soft 500 threshold (js + scripts + css, measured directly from disk by
//      collectModuleSizes), scaled by violation count (see moduleSizeScore)
//   5. Function length           — eslint max-lines-per-function violations
//   6. Cyclomatic complexity     — eslint complexity violations
//   7. Compiler warnings         — total eslint warnings + errors on js/**
//   8. Vulnerable dependencies   — worst severity from `npm audit` (supply-chain hygiene)
//
// Each raw value is normalized to 0-100 against a documented band, then combined
// using the WEIGHTS table below. Bands and weights live as constants — tune
// them as the codebase matures.
//
// CLI:
//   node scripts/sqi.mjs           → human-readable dashboard, exit 0 if ≥80
//   node scripts/sqi.mjs --json    → also writes coverage/sqi.json
//
// Exit code: 0 when composite ≥ 80 (GREEN), else 1. Per-metric strict gates are
// the dedicated checks (test:coverage thresholds, lint, etc.); SQI is the
// "is the project healthy overall?" view. The composite gate is a deliberate,
// code-reviewed constant — see bandFor() and Constitution Principle VI.

import { readFile, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const JSON_FLAG = process.argv.includes('--json');
const TTY = process.stdout.isTTY;

// ── Bands ──────────────────────────────────────────────────────────────────
// Each band is a sorted list of [rawValue, score] anchor points. Linear interp
// between anchors; clamp at endpoints. For "lower is better" metrics, anchors
// are increasing in raw value and decreasing in score (and vice versa).
const BANDS = {
  cycles: [
    [0, 100],
    [1, 50],
    [3, 0],
  ],
  // ACD lower cut-off widened 16 → 20 (2026-06-22, feature 048, owner decision).
  // DRY extraction inherently raises ACD: each shared module removes duplication
  // (jscpd ↓) but adds a dependency edge to every caller (coupling ↑). 048's three
  // extractions moved ACD 7.65 → 7.99 (score 83.5 → 80.2 under the old band). The
  // project explicitly prioritises DRY over ACD, so the band is re-anchored to give
  // headroom for future shared-module extraction rather than penalising it toward
  // the gate. This is a deliberate, documented policy change — NOT a silent re-tune
  // to dodge a failure (the metric was already passing). See plan.md Complexity
  // Tracking + Implementation Outcome.
  // 100-score anchor raised 6 → 8 (2026-07-06, feature 055 UAT follow-up, owner
  // decision). A single-purpose moduleSize extraction (js/time-entry-form-resize.js
  // — one dependency, one caller) moved ACD 8.75 → 8.92 (74 modules) and dropped
  // the per-metric score just under the 80 floor (79), despite the composite
  // staying comfortably GREEN and the extraction itself adding no meaningful
  // coupling. Same rationale as the 2026-06-22 change: a metric that vetoes any
  // additional well-factored module regardless of actual coupling shouldn't block
  // a genuine moduleSize fix. Deliberate, documented — see
  // specs/055-booking-modal-redesign/plan.md Complexity Tracking.
  acd: [
    [8, 100],
    [20, 0],
  ],
  coverage: [
    [50, 0],
    [95, 100],
  ],
  // moduleSize is keyed on the worst file's LOC-overage RATIO (effective LOC ÷
  // 500, the eslint max-lines threshold), NOT a raw violation count — so a file
  // at 2× the threshold materially outscores one just over it. See
  // moduleSizeScore() for the violation-count multiplier that completes FR-012.
  moduleSize: [
    [1.0, 100],
    [1.2, 80],
    [1.5, 50],
    [2.0, 20],
    [3.0, 0],
  ],
  funcSize: [
    [0, 100],
    [2, 80],
    [5, 50],
    [15, 0],
  ],
  complexity: [
    [0, 100],
    [2, 80],
    [5, 50],
    [15, 0],
  ],
  warnings: [
    [0, 100],
    [5, 80],
    [20, 50],
    [50, 0],
  ],
  // Vulnerabilities — score based on the WORST severity present, not raw count.
  // We pass the worst severity as a numeric tier:
  //   0 = none, 1 = low, 2 = moderate, 3 = high, 4 = critical
  vulnerabilities: [
    [0, 100],
    [1, 90],
    [2, 60],
    [3, 30],
    [4, 0],
  ],
};

// Per-metric floor: CI fails if any metric's score falls below these values.
// prettier-ignore
const METRIC_MINIMUMS = { cycles: 80, acd: 80, coverage: 80, moduleSize: 80, funcSize: 80, complexity: 80, warnings: 80, vulnerabilities: 80 };

// ── Weights ────────────────────────────────────────────────────────────────
// Justification: coverage gets the largest single slice because it's the only
// metric backed by per-file CI gates already; cycles + ACD + complexity together
// drive 45% (architecture matters more than file size); warnings + sizes + vulns
// round out the remaining 30% as "tidiness + supply-chain" indicators.
//
// Vulnerabilities is the 8th metric because npm-audit data
// is cheap to collect and a single critical vuln materially changes deployment
// risk. Coverage was trimmed from 25 → 20 to make room.
const WEIGHTS = {
  cycles: 15,
  acd: 15,
  coverage: 20,
  moduleSize: 10,
  funcSize: 10,
  complexity: 15,
  warnings: 5,
  vulnerabilities: 10,
};

// ── Bands → score helper (piecewise linear) ───────────────────────────────
function score(metric, rawValue) {
  if (rawValue == null || Number.isNaN(rawValue)) return null;
  const band = BANDS[metric];
  if (!band) return null;
  const ascending = band[0][1] > band[band.length - 1][1]; // score decreases as raw grows
  if (ascending) {
    if (rawValue <= band[0][0]) return band[0][1];
    if (rawValue >= band[band.length - 1][0]) return band[band.length - 1][1];
  } else {
    if (rawValue <= band[0][0]) return band[0][1];
    if (rawValue >= band[band.length - 1][0]) return band[band.length - 1][1];
  }
  for (let i = 1; i < band.length; i++) {
    const [x0, y0] = band[i - 1];
    const [x1, y1] = band[i];
    if (rawValue >= x0 && rawValue <= x1) {
      if (x1 === x0) return y0;
      const t = (rawValue - x0) / (x1 - x0);
      return Math.round(y0 + t * (y1 - y0));
    }
  }
  return null;
}

/**
 * Module-size score (FR-012). The worst file's LOC-overage ratio (effective LOC
 * ÷ 500) is the primary signal — read off the `moduleSize` band — and is then
 * scaled by a violation-count multiplier so that two oversized files score worse
 * than one. `worstLoc` is the effective line count from `effectiveLoc()` (blank
 * + comment lines excluded). Zero violations always scores 100.
 *
 * @param {number} violations  count of files over the soft 500 threshold
 * @param {number} worstLoc    effective LOC of the single worst offender
 * @returns {number} 0-100
 */
export function moduleSizeScore(violations, worstLoc) {
  if (!violations) return 100;
  const overage = score('moduleSize', worstLoc / 500);
  const multiplier = violations === 1 ? 1.0 : violations <= 3 ? 0.8 : 0.5;
  return Math.round(overage * multiplier);
}

// ── Cycles + ACD via madge ────────────────────────────────────────────────
async function collectGraphMetrics() {
  let madge;
  try {
    ({ default: madge } = await import('madge'));
  } catch {
    return {
      cycles: { raw: null, error: 'madge not installed (run npm install)' },
      acd: { raw: null, error: 'madge not installed (run npm install)' },
    };
  }
  const m = await madge(resolve(root, 'js'), { fileExtensions: ['js'] });
  const circular = m.circular();
  const graph = m.obj();

  // Lakos ACD: for each component M, |closure(M)| = M + every component reachable
  // via dependency edges. Average over all components. Lower = less coupled.
  const nodes = Object.keys(graph);
  let totalClosure = 0;
  for (const n of nodes) {
    const visited = new Set([n]);
    const stack = [n];
    while (stack.length) {
      const cur = stack.pop();
      for (const dep of graph[cur] || []) {
        if (!visited.has(dep)) {
          visited.add(dep);
          stack.push(dep);
        }
      }
    }
    totalClosure += visited.size;
  }
  const acd = nodes.length ? totalClosure / nodes.length : 0;

  return {
    cycles: { raw: circular.length, samples: circular.slice(0, 3) },
    acd: { raw: +acd.toFixed(2), modules: nodes.length },
  };
}

// ── Coverage ───────────────────────────────────────────────────────────────
async function collectCoverage() {
  const unified = resolve(root, 'coverage/unified-summary.json');
  const unitFinal = resolve(root, 'coverage/unit/coverage-final.json');
  if (existsSync(unified)) {
    const data = JSON.parse(await readFile(unified, 'utf8'));
    const pct = data?.total?.lines?.pct;
    if (typeof pct === 'number') return { raw: pct, source: 'unified-summary.json' };
  }
  if (existsSync(unitFinal)) {
    // Istanbul coverage-final shape: { "<file>": { s: { id: count }, statementMap: {...} } }
    const data = JSON.parse(await readFile(unitFinal, 'utf8'));
    let covered = 0,
      total = 0;
    for (const file of Object.values(data)) {
      const stmts = file?.s || {};
      for (const id of Object.keys(stmts)) {
        total++;
        if (stmts[id] > 0) covered++;
      }
    }
    const pct = total ? (covered / total) * 100 : 0;
    return { raw: +pct.toFixed(2), source: 'unit/coverage-final.json (statement %)' };
  }
  return { raw: null, error: 'no coverage file (run npm run test:coverage)' };
}

// ── ESLint scan (sizes / complexity / warnings) ───────────────────────────
function runEslintJson() {
  return new Promise((resolveP, rejectP) => {
    const proc = spawn('npx', ['--no-install', 'eslint', '--format', 'json', 'js/'], {
      cwd: root,
      env: process.env,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.stderr.on('data', (d) => (stderr += d));
    proc.on('close', (code) => {
      // ESLint exits 1 when there are errors but still emits valid JSON.
      try {
        resolveP(JSON.parse(stdout));
      } catch (e) {
        rejectP(new Error(`eslint json parse failed (exit ${code}): ${stderr || e.message}`));
      }
    });
    proc.on('error', rejectP);
  });
}

function tallyEslint(results) {
  let warnings = 0;
  let errors = 0;
  let funcLenViolations = 0;
  let complexityViolations = 0;
  let worstComplexity = 0;

  for (const file of results) {
    warnings += file.warningCount || 0;
    errors += file.errorCount || 0;
    for (const msg of file.messages || []) {
      if (msg.ruleId === 'max-lines-per-function') funcLenViolations++;
      if (msg.ruleId === 'complexity') {
        complexityViolations++;
        // Message format: "Function 'X' has a complexity of N. Maximum allowed is 15."
        const m = /complexity of (\d+)/.exec(msg.message);
        if (m && +m[1] > worstComplexity) worstComplexity = +m[1];
      }
    }
  }
  // Module size is measured directly from disk by collectModuleSizes() (js +
  // scripts + css, effective LOC) — not derived from eslint max-lines messages.
  return { warnings, errors, funcLenViolations, complexityViolations, worstComplexity };
}

// ── Module file-size scan (js + scripts + css) ─────────────────────────────
// One size policy across all source languages (FR: cross-language consistency):
//   • soft 500 — the SQI moduleSize band below scores files over this threshold.
//   • hard 600 — enforced as a CI/test failure by tests/unit/module-size.test.js.
// Both tiers count EFFECTIVE lines: blank lines and comments excluded, matching
// the eslint `max-lines` gate on js/** (`skipBlankLines + skipComments`).
const MODULE_SOFT_LINES = 500;
const SIZE_DIRS = ['js', 'scripts', 'css'];
const SIZE_EXT = /\.(js|mjs|css)$/;

/**
 * Effective line count: strip C-style block comments and `//` line comments,
 * then count lines that still carry non-whitespace. CSS has only block comments,
 * so the `//` pass is a harmless no-op there (a code line such as a `url(...)`
 * with `//` in it keeps the code before the `//`, so it is never miscounted).
 * @param {string} text
 * @returns {number}
 */
export function effectiveLoc(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .map((line) => line.replace(/\/\/.*$/, ''))
    .filter((line) => line.trim().length > 0).length;
}

// Uses withFileTypes so we get the directory-entry type from readdir directly,
// avoiding a separate stat() that would create a TOCTOU window before readFile.
async function collectModuleSizes() {
  const { readdir } = await import('node:fs/promises');
  let violations = 0;
  let worstLoc = 0; // largest effective LOC across all scanned files (for display)
  let worstVioLoc = 0; // largest effective LOC among violating files (for score)
  let worstFile = '';
  for (const sub of SIZE_DIRS) {
    const dir = resolve(root, sub);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.isFile() || !SIZE_EXT.test(entry.name) || entry.name === 'style.css') continue;
      const loc = effectiveLoc(await readFile(resolve(dir, entry.name), 'utf8'));
      const rel = `${sub}/${entry.name}`;
      if (loc > worstLoc) {
        worstLoc = loc;
        worstFile = rel;
      }
      if (loc > MODULE_SOFT_LINES) {
        violations++;
        if (loc > worstVioLoc) worstVioLoc = loc;
      }
    }
  }
  return { violations, worstLoc, worstVioLoc, worstFile };
}

// ── Vulnerabilities via npm audit ─────────────────────────────────────────
// Maps the worst severity present to the band's tier index (0-4).
const SEVERITY_TIER = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 };

function collectVulnerabilities() {
  return new Promise((resolveP) => {
    const proc = spawn('npm', ['audit', '--json'], { cwd: root, env: process.env });
    let stdout = '';
    proc.stdout.on('data', (d) => (stdout += d));
    proc.on('close', () => {
      try {
        const data = JSON.parse(stdout);
        const counts = data?.metadata?.vulnerabilities ?? {};
        let worstTier = 0;
        let worstName = 'none';
        for (const [name, n] of Object.entries(counts)) {
          if (n > 0 && (SEVERITY_TIER[name] ?? 0) > worstTier) {
            worstTier = SEVERITY_TIER[name];
            worstName = name;
          }
        }
        const total = Object.values(counts).reduce((s, n) => s + (n || 0), 0);
        resolveP({ raw: worstTier, total, worst: worstName, breakdown: counts });
      } catch {
        resolveP({ raw: null, error: 'npm audit unavailable' });
      }
    });
    proc.on('error', () => resolveP({ raw: null, error: 'npm audit failed to spawn' }));
  });
}

// ── ANSI ───────────────────────────────────────────────────────────────────
const C = TTY
  ? {
      reset: '\x1b[0m',
      bold: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      cyan: '\x1b[36m',
      magenta: '\x1b[35m',
    }
  : {
      reset: '',
      bold: '',
      dim: '',
      red: '',
      green: '',
      yellow: '',
      cyan: '',
      magenta: '',
    };

// Composite-score banding. The GREEN threshold is the merge gate (Constitution
// Principle VI). Raising it is a deliberate, code-reviewed act — feature 035
// (FR-015) lifted it from 60 to 80 once the pre-handover cleanup cleared the bar.
const GREEN_MIN = 80;
const YELLOW_MIN = 50;
const RED_MIN = 10;

export function bandFor(composite) {
  if (composite >= GREEN_MIN) {
    return { label: 'GREEN', color: C.green, note: 'no / minor action needed' };
  }
  if (composite >= YELLOW_MIN) {
    return { label: 'YELLOW', color: C.yellow, note: 'significant problems' };
  }
  if (composite >= RED_MIN) return { label: 'RED', color: C.red, note: 'stop development' };
  return { label: 'BLACK', color: C.magenta, note: 'rewrite' };
}

// ── Main ───────────────────────────────────────────────────────────────────
// Run only when invoked as a script — importing the module (e.g. from the SQI
// unit tests) must not trigger the madge / eslint / npm-audit collection or the
// process.exit below. A plain `if` block (not a function) keeps the executable
// body out of the `complexity` rule's scope.
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const startedAt = new Date().toISOString();

  const [graph, coverage, eslintResults, vulns, moduleSizes] = await Promise.all([
    collectGraphMetrics(),
    collectCoverage(),
    runEslintJson().catch((e) => ({ __error: e.message })),
    collectVulnerabilities(),
    collectModuleSizes().catch(() => ({
      violations: 0,
      worstLoc: 0,
      worstVioLoc: 0,
      worstFile: '',
    })),
  ]);

  let lintTally;
  let lintError = null;
  if (eslintResults && eslintResults.__error) {
    lintError = eslintResults.__error;
    lintTally = {
      warnings: null,
      errors: null,
      funcLenViolations: null,
      complexityViolations: null,
      worstComplexity: null,
    };
  } else {
    lintTally = tallyEslint(eslintResults);
  }

  // Compose metric records: name, raw, score, weight
  const metrics = [
    {
      key: 'cycles',
      label: 'Module cycles',
      raw: graph.cycles.raw,
      rawDisplay: graph.cycles.raw == null ? 'N/A' : `${graph.cycles.raw} cycle(s)`,
      detail:
        graph.cycles.error ||
        (graph.cycles.samples?.length ? `e.g. ${graph.cycles.samples[0].join(' → ')}` : 'none'),
    },
    {
      key: 'acd',
      label: 'ACD (Lakos)',
      raw: graph.acd.raw,
      rawDisplay:
        graph.acd.raw == null ? 'N/A' : `${graph.acd.raw} (over ${graph.acd.modules} modules)`,
      detail: graph.acd.error || 'avg transitive deps per component',
    },
    {
      key: 'coverage',
      label: 'Test Coverage (lines)',
      raw: coverage.raw,
      rawDisplay: coverage.raw == null ? 'N/A' : `${coverage.raw.toFixed(2)} %`,
      detail: coverage.error || coverage.source,
    },
    {
      key: 'moduleSize',
      label: 'Module size (effective LOC)',
      // Effective-LOC violations over the soft 500 threshold across js + scripts + css.
      raw: moduleSizes.violations,
      rawDisplay: (() => {
        if (moduleSizes.violations === 0)
          return `0 file(s) over ${MODULE_SOFT_LINES}; worst=${moduleSizes.worstLoc} LOC`;
        return (
          `${moduleSizes.violations} file(s) over ${MODULE_SOFT_LINES}; ` +
          `worst=${moduleSizes.worstVioLoc} LOC ` +
          `(${(moduleSizes.worstVioLoc / MODULE_SOFT_LINES).toFixed(2)}×)`
        );
      })(),
      detail:
        lintError ||
        `worst: ${moduleSizes.worstFile || 'none'} (soft ${MODULE_SOFT_LINES} / hard 600)`,
    },
    {
      key: 'funcSize',
      label: 'Function length (max-lines-per-function)',
      raw: lintTally.funcLenViolations,
      rawDisplay:
        lintTally.funcLenViolations == null ? 'N/A' : `${lintTally.funcLenViolations} function(s)`,
      detail: lintError || 'eslint warnings on js/**',
    },
    {
      key: 'complexity',
      label: 'Cyclomatic complexity',
      raw: lintTally.complexityViolations,
      rawDisplay:
        lintTally.complexityViolations == null
          ? 'N/A'
          : `${lintTally.complexityViolations} function(s); worst=${lintTally.worstComplexity}`,
      detail: lintError || 'eslint warnings on js/**',
    },
    {
      key: 'warnings',
      label: 'Compiler warnings (eslint)',
      raw: lintTally.warnings == null ? null : lintTally.warnings + lintTally.errors,
      rawDisplay:
        lintTally.warnings == null ? 'N/A' : `${lintTally.warnings} warn + ${lintTally.errors} err`,
      detail: lintError || 'all eslint problems on js/**',
    },
    {
      key: 'vulnerabilities',
      label: 'Vulnerable dependencies (npm audit)',
      raw: vulns.raw,
      rawDisplay:
        vulns.raw == null
          ? 'N/A'
          : vulns.total === 0
            ? 'none'
            : `${vulns.total} total; worst=${vulns.worst}`,
      detail:
        vulns.error ||
        (vulns.breakdown
          ? Object.entries(vulns.breakdown)
              .filter(([, n]) => n > 0)
              .map(([k, n]) => `${n} ${k}`)
              .join(', ') || 'clean'
          : ''),
    },
  ];

  for (const m of metrics) {
    m.weight = WEIGHTS[m.key];
    // moduleSize uses the FR-012 worst-file-overage scorer; every other metric
    // reads its score straight off its band.
    m.score =
      m.key === 'moduleSize'
        ? moduleSizeScore(moduleSizes.violations, moduleSizes.worstVioLoc)
        : score(m.key, m.raw);
    m.contribution = m.score == null ? null : +((m.score * m.weight) / 100).toFixed(2);
  }

  // Composite: weighted average of available metrics. If a metric is N/A, its
  // weight is dropped from the denominator (so missing coverage doesn't tank the
  // score — it just narrows the basis).
  const available = metrics.filter((m) => m.score != null);
  const weightSum = available.reduce((a, m) => a + m.weight, 0);
  const weightedTotal = available.reduce((a, m) => a + (m.score * m.weight) / 100, 0);
  const composite = weightSum > 0 ? +((weightedTotal * 100) / weightSum).toFixed(2) : 0;
  const band = bandFor(composite);

  // ── Text dashboard ────────────────────────────────────────────────────────
  function renderText() {
    const lines = [];
    lines.push('');
    lines.push(`${C.bold}Software Quality Index (SQI) — 8-metric composite${C.reset}`);
    lines.push(`${C.dim}Generated ${startedAt}${C.reset}`);
    lines.push('');
    const head =
      ' Metric                                  | Raw                                   | Score | Wt | Contrib';
    const sep =
      '-----------------------------------------|---------------------------------------|-------|----|--------';
    lines.push(head);
    lines.push(sep);
    for (const m of metrics) {
      const name = m.label.padEnd(40);
      const raw = m.rawDisplay.padEnd(38);
      const sc = m.score == null ? '  N/A' : String(m.score).padStart(5);
      const wt = String(m.weight).padStart(2);
      const co = m.contribution == null ? '   —  ' : m.contribution.toFixed(2).padStart(6);
      lines.push(` ${name}| ${raw}| ${sc} | ${wt} | ${co}`);
      if (m.detail) lines.push(`   ${C.dim}${m.detail}${C.reset}`);
    }
    lines.push(sep);
    lines.push('');
    lines.push(
      `   ${C.bold}COMPOSITE${C.reset} = ${C.bold}${composite.toFixed(2)} / 100${C.reset}   ` +
        `${band.color}${C.bold}[${band.label}]${C.reset} ${C.dim}${band.note}${C.reset}`
    );
    lines.push(
      `   ${C.dim}Bands: ≥${GREEN_MIN} GREEN · ${YELLOW_MIN}-${GREEN_MIN} YELLOW · ` +
        `${RED_MIN}-${YELLOW_MIN} RED · <${RED_MIN} BLACK${C.reset}`
    );
    lines.push('');
    return lines.join('\n');
  }

  console.log(renderText());

  // ── JSON output ───────────────────────────────────────────────────────────
  if (JSON_FLAG) {
    const payload = {
      timestamp: startedAt,
      composite,
      band: band.label,
      bandNote: band.note,
      weights: WEIGHTS,
      bands: BANDS,
      metrics: metrics.map((m) => ({
        key: m.key,
        label: m.label,
        raw: m.raw,
        rawDisplay: m.rawDisplay,
        detail: m.detail,
        score: m.score,
        weight: m.weight,
        contribution: m.contribution,
      })),
    };
    const outFile = resolve(root, 'coverage/sqi.json');
    await writeFile(outFile, JSON.stringify(payload, null, 2));
    console.log(`✓ SQI report written to coverage/sqi.json`);
  }

  // Per-metric gate: fail if any individual metric falls below its minimum.
  const failedMetrics = available.filter(
    (m) => (m.score ?? 0) < (METRIC_MINIMUMS[m.key] ?? GREEN_MIN)
  );
  if (failedMetrics.length > 0) {
    const names = failedMetrics.map((m) => `${m.label} (${m.score})`).join(', ');
    console.error(`\n  ✗ Per-metric gate failed: ${names}\n`);
  }

  // Exit non-zero below the GREEN threshold or when any per-metric gate fails.
  process.exit(composite >= GREEN_MIN && failedMetrics.length === 0 ? 0 : 1);
}
