#!/usr/bin/env node
/**
 * Recovery script: takes the 40 unlabeled Issues produced by an aborted
 * `migrate-backlog-to-issues.mjs` run and brings them into a known-good
 * state without needing a token that can close/delete issues.
 *
 *   1. Lists every Issue with title `^Feature \d{3}:` (across BOTH runs).
 *   2. For each feature number, keeps the LOWEST-numbered Issue as canonical
 *      (lowest = first created, regardless of run); marks higher-numbered
 *      duplicates with the `duplicate` label + a comment pointing at canonical.
 *   3. Applies the right `feature` + `status:*` + `version:*` labels to the
 *      canonical Issue, derived from BACKLOG.md.
 *   4. Patches the body to migration-formatted content.
 *
 * After this runs, `migrate-backlog-to-issues.mjs`'s idempotency guard will
 * find every feature already covered and skip them on any future re-run.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG = resolve(ROOT, 'BACKLOG.md');
const MIGRATION_DATE = new Date().toISOString().slice(0, 10);
const FEATURES_DIR_CANDIDATES = ['specs', '.specify/features'];

function sh(cmd, args) {
  return execFileSync(cmd, args, { encoding: 'utf8', cwd: ROOT });
}

function parseBacklog() {
  const lines = readFileSync(BACKLOG, 'utf8').split('\n');
  const rows = [];
  let section = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    const sh = line.match(/^##\s+(.+)$/);
    if (sh) { section = sh[1].toLowerCase(); continue; }
    if (!line.startsWith('|')) continue;
    if (line.match(/^\|\s*-+\s*\|/)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 9) continue;
    const numMatch = cells[0].match(/^\s*(\d+)\s*$/);
    if (!numMatch) continue;
    rows.push({
      num: numMatch[1].padStart(3, '0'),
      title: cells[1],
      specify: cells[2], clarify: cells[3], plan: cells[4],
      tasks: cells[5], implement: cells[6], uat: cells[7],
      status: cells[8], version: cells[9] ?? '',
      section: section || '',
    });
  }
  return rows;
}

function highestStatus(row) {
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
    } catch { /* ignore */ }
  }
  return null;
}

function buildBody(row) {
  const fd = findFeatureDir(row.num);
  const specPath = fd ? `${fd.rel}/spec.md` : `.specify/features/${row.num}-<unknown>/spec.md`;
  const planPath = fd ? `${fd.rel}/plan.md` : null;
  const tasksPath = fd ? `${fd.rel}/tasks.md` : null;
  const quickPath = fd ? `${fd.rel}/quickstart.md` : null;

  let summary = '';
  if (fd && existsSync(resolve(ROOT, specPath))) {
    const spec = readFileSync(resolve(ROOT, specPath), 'utf8');
    const sumMatch = spec.match(/^##\s+Summary\s*\n([\s\S]+?)(?=^##|\Z)/m);
    if (sumMatch) {
      summary = sumMatch[1].trim().split('\n\n')[0].trim();
    } else {
      const afterTitle = spec.replace(/^#[^\n]*\n+/, '');
      const firstPara = afterTitle.split('\n\n').find((p) => !p.startsWith('#') && p.trim().length > 0);
      if (firstPara) summary = firstPara.trim();
    }
    if (summary.length > 600) summary = summary.slice(0, 600).trim() + '…';
  }
  if (!summary) summary = `(Migrated from BACKLOG.md — see spec for context.)`;

  const artifacts = [`- Spec: [\`${specPath}\`](${specPath})`];
  if (planPath && existsSync(resolve(ROOT, planPath))) artifacts.push(`- Plan: [\`${planPath}\`](${planPath})`);
  if (tasksPath && existsSync(resolve(ROOT, tasksPath))) artifacts.push(`- Tasks: [\`${tasksPath}\`](${tasksPath})`);
  if (quickPath && existsSync(resolve(ROOT, quickPath))) artifacts.push(`- Quickstart: [\`${quickPath}\`](${quickPath})`);

  return [
    `## Summary`, ``, summary, ``,
    `## Spec Kit artifacts`, ``, artifacts.join('\n'), ``,
    `## Lifecycle`, ``,
    `Tracked by labels (see \`status:*\`). PR will close this issue on merge via the \`Closes #N\` convention.`,
    ``, `---`, ``,
    `_Migrated from \`BACKLOG.md\` by \`scripts/migrate-backlog-to-issues.mjs\` on ${MIGRATION_DATE}._`,
    `_Original BACKLOG row state: ${row.section || '(unknown section)'} · ${row.status}_`,
  ].join('\n');
}

function listAllFeatureLikeIssues() {
  // Without label filter — the orphans don't have `feature` yet.
  const out = sh('gh', [
    'issue', 'list',
    '--state', 'all',
    '--limit', '200',
    '--search', 'Feature in:title',
    '--json', 'number,title,labels',
  ]);
  const data = JSON.parse(out);
  return data
    .map((i) => {
      const m = i.title.match(/^Feature\s+(\d{3}):/);
      return m ? { issue: i.number, num: m[1], title: i.title, labels: i.labels.map((l) => l.name) } : null;
    })
    .filter(Boolean);
}

function applyLabels({ issue, add = [], remove = [] }) {
  if (DRY_RUN) {
    console.log(`  [dry-run] gh issue edit #${issue} ${add.length ? '+add: ' + add.join(',') : ''}${remove.length ? ' -rm: ' + remove.join(',') : ''}`);
    return;
  }
  const cmd = ['issue', 'edit', String(issue)];
  for (const l of add) cmd.push('--add-label', l);
  for (const l of remove) cmd.push('--remove-label', l);
  if (add.length + remove.length === 0) return;
  sh('gh', cmd);
}

function setBody({ issue, body }) {
  if (DRY_RUN) {
    console.log(`  [dry-run] gh issue edit #${issue} --body <migration body>`);
    return;
  }
  sh('gh', ['issue', 'edit', String(issue), '--body', body]);
}

function postComment({ issue, body }) {
  if (DRY_RUN) {
    console.log(`  [dry-run] gh issue comment #${issue}: ${body.slice(0, 80)}…`);
    return;
  }
  sh('gh', ['issue', 'comment', String(issue), '--body', body]);
}

function main() {
  const rows = parseBacklog();
  const rowByNum = new Map(rows.map((r) => [r.num, r]));
  const issues = listAllFeatureLikeIssues();

  // Group by feature number; sort each group ascending (lowest # = canonical).
  const byNum = new Map();
  for (const it of issues) {
    if (!byNum.has(it.num)) byNum.set(it.num, []);
    byNum.get(it.num).push(it);
  }
  for (const arr of byNum.values()) arr.sort((a, b) => a.issue - b.issue);

  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  console.log(`Found ${issues.length} Issue(s) with "Feature NNN:" title across ${byNum.size} unique feature(s).`);
  console.log('');

  const stats = { canonical: 0, duplicates: 0, body_patched: 0, missing_row: 0 };

  for (const [num, group] of [...byNum.entries()].sort()) {
    const row = rowByNum.get(num);
    if (!row) {
      console.log(`Feature ${num}: no matching BACKLOG row — leaving untouched`);
      stats.missing_row += group.length;
      continue;
    }
    const [canonical, ...dups] = group;
    const isDone = (row.section || '').includes('done');
    const isPlanned = !isDone && /^\s*planned/i.test(row.status);
    const reached = isDone ? 'done' : isPlanned ? 'planned' : highestStatus(row);

    const labelsToAdd = ['feature', `status:${reached}`];
    const m = (row.version || '').match(/^(v?\d+\.\d+\.\d+|pre-\d+\.\d+)/);
    if (isDone && m) labelsToAdd.push(`version:${m[1]}`);

    // Strip any wrong status:* already on the canonical Issue.
    const labelsToRemove = canonical.labels.filter((l) => l.startsWith('status:') && l !== `status:${reached}`);

    console.log(`Feature ${num}: canonical #${canonical.issue} (+${labelsToAdd.join(',')}${labelsToRemove.length ? ' -' + labelsToRemove.join(',') : ''})`);
    applyLabels({ issue: canonical.issue, add: labelsToAdd, remove: labelsToRemove });
    setBody({ issue: canonical.issue, body: buildBody(row) });
    stats.canonical++;
    stats.body_patched++;

    for (const d of dups) {
      console.log(`  duplicate #${d.issue} → labeling as duplicate of #${canonical.issue}`);
      applyLabels({ issue: d.issue, add: ['duplicate'] });
      postComment({
        issue: d.issue,
        body: `Duplicate of #${canonical.issue} — created during an aborted BACKLOG → Issues migration run. The token used at migration time lacked \`issues:write\` close permission; this Issue cannot be closed by automation and must be closed manually.`,
      });
      stats.duplicates++;
    }
  }

  // Sanity: print which BACKLOG rows have NO Issue yet.
  const missing = [...rowByNum.keys()].filter((num) => !byNum.has(num));
  if (missing.length > 0) {
    console.log('');
    console.log(`BACKLOG rows without a matching Issue (will need a manual /github-issues.create run):`);
    for (const num of missing) console.log(`  Feature ${num}: ${rowByNum.get(num).title}`);
  }

  console.log('');
  console.log('Summary:');
  console.log(`  canonical relabelled: ${stats.canonical}`);
  console.log(`  duplicate marked:    ${stats.duplicates}`);
  console.log(`  body patches:        ${stats.body_patched}`);
  console.log(`  unmatched (kept):    ${stats.missing_row}`);
  console.log(`  missing from repo:   ${missing.length}`);
}

main();
