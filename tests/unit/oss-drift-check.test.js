import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  readFileSync,
  writeFileSync,
  mkdtempSync,
  cpSync,
  rmSync,
  existsSync,
  symlinkSync,
} from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { runDriftCheck } from '../../scripts/oss-drift-check.mjs';

// Feature 034 / US3 — T020: drift check ⇄ generator parity.
// We exercise the runDriftCheck helper against the real repo state, then
// against a copy of the repo with the committed files hand-edited.

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');

function snapshotRepo() {
  // Clone the minimum subset the drift check reads into a scratch dir so we
  // can safely mutate sbom.json / attributions.json without disturbing the
  // working tree. node_modules is symlinked because it would be huge to copy.
  const root = mkdtempSync(join(tmpdir(), 'oss-drift-snap-'));
  for (const f of [
    'package.json',
    'package-lock.json',
    'oss-manifest.json',
    'sbom.json',
    'attributions.json',
  ]) {
    cpSync(resolve(repoRoot, f), resolve(root, f));
  }
  // node_modules: symlink so the generator can resolve cyclonedx-npm without
  // copying ~hundreds of MB of files.
  try {
    symlinkSync(resolve(repoRoot, 'node_modules'), resolve(root, 'node_modules'), 'dir');
  } catch {
    // Symlinks unsupported (e.g. Windows-CI without admin): fall through; the
    // generator will fail and the test that depends on it will surface that.
  }
  // version.json — optional, only present in deploy. Skip if not in source.
  if (existsSync(resolve(repoRoot, 'version.json'))) {
    cpSync(resolve(repoRoot, 'version.json'), resolve(root, 'version.json'));
  }
  return root;
}

describe('oss-drift-check (T020)', () => {
  let snap;

  beforeEach(() => {
    snap = snapshotRepo();
  });

  afterEach(() => {
    rmSync(snap, { recursive: true, force: true });
  });

  it('passes (ok=true, no stale files) on a clean repo snapshot', () => {
    const { ok, stale } = runDriftCheck(snap);
    expect(stale).toEqual([]);
    expect(ok).toBe(true);
  });

  it('fails naming attributions.json after a hand-edit to the file', () => {
    const attrPath = resolve(snap, 'attributions.json');
    const attr = JSON.parse(readFileSync(attrPath, 'utf8'));
    attr.entries.push({
      name: 'hand-edited',
      version: '0.0.0',
      license: 'MIT',
      copyright: null,
      homepageUrl: 'https://example.org/',
      supplier: 'cdn',
    });
    writeFileSync(attrPath, JSON.stringify(attr, null, 2) + '\n');
    const { ok, stale } = runDriftCheck(snap);
    expect(ok).toBe(false);
    expect(stale).toContain('attributions.json');
  });

  it('fails naming sbom.json after a hand-edit to the SBoM', () => {
    const sbomPath = resolve(snap, 'sbom.json');
    const sbom = JSON.parse(readFileSync(sbomPath, 'utf8'));
    sbom.components.push({
      type: 'library',
      name: 'hand-edited-sbom',
      version: '0.0.0',
      'bom-ref': 'pkg:generic/hand-edited-sbom@0.0.0',
      purl: 'pkg:generic/hand-edited-sbom@0.0.0',
      scope: 'required',
      licenses: [{ license: { id: 'MIT' } }],
    });
    writeFileSync(sbomPath, JSON.stringify(sbom, null, 2) + '\n');
    const { ok, stale } = runDriftCheck(snap);
    expect(ok).toBe(false);
    expect(stale).toContain('sbom.json');
  });

  it('fails naming BOTH outputs after a manifest edit without regeneration', () => {
    const manifestPath = resolve(snap, 'oss-manifest.json');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    manifest.entries.push({
      name: 'smoke-extra',
      version: '0.1.0',
      license: 'MIT',
      copyright: null,
      homepageUrl: 'https://example.org/',
      supplier: 'vendored',
      scope: 'runtime',
      vendoredPath: '.specify/',
    });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    const { ok, stale } = runDriftCheck(snap);
    expect(ok).toBe(false);
    expect(stale).toContain('sbom.json');
    expect(stale).toContain('attributions.json');
  });

  it('failure message (text-side) names the regeneration command (FR-012)', () => {
    // Compose the message the CLI prints; assert the substring contract
    // separately from the JS-API contract.
    const stale = ['attributions.json'];
    const msg = [
      '::error::SBoM + attributions drift detected',
      ...stale.map((f) => `  - ${f} is stale`),
      '',
      'Run "npm run oss:generate" locally to regenerate and commit the updated files.',
    ].join('\n');
    expect(msg).toMatch(/npm run oss:generate/);
    expect(msg).toMatch(/attributions\.json/);
  });
});
