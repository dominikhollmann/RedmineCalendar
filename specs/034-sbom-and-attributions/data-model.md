# Data Model — SBoM & Open-Source Attributions

**Feature**: 034-sbom-and-attributions
**Plan**: [`plan.md`](plan.md)
**Date**: 2026-05-18

Concrete shape of every data entity the feature touches. JSON Schema files in `contracts/` are the machine-readable companion.

---

## Overview

The feature has **one logical entity** (`Dependency record`) realized in **two storage formats** plus **two side files**:

| File                 | Role                                        | Authored by        | Read by                                              |
| -------------------- | ------------------------------------------- | ------------------ | ---------------------------------------------------- |
| `package-lock.json`  | npm-resolved dependency tree (existing)     | `npm install`      | `scripts/oss-generate.mjs`                           |
| `oss-manifest.json`  | non-npm dependencies (CDN + vendored)       | maintainer (hand)  | `scripts/oss-generate.mjs`                           |
| `oss-allowlist.json` | SPDX allowlist + per-`name@version` exempts | maintainer (hand)  | `scripts/oss-check-licenses.mjs`                     |
| `sbom.json`          | CycloneDX 1.6 JSON, full dep tree           | `oss-generate.mjs` | release pipeline, license gate, downstream consumers |
| `attributions.json`  | runtime-only projection                     | `oss-generate.mjs` | `js/licenses.js` (browser)                           |

`sbom.json` and `attributions.json` are committed to the repo for two reasons: (1) the drift check (R5) needs deterministic inputs to compare against; (2) the static deploy serves them as-is at `/sbom.json` and via `fetch('attributions.json')` from `js/licenses.js`.

---

## Entity: Dependency record

The canonical in-memory representation used by `oss-generate.mjs`. Every npm-tree node, every `oss-manifest.json` entry, and every emitted SBoM / attributions entry maps to one of these.

| Field          | Type           | Required    | Notes                                                                                                                                                                                                                                                       |
| -------------- | -------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`         | string         | yes         | Canonical package name. For npm, the npm package name (`@scope/name` form preserved). For CDN/vendored, a stable identifier chosen by the maintainer (e.g. `fullcalendar`, `msal-browser`, `spec-kit`).                                                     |
| `version`      | string         | yes         | SemVer for npm; for CDN, the exact released version; for vendored, the upstream version of the snapshot.                                                                                                                                                    |
| `license`      | string         | yes         | SPDX identifier (`MIT`) or SPDX expression (`MIT OR Apache-2.0`). For unknown, the string `"UNKNOWN"` — this _will_ fail the allowlist gate unless exempted. Never empty.                                                                                   |
| `copyright`    | string \| null | no          | Free-form copyright line as published by the upstream package. Null when the upstream did not publish one. Never invented.                                                                                                                                  |
| `homepageUrl`  | string (URL)   | yes         | Upstream project's homepage or canonical repository URL. Used as the outbound link on the attributions page.                                                                                                                                                |
| `supplier`     | enum           | yes         | One of: `npm`, `cdn`, `vendored`. Determines how the entry was sourced and (in the SBoM) which `externalReferences` type to set.                                                                                                                            |
| `scope`        | enum           | yes         | One of: `runtime`, `dev`. Runtime entries appear on the attributions page; dev entries appear only in the SBoM (with CycloneDX `scope: optional`). CDN and vendored entries are always `runtime`.                                                           |
| `purl`         | string         | yes         | Package URL (`pkg:` identifier) per [purl-spec](https://github.com/package-url/purl-spec). For npm: `pkg:npm/<name>@<version>`. For CDN: `pkg:generic/<name>@<version>?download_url=<cdnUrl>`. For vendored: `pkg:generic/<name>@<version>?vcs_url=<repo>`. |
| `cdnUrl`       | string (URL)   | conditional | Required when `supplier === 'cdn'`. The exact `<script src>` URL from `index.html`.                                                                                                                                                                         |
| `vendoredPath` | string         | conditional | Required when `supplier === 'vendored'`. Relative path from repo root to the vendored source tree (e.g. `.specify/`).                                                                                                                                       |

### Validation rules

- `name` MUST match `^[A-Za-z0-9_./@-]+$` (npm valid + path-safe).
- `version` MUST be non-empty; for npm, MUST be a parseable SemVer; for CDN/vendored, any non-empty string.
- `license` MUST be either a single SPDX identifier from the SPDX license list, a valid SPDX expression per [spdx-expression-parse](https://www.npmjs.com/package/spdx-expression-parse), or the literal `"UNKNOWN"`. The license-allowlist gate enforces this; the generator records what npm/manifest says without normalization.
- `purl` MUST be a valid Package URL.
- `(name, version)` MUST be unique within a single dataset (the same npm package at two versions in the tree is two distinct records — see Edge case "same package, two versions" in spec).
- For `supplier === 'cdn'`: `cdnUrl` MUST start with `https://`.
- For `supplier === 'vendored'`: `vendoredPath` MUST exist on disk at generation time (generator fails loudly otherwise).

### Lifecycle

Dependency records have **no lifecycle in the durable sense** — they are constructed in memory each time the generator runs and serialized into the two output files. The records' source data changes when:

- `package-lock.json` changes (npm install / update / dedupe).
- `oss-manifest.json` is hand-edited (maintainer adds/removes/version-bumps a CDN or vendored entry).

Both changes trigger the drift check (R5) on the next PR.

---

## File: `oss-manifest.json`

Schema: [`contracts/oss-manifest.schema.json`](contracts/oss-manifest.schema.json).

A hand-maintained array of dependency records for CDN-loaded and vendored sources — i.e. everything the generator cannot discover from `package-lock.json`.

```json
{
  "$schema": "./specs/034-sbom-and-attributions/contracts/oss-manifest.schema.json",
  "entries": [
    {
      "name": "fullcalendar",
      "version": "6.1.15",
      "license": "MIT",
      "copyright": "Copyright (c) Adam Shaw",
      "homepageUrl": "https://fullcalendar.io/",
      "supplier": "cdn",
      "scope": "runtime",
      "cdnUrl": "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.15/index.global.min.js"
    },
    {
      "name": "msal-browser",
      "version": "3.10.0",
      "license": "MIT",
      "copyright": "Copyright (c) Microsoft Corporation",
      "homepageUrl": "https://github.com/AzureAD/microsoft-authentication-library-for-js",
      "supplier": "cdn",
      "scope": "runtime",
      "cdnUrl": "https://alcdn.msauth.net/browser/3.10.0/js/msal-browser.min.js"
    },
    {
      "name": "spec-kit",
      "version": "0.8.8",
      "license": "MIT",
      "copyright": "Copyright (c) GitHub, Inc.",
      "homepageUrl": "https://github.com/github/spec-kit",
      "supplier": "vendored",
      "scope": "runtime",
      "vendoredPath": ".specify/"
    }
  ]
}
```

(Exact entries are illustrative — the maintainer fills the real CDN URLs and vendored versions at implementation time.)

### Maintenance protocol

- Adding/removing/upgrading a CDN-loaded `<script>` in `index.html` MUST be accompanied by an `oss-manifest.json` edit AND a regenerated `sbom.json` + `attributions.json` in the same PR.
- Adding a vendored open-source source tree MUST add an entry here. Removing one (e.g. un-vendoring in favour of an npm dep) MUST remove the entry; the npm dep will appear automatically in the next regeneration.

---

## File: `oss-allowlist.json`

Schema: [`contracts/oss-allowlist.schema.json`](contracts/oss-allowlist.schema.json).

The SPDX allowlist and per-`name@version` exemptions consumed by the license-allowlist gate.

```json
{
  "$schema": "./specs/034-sbom-and-attributions/contracts/oss-allowlist.schema.json",
  "allowedLicenses": [
    "MIT",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "Apache-2.0",
    "ISC",
    "MPL-2.0",
    "0BSD",
    "Unlicense",
    "CC0-1.0"
  ],
  "exemptions": [
    {
      "name": "example-pkg",
      "version": "1.2.3",
      "license": "BSD-4-Clause",
      "justification": "Audited 2026-05-15: clause-4 advertising obligation not triggered because we ship as a SPA, not an advertising-supported product. Approved by <maintainer>."
    }
  ]
}
```

### Validation rules

- `allowedLicenses` entries MUST be valid SPDX license identifiers.
- Every `exemptions` entry MUST carry a non-empty `justification` (≥ 20 characters, to discourage one-word rubber-stamps).
- `(name, version)` MUST be unique within `exemptions` — an exemption is pinned to one specific version of one specific package.
- An exemption is matched only when both `name` AND `version` of the dependency record exactly match.

---

## File: `sbom.json`

**Format**: CycloneDX 1.6 JSON. **Schema**: external — see [`contracts/sbom-reference.md`](contracts/sbom-reference.md).

Top-level structure (illustrative excerpt — the generator produces the full document):

```json
{
  "bomFormat": "CycloneDX",
  "specVersion": "1.6",
  "version": 1,
  "serialNumber": "urn:uuid:<auto-generated>",
  "metadata": {
    "timestamp": "2026-05-18T10:00:00Z",
    "tools": [
      { "vendor": "CycloneDX", "name": "@cyclonedx/cyclonedx-npm", "version": "<runtime version>" }
    ],
    "component": {
      "type": "application",
      "name": "RedmineCalendar",
      "version": "<from version.json>"
    }
  },
  "components": [
    {
      "type": "library",
      "bom-ref": "pkg:npm/example@1.0.0",
      "name": "example",
      "version": "1.0.0",
      "purl": "pkg:npm/example@1.0.0",
      "scope": "required",
      "licenses": [{ "license": { "id": "MIT" } }],
      "externalReferences": [{ "type": "website", "url": "https://example.com" }]
    }
  ]
}
```

### Mapping rules (Dependency record → CycloneDX component)

| Dependency record field | CycloneDX component field                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------- |
| `name`                  | `name`                                                                                                        |
| `version`               | `version`                                                                                                     |
| `purl`                  | `bom-ref` and `purl`                                                                                          |
| `scope === 'runtime'`   | `scope: required`                                                                                             |
| `scope === 'dev'`       | `scope: optional`                                                                                             |
| `license` (SPDX id)     | `licenses: [{ license: { id: <id> } }]`                                                                       |
| `license` (SPDX expr)   | `licenses: [{ expression: <expr> }]`                                                                          |
| `license === 'UNKNOWN'` | `licenses: [{ license: { id: 'NOASSERTION' } }]` per CycloneDX convention                                     |
| `copyright`             | `copyright` (omitted if null)                                                                                 |
| `homepageUrl`           | `externalReferences: [{ type: 'website', url: <url> }]`                                                       |
| `cdnUrl`                | `externalReferences: [{ type: 'distribution', url: <url> }]` (additional entry when `supplier === 'cdn'`)     |
| `vendoredPath`          | `externalReferences: [{ type: 'vcs', url: <homepageUrl> }, { type: 'other', comment: 'vendored at <path>' }]` |

### Validation

The release pipeline (R7) validates `sbom.json` against the CycloneDX 1.6 JSON schema before creating the GitHub Release. Failure blocks the release (FR-020).

---

## File: `attributions.json`

Schema: [`contracts/attributions.schema.json`](contracts/attributions.schema.json).

Runtime-only projection. Smaller, simpler, optimized for in-browser rendering by `js/licenses.js`. Same dependency records as `sbom.json` but filtered to `scope === 'runtime'` and stripped of fields the UI doesn't need.

```json
{
  "$schema": "./specs/034-sbom-and-attributions/contracts/attributions.schema.json",
  "generatedAt": "2026-05-18T10:00:00Z",
  "appVersion": "<from version.json — or 'dev' at generation time>",
  "entries": [
    {
      "name": "fullcalendar",
      "version": "6.1.15",
      "license": "MIT",
      "copyright": "Copyright (c) Adam Shaw",
      "homepageUrl": "https://fullcalendar.io/",
      "supplier": "cdn"
    }
  ]
}
```

### Sort order

Entries MUST be sorted alphabetically by `name` (case-insensitive). Where `name` is identical (same package, two versions), entries are sorted by `version` ascending. This matches FR-002 acceptance scenario 3 ("entries are sorted alphabetically by package name").

### What's deliberately _not_ in `attributions.json`

- `purl` — UI does not need it; the SBoM is the canonical machine-readable surface.
- `scope` — by construction every entry is `runtime`.
- `cdnUrl`, `vendoredPath` — the UI shows `homepageUrl` only.
- `externalReferences`, `bom-ref`, CycloneDX scaffolding — none needed for a plain HTML table.

---

## Cross-file invariants (enforced by the drift check)

1. Every npm runtime dep that appears in `sbom.json` with `scope: required` also appears in `attributions.json`.
2. Every entry in `oss-manifest.json` (which is by definition runtime — see manifest validation rules) appears in BOTH `sbom.json` (with the right `purl` shape per `supplier`) AND `attributions.json`.
3. For any `(name, version)` pair, the `license`, `copyright`, and `homepageUrl` values are identical across `sbom.json` and `attributions.json` (Single Source of Truth, FR-005).
4. The `generatedAt` field on `attributions.json` and the CycloneDX `metadata.timestamp` on `sbom.json` are identical (same generator invocation).
5. `oss-allowlist.json` is not regenerated by the generator — it's a pure input file. Its validation is the license-allowlist gate's responsibility, not the drift check's.

The drift check's strategy is the most direct possible enforcement of invariants 1–4: regenerate to a temp dir, byte-compare against the committed files. Any drift means at least one invariant is broken; the operator regenerates and re-pushes.
