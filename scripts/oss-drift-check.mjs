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
  if (committedSbom !== regeneratedSbom) stale.push('sbom.json');
  if (committedAttr !== regeneratedAttr) stale.push('attributions.json');
  return { ok: stale.length === 0, stale };
}

function main() {
  const { ok, stale } = runDriftCheck(REPO_ROOT);
  if (ok) {
    console.log('oss:drift OK — sbom.json + attributions.json are up to date');
    process.exit(0);
  }
  console.error('::error::SBoM + attributions drift detected');
  for (const file of stale) console.error(`  - ${file} is stale`);
  console.error('');
  console.error('Run "npm run oss:generate" locally to regenerate and commit the updated files.');
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
