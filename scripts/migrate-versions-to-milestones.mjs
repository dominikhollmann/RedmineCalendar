#!/usr/bin/env node
/**
 * One-shot migration: `version:vX.Y.Z` labels → GitHub Milestones.
 *
 * For each `version:*` label currently on the repo:
 *   1. Create a matching Milestone (idempotent — skip if title already exists).
 *   2. For every Issue carrying that label, assign the Milestone.
 *   3. Optionally remove the label (`--delete-labels` flag) once verified.
 *
 * The `version:pre-1.0` label is intentionally skipped — it's a historical
 * marker for features that shipped before SemVer, and a Milestone named
 * `pre-1.0` would clash with the SemVer pattern expected by release.yml.
 * Those Issues keep their existing label as a historical reference.
 *
 * Usage:
 *   node scripts/migrate-versions-to-milestones.mjs --dry-run
 *   node scripts/migrate-versions-to-milestones.mjs              # live
 *   node scripts/migrate-versions-to-milestones.mjs --delete-labels  # also drop version:* labels after migration
 */

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DELETE_LABELS = args.includes('--delete-labels');

function sh(cmd, argv) {
  return execFileSync(cmd, argv, { encoding: 'utf8' });
}

function gh(...argv) {
  return sh('gh', argv).trim();
}

function repo() {
  return gh('repo', 'view', '--json', 'nameWithOwner', '--jq', '.nameWithOwner');
}

function listVersionLabels(r) {
  const out = gh(
    'label',
    'list',
    '--repo',
    r,
    '--limit',
    '200',
    '--search',
    'version:',
    '--json',
    'name'
  );
  return JSON.parse(out)
    .map((l) => l.name)
    .filter((n) => /^version:/.test(n));
}

function listMilestones(r) {
  const out = gh(
    'api',
    `repos/${r}/milestones?state=all&per_page=100`,
    '--jq',
    '.[] | {number, title}'
  );
  // jq prints one object per line; parse each.
  return out
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

function ensureMilestone(r, title, existingByTitle) {
  if (existingByTitle.has(title)) {
    const m = existingByTitle.get(title);
    console.log(`  milestone "${title}" exists (#${m.number}) — skipping create`);
    return m.number;
  }
  if (DRY_RUN) {
    console.log(`  [dry-run] would create milestone "${title}"`);
    return null;
  }
  const out = gh(
    'api',
    `repos/${r}/milestones`,
    '-X',
    'POST',
    '-f',
    `title=${title}`,
    '-f',
    'state=closed',
    '-f',
    'description=Migrated from version:* label by scripts/migrate-versions-to-milestones.mjs',
    '--jq',
    '.number'
  );
  const number = parseInt(out, 10);
  console.log(`  created milestone "${title}" (#${number})`);
  return number;
}

function issuesWithLabel(r, label) {
  const out = gh(
    'issue',
    'list',
    '--repo',
    r,
    '--label',
    label,
    '--state',
    'all',
    '--limit',
    '200',
    '--json',
    'number,milestone'
  );
  return JSON.parse(out);
}

function assignMilestone(r, issueNum, milestoneNum) {
  if (DRY_RUN) {
    console.log(`    [dry-run] would assign Issue #${issueNum} → milestone #${milestoneNum}`);
    return;
  }
  gh('api', `repos/${r}/issues/${issueNum}`, '-X', 'PATCH', '-F', `milestone=${milestoneNum}`);
  console.log(`    assigned Issue #${issueNum} → milestone #${milestoneNum}`);
}

function deleteLabel(r, label) {
  if (DRY_RUN) {
    console.log(`  [dry-run] would delete label "${label}"`);
    return;
  }
  gh('label', 'delete', label, '--repo', r, '--yes');
  console.log(`  deleted label "${label}"`);
}

function main() {
  const r = repo();
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}  delete-labels: ${DELETE_LABELS}`);
  console.log(`Repo: ${r}`);
  console.log('');

  const labels = listVersionLabels(r);
  console.log(`Found ${labels.length} version:* labels: ${labels.join(', ')}`);
  console.log('');

  const milestonesByTitle = new Map(listMilestones(r).map((m) => [m.title, m]));

  const stats = { milestones_created: 0, issues_assigned: 0, labels_deleted: 0, skipped: 0 };

  for (const label of labels) {
    const title = label.replace(/^version:/, ''); // e.g. "version:v1.15.4" → "v1.15.4"

    // Skip pre-SemVer label — see header comment.
    if (!/^v\d+\.\d+\.\d+$/.test(title)) {
      console.log(`SKIP label "${label}" — not a SemVer version`);
      stats.skipped++;
      continue;
    }

    console.log(`Processing ${label} → milestone "${title}"`);
    const milestoneNum = ensureMilestone(r, title, milestonesByTitle);
    if (milestoneNum !== null && !milestonesByTitle.has(title)) {
      stats.milestones_created++;
      milestonesByTitle.set(title, { number: milestoneNum, title });
    }

    const targetMs = milestonesByTitle.get(title);
    const issues = issuesWithLabel(r, label);
    console.log(`  ${issues.length} Issue(s) carry this label`);

    for (const i of issues) {
      if (i.milestone && i.milestone.number === targetMs?.number) {
        console.log(`    Issue #${i.number} already on milestone — skipping`);
        continue;
      }
      if (targetMs) {
        assignMilestone(r, i.number, targetMs.number);
        stats.issues_assigned++;
      }
    }

    if (DELETE_LABELS) {
      deleteLabel(r, label);
      stats.labels_deleted++;
    }
  }

  console.log('');
  console.log('Summary:');
  console.log(`  milestones created: ${stats.milestones_created}`);
  console.log(`  issues assigned:    ${stats.issues_assigned}`);
  console.log(`  labels deleted:     ${stats.labels_deleted}`);
  console.log(`  skipped (non-SemVer): ${stats.skipped}`);
}

main();
