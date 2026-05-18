#!/usr/bin/env node
// Single source of truth for the project's open-source dependency inventory.
// Reads package-lock.json + oss-manifest.json; emits sbom.json (CycloneDX 1.6
// JSON, full tree) and attributions.json (runtime-only projection for the UI)
// in one deterministic pass. Both files share an identical generatedAt /
// metadata.timestamp so the drift check (oss-drift-check.mjs) can byte-diff
// them. See specs/034-sbom-and-attributions/data-model.md for invariants.

import { spawnSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { validate } from './oss-lib/validate.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// Stable timestamp shared by both outputs. Convention: SOURCE_DATE_EPOCH=0
// (1970-01-01T00:00:00Z). Real "when generated" is recorded in git history.
const STABLE_TIMESTAMP = '1970-01-01T00:00:00.000Z';

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

function readVersion(root) {
  try {
    const v = readJson(resolve(root, 'version.json'));
    return v.version || 'dev';
  } catch {
    return 'dev';
  }
}

/**
 * Invoke @cyclonedx/cyclonedx-npm in package-lock-only + reproducible mode and
 * return the parsed CycloneDX BOM. Pure: no network, no node_modules walk.
 */
export function runCyclonedxNpm(root) {
  // --package-lock-only avoids `npm ls --all`, which emits different
  // shapes across npm versions (local npm 9.2.0 vs CI npm 10.x bundled
  // with Node 20). Lock-only mode reads exactly package-lock.json, which
  // is byte-identical across environments. License info is sparser in
  // lock-only mode (many transitive packages don't carry a `license`
  // field in package-lock.json); we backfill them from node_modules in
  // enrichLicensesFromNodeModules below.
  const bin = resolve(root, 'node_modules/@cyclonedx/cyclonedx-npm/bin/cyclonedx-npm-cli.js');
  const res = spawnSync(
    process.execPath,
    [
      bin,
      '--package-lock-only',
      '--spec-version',
      '1.6',
      '--output-format',
      'JSON',
      '--output-reproducible',
      '--output-file',
      '-',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
  );
  if (res.status !== 0) {
    throw new Error(`cyclonedx-npm failed (exit ${res.status}): ${res.stderr || res.stdout}`);
  }
  return JSON.parse(res.stdout);
}

/**
 * Map an oss-manifest entry (cdn|vendored) to a CycloneDX 1.6 component.
 * Mapping rules per data-model.md "File: sbom.json → Mapping rules".
 */
export function manifestEntryToComponent(entry) {
  const { name, version, license, copyright, homepageUrl, supplier, cdnUrl, vendoredPath } = entry;
  const safeName = encodeURIComponent(name);
  let purl;
  if (supplier === 'cdn') {
    purl = `pkg:generic/${safeName}@${version}?download_url=${encodeURIComponent(cdnUrl)}`;
  } else {
    purl = `pkg:generic/${safeName}@${version}?vcs_url=${encodeURIComponent(homepageUrl)}`;
  }
  const externalReferences = [{ type: 'website', url: homepageUrl }];
  if (supplier === 'cdn') {
    externalReferences.push({ type: 'distribution', url: cdnUrl });
  } else {
    externalReferences.push({ type: 'vcs', url: homepageUrl });
    externalReferences.push({ type: 'other', comment: `vendored at ${vendoredPath}` });
  }
  const comp = {
    type: 'library',
    'bom-ref': purl,
    name,
    version,
    purl,
    scope: 'required',
    licenses: spdxToLicenses(license),
    externalReferences,
    properties: [{ name: 'oss-manifest:supplier', value: supplier }],
  };
  if (copyright) comp.copyright = copyright;
  return comp;
}

function spdxToLicenses(license) {
  if (license === 'UNKNOWN') return [{ license: { name: 'NOASSERTION' } }];
  // Heuristic: a bare SPDX identifier has no spaces or parentheses; otherwise
  // treat as an expression. This matches the CycloneDX 1.6 schema's split
  // between `license.id` (single SPDX id) and `expression` (SPDX expression).
  if (/[\s()]/.test(license)) return [{ expression: license }];
  return [{ license: { id: license } }];
}

/**
 * Extract a normalized license string from a CycloneDX component for the
 * attributions projection. Returns the SPDX id, the expression, or "UNKNOWN".
 */
export function componentToLicenseString(comp) {
  const lics = comp.licenses || [];
  if (lics.length === 0) return 'UNKNOWN';
  const first = lics[0];
  if (first.expression) return first.expression === 'NOASSERTION' ? 'UNKNOWN' : first.expression;
  if (first.license && first.license.id) {
    return first.license.id === 'NOASSERTION' ? 'UNKNOWN' : first.license.id;
  }
  if (first.license && first.license.name) {
    return first.license.name === 'NOASSERTION' ? 'UNKNOWN' : first.license.name;
  }
  return 'UNKNOWN';
}

function componentToHomepageUrl(comp) {
  const refs = comp.externalReferences || [];
  const website = refs.find((r) => r.type === 'website');
  if (website && website.url) return website.url;
  const vcs = refs.find((r) => r.type === 'vcs');
  if (vcs && vcs.url) return vcs.url;
  const dist = refs.find((r) => r.type === 'distribution');
  if (dist && dist.url) return dist.url;
  return 'https://www.npmjs.com/';
}

function componentSupplier(comp) {
  const props = comp.properties || [];
  const tag = props.find((p) => p.name === 'oss-manifest:supplier');
  if (tag) return tag.value; // 'cdn' or 'vendored'
  return 'npm';
}

function isDevComponent(comp) {
  const props = comp.properties || [];
  const dev = props.find((p) => p.name === 'cdx:npm:package:development');
  return dev && dev.value === 'true';
}

/**
 * Recursively re-serialize an object with alphabetically-sorted keys. Arrays
 * retain their order (we sort components explicitly elsewhere). Used to make
 * the BOM byte-stable across npm versions, which insert JSON keys in
 * different orders for the same logical content.
 */
function canonicalizeKeys(value) {
  if (Array.isArray(value)) return value.map(canonicalizeKeys);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      out[key] = canonicalizeKeys(value[key]);
    }
    return out;
  }
  return value;
}

/**
 * Build the in-memory SBoM (CycloneDX 1.6) and attributions projection from
 * a parsed cyclonedx-npm BOM + the oss-manifest entries. Pure function — no
 * I/O. Used by both the generator and the unit tests.
 */
export function buildOutputs(bom, manifest, appVersion) {
  // Deep clone to avoid mutating caller's input.
  const sbom = JSON.parse(JSON.stringify(bom));
  sbom.metadata = sbom.metadata || {};
  sbom.metadata.timestamp = STABLE_TIMESTAMP;
  delete sbom.serialNumber; // reproducible mode strips it; ensure consistency
  // Cross-environment determinism: cyclonedx-npm records the host npm
  // version + tool versions under metadata.tools.components. Local npm
  // (9.x) and CI npm (10.x bundled with Node 20) produce byte-different
  // outputs there even with identical inputs. Drop the tools block so the
  // drift check is stable across environments. cyclonedx-npm + library
  // versions are pinned via package.json devDependencies; provenance lives
  // in package-lock.json, not in every regenerated BOM.
  if (sbom.metadata && sbom.metadata.tools) delete sbom.metadata.tools;

  // Stamp every npm component with scope based on the dev marker, and
  // normalize missing licenses to NOASSERTION so every component carries
  // the FR-008a-required licenses[] array (data-model.md: license never
  // empty).
  for (const c of sbom.components || []) {
    c.scope = isDevComponent(c) ? 'optional' : 'required';
    if (!Array.isArray(c.licenses) || c.licenses.length === 0) {
      // CycloneDX 1.6: license.id must be a real SPDX identifier; for
      // packages whose upstream metadata doesn't declare a license, use
      // license.name with the CycloneDX-conventional sentinel "NOASSERTION".
      c.licenses = [{ license: { name: 'NOASSERTION' } }];
    }
  }

  // Add manifest entries (CDN + vendored). These never collide with npm purls
  // (npm uses pkg:npm/..., we use pkg:generic/...) so we can append directly.
  const manifestComponents = (manifest.entries || []).map(manifestEntryToComponent);
  sbom.components = (sbom.components || []).concat(manifestComponents);

  // Sort components for deterministic byte-stable output.
  sbom.components.sort((a, b) => {
    const ar = (a['bom-ref'] || a.purl || `${a.name}@${a.version}`).toLowerCase();
    const br = (b['bom-ref'] || b.purl || `${b.name}@${b.version}`).toLowerCase();
    return ar < br ? -1 : ar > br ? 1 : 0;
  });

  // Canonicalize key order on every component for byte-stability across npm
  // versions (which insert JSON keys in different orders for the same logical
  // content). Done AFTER sorting so the array order is preserved.
  sbom.components = sbom.components.map(canonicalizeKeys);

  // Build attributions projection: only runtime libraries.
  const entries = [];
  for (const c of sbom.components) {
    if (c.scope !== 'required') continue;
    if (c.type !== 'library') continue;
    const name = c.group ? `${c.group}/${c.name}` : c.name;
    entries.push({
      name,
      version: c.version,
      license: componentToLicenseString(c),
      copyright: c.copyright || null,
      homepageUrl: componentToHomepageUrl(c),
      supplier: componentSupplier(c),
    });
  }
  entries.sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    if (an !== bn) return an < bn ? -1 : 1;
    return a.version < b.version ? -1 : a.version > b.version ? 1 : 0;
  });

  const attributions = {
    $schema: './specs/034-sbom-and-attributions/contracts/attributions.schema.json',
    generatedAt: STABLE_TIMESTAMP,
    appVersion,
    entries,
  };

  return { sbom, attributions };
}

function main() {
  const root = repoRoot;
  const manifest = readJson(resolve(root, 'oss-manifest.json'));
  const manifestSchema = readJson(
    resolve(root, 'specs/034-sbom-and-attributions/contracts/oss-manifest.schema.json')
  );
  const manifestErrors = validate(manifest, manifestSchema);
  if (manifestErrors.length) {
    console.error('oss-manifest.json failed schema validation:');
    for (const e of manifestErrors) console.error('  ' + e);
    process.exit(1);
  }

  // Sanity: vendored paths must exist on disk (FR — generator fails loudly).
  for (const e of manifest.entries) {
    if (e.supplier === 'vendored' && !existsSync(resolve(root, e.vendoredPath))) {
      console.error(`vendored path does not exist: ${e.vendoredPath}`);
      process.exit(1);
    }
  }

  const bom = runCyclonedxNpm(root);
  const appVersion = readVersion(root);
  const { sbom, attributions } = buildOutputs(bom, manifest, appVersion);

  writeFileSync(resolve(root, 'sbom.json'), JSON.stringify(sbom, null, 2) + '\n');
  writeFileSync(resolve(root, 'attributions.json'), JSON.stringify(attributions, null, 2) + '\n');
  console.log(
    `wrote sbom.json (${sbom.components.length} components) + attributions.json (${attributions.entries.length} runtime entries)`
  );
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
