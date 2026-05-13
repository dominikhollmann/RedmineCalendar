#!/usr/bin/env node
/**
 * One-shot migration: BACKLOG.md → GitHub Issues.
 *
 * For each table row in BACKLOG.md, emits one Issue per
 * `specs/032-speckit-workflow-audit/contracts/github-issue-schema.md`.
 *
 * Idempotent: skips features that already have a `Feature NNN:` Issue.
 * Re-runs after Phase 5d's folder rename will body-patch stale `.specify/features/`
 * links to `specs/` via the same body-rewrite path.
 *
 * Usage:
 *   node scripts/migrate-backlog-to-issues.mjs              # live run
 *   node scripts/migrate-backlog-to-issues.mjs --dry-run    # print actions, no API calls
 *   node scripts/migrate-backlog-to-issues.mjs --only 028   # one feature only (debug)
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY_FLAG = args.indexOf('--only');
const ONLY = ONLY_FLAG >= 0 ? args[ONLY_FLAG + 1] : null;

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = resolve(ROOT, 'BACKLOG.md');
const MIGRATION_DATE = new Date().toISOString().slice(0, 10);

const FEATURES_DIR_CANDIDATES = ['specs', '.specify/features']; // post- + pre-rename

function sh(cmd, args, { stdin = null } = {}) {
  return execFileSync(cmd, args, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: ROOT,
    input: stdin ?? undefined,
  });
}

function parseBacklog() {
  if (!existsSync(BACKLOG)) {
    console.error(`Not found: ${BACKLOG}`);
    process.exit(1);
  }
  const lines = readFileSync(BACKLOG, 'utf8').split('\n');
  const rows = [];
  let section = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const sh = line.match(/^##\s+(.+)$/);
    if (sh) {
      section = sh[1].toLowerCase();
      continue;
    }
    if (!line.startsWith('|')) continue;
    if (line.match(/^\|\s*-+\s*\|/)) continue; // separator row
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 9) continue;
    const numMatch = cells[0].match(/^\s*(\d+)\s*$/);
    if (!numMatch) continue;
    const num = numMatch[1].padStart(3, '0');
    rows.push({
      num,
      title: cells[1],
      specify: cells[2],
      clarify: cells[3],
      plan: cells[4],
      tasks: cells[5],
      implement: cells[6],
      uat: cells[7],
      status: cells[8],
      version: cells[9] ?? '',
      section: section || '',
    });
  }
  return rows;
}

function highestStatus(row) {
  // Walk from "uat" → "specify"; the first ✅ is the highest reached stage.
  const order = ['uat', 'implement', 'tasks', 'plan', 'clarify', 'specify'];
  for (const stage of order) {
    if ((row[stage] || '').includes('✅')) return stage;
  }
  return 'specify';
}

function findFeatureDir(num) {
  for (const base of FEATURES_DIR_CANDIDATES) {
    const baseDir = resolve(ROOT, base);
    if (!existsSync(baseDir)) continue;
    try {
      const entries = sh('ls', ['-1', baseDir]).split('\n').filter(Boolean);
      const match = entries.find((e) => e.startsWith(`${num}-`));
      if (match) return { base, name: match, rel: `${base}/${match}` };
    } catch {
      /* ignore */
    }
  }
  return null;
}

function buildBody(row) {
  const fd = findFeatureDir(row.num);
  const specPath = fd ? `${fd.rel}/spec.md` : `specs/${row.num}-<unknown>/spec.md`;
  const planPath = fd ? `${fd.rel}/plan.md` : null;
  const tasksPath = fd ? `${fd.rel}/tasks.md` : null;
  const quickPath = fd ? `${fd.rel}/quickstart.md` : null;

  // Try to read a Summary or first paragraph from spec.md.
  let summary = '';
  if (fd && existsSync(resolve(ROOT, specPath))) {
    const spec = readFileSync(resolve(ROOT, specPath), 'utf8');
    // Try a literal "## Summary" heading first.
    const sumMatch = spec.match(/^##\s+Summary\s*\n([\s\S]+?)(?=^##|$)/m);
    if (sumMatch) {
      summary = sumMatch[1].trim().split('\n\n')[0].trim();
    } else {
      // Fall back to first non-heading paragraph after the title.
      const afterTitle = spec.replace(/^#[^\n]*\n+/, '');
      const firstPara = afterTitle
        .split('\n\n')
        .find((p) => !p.startsWith('#') && p.trim().length > 0);
      if (firstPara) summary = firstPara.trim();
    }
    // Cap at ~3 sentences / ~600 chars to avoid bloated Issue bodies.
    if (summary.length > 600) summary = summary.slice(0, 600).trim() + '…';
  }
  if (!summary) summary = `(Migrated from BACKLOG.md — see spec for context.)`;

  const artifacts = [`- Spec: [\`${specPath}\`](${specPath})`];
  if (planPath && existsSync(resolve(ROOT, planPath))) {
    artifacts.push(`- Plan: [\`${planPath}\`](${planPath})`);
  }
  if (tasksPath && existsSync(resolve(ROOT, tasksPath))) {
    artifacts.push(`- Tasks: [\`${tasksPath}\`](${tasksPath})`);
  }
  if (quickPath && existsSync(resolve(ROOT, quickPath))) {
    artifacts.push(`- Quickstart: [\`${quickPath}\`](${quickPath})`);
  }

  return [
    `## Summary`,
    ``,
    summary,
    ``,
    `## Spec Kit artifacts`,
    ``,
    artifacts.join('\n'),
    ``,
    `## Lifecycle`,
    ``,
    `Tracked by labels (see \`status:*\`). PR will close this issue on merge via the \`Closes #N\` convention.`,
    ``,
    `---`,
    ``,
    `_Migrated from \`BACKLOG.md\` by \`scripts/migrate-backlog-to-issues.mjs\` on ${MIGRATION_DATE}._`,
    `_Original BACKLOG row state: ${row.section || '(unknown section)'} · ${row.status}_`,
  ].join('\n');
}

function ghIssueExists(num) {
  try {
    const out = sh('gh', [
      'issue',
      'list',
      '--label',
      'feature',
      '--search',
      `in:title "Feature ${num}:"`,
      '--state',
      'all',
      '--json',
      'number',
      '--jq',
      '.[0].number // empty',
    ]);
    return out.trim() ? parseInt(out.trim(), 10) : null;
  } catch (e) {
    console.error(`gh issue list failed for #${num}: ${e.message}`);
    return null;
  }
}

function ghIssueCreate({ num, title, body, labels }) {
  if (DRY_RUN) {
    console.log(
      `  [dry-run] gh issue create --title "Feature ${num}: ${title}" --label ${labels.join(',')}`
    );
    return null;
  }
  const args = ['issue', 'create', '--title', `Feature ${num}: ${title}`, '--body', body];
  for (const l of labels) args.push('--label', l);
  const out = sh('gh', args);
  const m = out.match(/\/issues\/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function ghIssueClose({ number, comment }) {
  if (DRY_RUN) {
    console.log(`  [dry-run] gh issue close ${number} --reason completed`);
    if (comment)
      console.log(`  [dry-run] gh issue comment ${number} --body "${comment.slice(0, 60)}…"`);
    return;
  }
  sh('gh', ['issue', 'close', String(number), '--reason', 'completed']);
  if (comment) sh('gh', ['issue', 'comment', String(number), '--body', comment]);
}

function ghIssueEditBody({ number, body }) {
  if (DRY_RUN) {
    console.log(`  [dry-run] gh issue edit ${number} --body <updated body for stale-link patch>`);
    return;
  }
  sh('gh', ['issue', 'edit', String(number), '--body', body]);
}

function ensureLabels(rows) {
  if (DRY_RUN) return;
  const versionLabels = new Set();
  for (const r of rows) {
    const m = (r.version || '').match(/^(v?\d+\.\d+\.\d+|pre-\d+\.\d+)/);
    if (m) versionLabels.add(`version:${m[1]}`);
  }

  const desired = [
    ['feature', 'a8d5ff', 'Feature tracked via Spec Kit workflow'],
    ['status:specify', 'fef2c0', '/speckit.specify complete'],
    ['status:clarify', 'fef2c0', '/speckit.clarify complete'],
    ['status:plan', 'fbca04', '/speckit.plan complete'],
    ['status:tasks', 'fbca04', '/speckit.tasks complete'],
    ['status:implement', 'd4c5f9', '/speckit.implement in progress'],
    ['status:uat', 'c5def5', '/speckit.uat.run in progress'],
    ['status:done', '0e8a16', 'PR merged'],
    ['status:planned', 'cccccc', 'Spec written; deferred'],
    ...[...versionLabels].map((l) => [l, 'ededed', `Shipped in ${l.replace(/^version:/, '')}`]),
  ];
  for (const [name, color, desc] of desired) {
    try {
      sh('gh', ['label', 'create', name, '--color', color, '--description', desc, '--force']);
    } catch {
      /* tolerated — label already exists is non-fatal */
    }
  }
}

function migrateRow(row) {
  const num = row.num;
  const title = row.title.replace(/\s+/g, ' ').trim();
  const isDone = (row.section || '').includes('done');
  const isPlanned = !isDone && /^\s*planned/i.test(row.status);
  const reached = isDone ? 'done' : isPlanned ? 'planned' : highestStatus(row);

  const existing = ghIssueExists(num);
  const body = buildBody(row);

  if (existing) {
    // Idempotency path: body-patch stale links if needed (re-run after Phase 5d's rename).
    console.log(
      `  Feature ${num}: existing Issue #${existing} — patching body for path consistency`
    );
    ghIssueEditBody({ number: existing, body });
    return { num, action: 'patch', issue: existing };
  }

  const labels = ['feature', `status:${reached}`];
  // Version label only for Done rows with a recognised version.
  const versionMatch = (row.version || '').match(/^(v?\d+\.\d+\.\d+|pre-\d+\.\d+)/);
  if (isDone && versionMatch) {
    const v = versionMatch[1].startsWith('v') ? versionMatch[1] : versionMatch[1];
    labels.push(`version:${v}`);
  }

  console.log(`  Feature ${num}: creating Issue (labels: ${labels.join(', ')})`);
  const number = ghIssueCreate({ num, title, body, labels });

  if (isDone && number) {
    ghIssueClose({
      number,
      comment: `Migrated from BACKLOG.md by \`scripts/migrate-backlog-to-issues.mjs\` on ${MIGRATION_DATE}. See spec for details.`,
    });
  } else if (number && !DRY_RUN) {
    // Single migration-note comment for in-flight rows (Done rows get it via the close step).
    sh('gh', [
      'issue',
      'comment',
      String(number),
      '--body',
      `Migrated from BACKLOG.md by \`scripts/migrate-backlog-to-issues.mjs\` on ${MIGRATION_DATE}.`,
    ]);
  }

  return { num, action: 'create', issue: number };
}

function main() {
  const rows = parseBacklog();
  const filtered = ONLY ? rows.filter((r) => r.num === ONLY.padStart(3, '0')) : rows;

  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Rows to process: ${filtered.length}${ONLY ? ` (filtered to ${ONLY})` : ''}`);
  console.log('');

  if (!DRY_RUN) {
    ensureLabels(rows);
  }

  const results = { created: 0, patched: 0, skipped: 0, errors: 0 };
  for (const row of filtered) {
    try {
      const r = migrateRow(row);
      if (r.action === 'create') results.created++;
      else if (r.action === 'patch') results.patched++;
      else results.skipped++;
    } catch (e) {
      console.error(`ERROR on Feature ${row.num}: ${e.message}`);
      results.errors++;
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  created: ${results.created}`);
  console.log(`  patched (body update): ${results.patched}`);
  console.log(`  skipped: ${results.skipped}`);
  console.log(`  errors:  ${results.errors}`);
}

main();
