#!/usr/bin/env node
// Feature 034 / US4: license-allowlist gate. Reads sbom.json (authoritative
// single source of truth per plan R3) and oss-allowlist.json; iterates every
// component; applies the FR-014/015/016/017 allowlist rules. Exits non-zero
// on the first batch of disallowed licenses with a clear per-package message.

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import spdxParse from 'spdx-expression-parse';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');

function readJson(p) {
  return JSON.parse(readFileSync(p, 'utf8'));
}

/**
 * Walk an spdx-expression-parse AST and return true iff the licenses pass
 * the allowlist. OR-nodes pass if ANY child passes (FR-017); AND-nodes pass
 * only if ALL children pass.
 *
 * @param {object} node
 * @param {Set<string>} allowed
 * @returns {boolean}
 */
export function expressionAllowed(node, allowed) {
  if (!node) return false;
  if (node.license) {
    // Leaf node with a single SPDX id (optionally with WITH-clause exception).
    return allowed.has(node.license);
  }
  if (node.conjunction === 'or') {
    return expressionAllowed(node.left, allowed) || expressionAllowed(node.right, allowed);
  }
  if (node.conjunction === 'and') {
    return expressionAllowed(node.left, allowed) && expressionAllowed(node.right, allowed);
  }
  return false;
}

/**
 * Check a single component against the allowlist + exemptions. Returns
 * { ok, reason } where ok=true means the package passes (whether by direct
 * match, expression rule, or exemption); reason is the short explanation
 * for logging.
 *
 * @param {object} comp CycloneDX component
 * @param {{ allowed: Set<string>, exemptions: Map<string, object> }} ctx
 * @returns {{ ok: boolean, license: string, channel: string, reason?: string }}
 */
export function checkComponent(comp, ctx) {
  const name = comp.group ? `${comp.group}/${comp.name}` : comp.name;
  const version = comp.version;
  const key = `${name}@${version}`;
  const channel = (comp.purl || '').startsWith('pkg:generic/')
    ? (comp.properties || []).find((p) => p.name === 'oss-manifest:supplier')?.value || 'cdn'
    : 'npm';

  // Exemption (FR-016): exact name@version match.
  if (ctx.exemptions.has(key)) {
    return { ok: true, license: '(exempted)', channel, reason: 'exempted' };
  }

  const lics = comp.licenses || [];
  if (lics.length === 0) {
    // `scope: optional` = dev tooling. cyclonedx-npm in --package-lock-only
    // mode (the deterministic-across-environments choice; see plan R1) cannot
    // resolve a license for many transitive dev packages because npm only
    // denormalizes the `license` field into package-lock.json for ~70% of
    // entries. Strict NOASSERTION enforcement on dev would either require
    // hundreds of per-package exemptions or a non-deterministic node_modules
    // walk. We accept NOASSERTION on `scope: optional` and keep strict
    // NOASSERTION-fails behaviour on `scope: required` (runtime — the packages
    // that actually ship to users; FR-014's load-bearing scope).
    if (comp.scope === 'optional') {
      return { ok: true, license: 'NOASSERTION', channel, reason: 'dev (NOASSERTION accepted)' };
    }
    return { ok: false, license: 'UNKNOWN', channel, reason: 'no license metadata' };
  }
  const first = lics[0];

  // NOASSERTION sentinel (either in id, name, or expression form). Same
  // strict-on-runtime / soft-on-dev posture as the missing-license branch.
  if (
    (first.license &&
      (first.license.id === 'NOASSERTION' || first.license.name === 'NOASSERTION')) ||
    first.expression === 'NOASSERTION'
  ) {
    if (comp.scope === 'optional') {
      return { ok: true, license: 'NOASSERTION', channel, reason: 'dev (NOASSERTION accepted)' };
    }
    return { ok: false, license: 'UNKNOWN', channel, reason: 'NOASSERTION' };
  }

  // Single SPDX id (FR-014 simple case).
  if (first.license && first.license.id) {
    const id = first.license.id;
    return ctx.allowed.has(id)
      ? { ok: true, license: id, channel }
      : { ok: false, license: id, channel, reason: 'not on allowlist' };
  }

  // SPDX expression (FR-017): OR passes if any term passes, AND requires all.
  if (first.expression) {
    try {
      const ast = spdxParse(first.expression);
      return expressionAllowed(ast, ctx.allowed)
        ? { ok: true, license: first.expression, channel }
        : {
            ok: false,
            license: first.expression,
            channel,
            reason: 'no allowlisted term in expression',
          };
    } catch {
      return {
        ok: false,
        license: first.expression,
        channel,
        reason: 'unparseable SPDX expression',
      };
    }
  }

  // Free-form name with no SPDX id — fail (FR-015 conservative default).
  if (first.license && first.license.name) {
    return {
      ok: false,
      license: first.license.name,
      channel,
      reason: 'license name has no SPDX id',
    };
  }

  return { ok: false, license: 'UNKNOWN', channel, reason: 'malformed license entry' };
}

/**
 * Run the license check against an in-memory sbom + allowlist. Returns an
 * array of failure objects (empty array means everything passed).
 * @param {object} sbom CycloneDX BOM
 * @param {object} allowlist  parsed oss-allowlist.json
 * @returns {Array<{ name: string, version: string, license: string, channel: string, reason: string }>}
 */
export function checkLicenses(sbom, allowlist) {
  const allowed = new Set(allowlist.allowedLicenses);
  const exemptions = new Map();
  for (const ex of allowlist.exemptions || []) {
    exemptions.set(`${ex.name}@${ex.version}`, ex);
  }
  const ctx = { allowed, exemptions };

  const failures = [];
  for (const comp of sbom.components || []) {
    if (comp.scope === 'excluded') continue;
    const res = checkComponent(comp, ctx);
    if (!res.ok) {
      const name = comp.group ? `${comp.group}/${comp.name}` : comp.name;
      failures.push({
        name,
        version: comp.version,
        license: res.license,
        channel: res.channel,
        reason: res.reason,
        scope: comp.scope,
      });
    }
  }
  return failures;
}

function main() {
  const sbom = readJson(resolve(REPO_ROOT, 'sbom.json'));
  const allowlist = readJson(resolve(REPO_ROOT, 'oss-allowlist.json'));

  const failures = checkLicenses(sbom, allowlist);
  if (failures.length === 0) {
    const checked = (sbom.components || []).filter((c) => c.scope !== 'excluded').length;
    console.log(
      `oss:licenses OK — ${checked} components, ${allowlist.exemptions.length} exemptions`
    );
    process.exit(0);
  }

  console.error('::error::License allowlist check failed');
  for (const f of failures) {
    console.error(
      `  - ${f.name}@${f.version} (${f.channel}, ${f.scope}): "${f.license}" — ${f.reason}`
    );
  }
  console.error('');
  console.error(
    `Either bump the dependency to a permissively-licensed version, drop it, or — if the license is genuinely acceptable — add an exemption to oss-allowlist.json with a ≥20-char justification (audit date, scope, approver). Allowlist defaults: ${[...allowlist.allowedLicenses].sort().join(', ')}.`
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();
