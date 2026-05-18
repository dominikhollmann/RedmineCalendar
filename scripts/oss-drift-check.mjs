#!/usr/bin/env node
// Feature 034 / US3: regenerate sbom.json + attributions.json into a temp
// directory and byte-compare against the committed files. Any difference
// fails with a clear message naming the stale file(s) and the regeneration
// command (FR-012). Fully offline (FR-013) — uses package-lock-only mode +
// no network calls.

import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runCyclonedxNpm, buildOutputs } from './oss-generate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function readVersion(root) {
  try {
    return readJson(resolve(root, 'version.json')).version || 'dev';
  } catch {
    return 'dev';
  }
}

/**
 * Run the drift check from a given repo root. Returns { ok, stale }: ok is
 * `true` iff the regenerated outputs are byte-identical to the committed
 * ones; `stale` is a list of relative file paths that drifted. Pure with
 * respect to the filesystem (writes only to a scratch tmpdir).
 *
 * @param {string} root absolute path to a repository root
 * @returns {{ ok: boolean, stale: string[] }}
 */
export function runDriftCheck(root) {
  const manifest = readJson(resolve(root, 'oss-manifest.json'));
  const bom = runCyclonedxNpm(root);
  const { sbom, attributions } = buildOutputs(bom, manifest, readVersion(root));

  const tmp = mkdtempSync(join(tmpdir(), 'oss-drift-'));
  const tmpSbom = join(tmp, 'sbom.json');
  const tmpAttr = join(tmp, 'attributions.json');
  writeFileSync(tmpSbom, JSON.stringify(sbom, null, 2) + '\n');
  writeFileSync(tmpAttr, JSON.stringify(attributions, null, 2) + '\n');

  const committedSbom = readFileSync(resolve(root, 'sbom.json'), 'utf8');
  const committedAttr = readFileSync(resolve(root, 'attributions.json'), 'utf8');
  const regeneratedSbom = readFileSync(tmpSbom, 'utf8');
  const regeneratedAttr = readFileSync(tmpAttr, 'utf8');
  rmSync(tmp, { recursive: true, force: true });

  const stale = [];
  const diffs = {};
  if (committedSbom !== regeneratedSbom) {
    stale.push('sbom.json');
    diffs['sbom.json'] = firstDiffLines(committedSbom, regeneratedSbom, 30);
  }
  if (committedAttr !== regeneratedAttr) {
    stale.push('attributions.json');
    diffs['attributions.json'] = firstDiffLines(committedAttr, regeneratedAttr, 30);
  }
  return { ok: stale.length === 0, stale, diffs };
}

/**
 * Return a short unified-diff-ish window around the first divergence between
 * two text blobs. Used to surface what specifically drifted in CI logs.
 */
function firstDiffLines(a, b, context = 30) {
  const al = a.split('\n');
  const bl = b.split('\n');
  let i = 0;
  while (i < al.length && i < bl.length && al[i] === bl[i]) i++;
  const start = Math.max(0, i - 3);
  const end = Math.min(Math.max(al.length, bl.length), i + context);
  const window = [];
  for (let j = start; j < end; j++) {
    const aLine = al[j] ?? '<EOF>';
    const bLine = bl[j] ?? '<EOF>';
    if (aLine === bLine) window.push(`  ${aLine}`);
    else {
      window.push(`- ${aLine}`);
      window.push(`+ ${bLine}`);
    }
  }
  return window.join('\n');
}

function main() {
  const { ok, stale, diffs } = runDriftCheck(REPO_ROOT);
  if (ok) {
    console.log('oss:drift OK — sbom.json + attributions.json are up to date');
    process.exit(0);
  }
  console.error('::error::SBoM + attributions drift detected');
  for (const file of stale) {
    console.error(`  - ${file} is stale`);
    if (diffs && diffs[file]) {
      console.error('    first divergence (- committed / + regenerated):');
      for (const line of diffs[file].split('\n')) console.error(`      ${line}`);
    }
  }
  console.error('');
  console.error('Run "npm run oss:generate" locally to regenerate and commit the updated files.');
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
