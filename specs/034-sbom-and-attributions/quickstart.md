# Quickstart — SBoM & Open-Source Attributions

**Feature**: 034-sbom-and-attributions
**Plan**: [`plan.md`](plan.md)
**For**: UAT walkthrough (`/speckit-uat-run`) + first-time developer onboarding.

This document is the **user acceptance test script**: a human runs through it before flipping the draft PR to ready-for-review. Each section ends with an explicit pass/fail criterion.

---

## 1. Pre-flight (one-time setup)

```bash
# Pull the feature branch
git fetch origin && git checkout 034-sbom-and-attributions

# Install (picks up @cyclonedx/cyclonedx-npm + spdx-expression-parse)
npm ci

# Sanity: full quality pipeline
npm run lint && npm run typecheck && npm test && npm run sqi
```

**Pass when**: all four commands exit zero; `npm run sqi` reports GREEN band (≥ 60).

---

## 2. UAT-1 — In-app attributions page (US1)

### 2.1 Local dev-server walkthrough

```bash
npm run dev   # bundled HTTPS server + Redmine/AI proxies
# Open https://localhost:3000/ (accept the self-signed cert)
```

1. From the calendar page, click the gear / Settings icon (existing path).
2. On the Settings page, scroll to the very bottom.
3. Find the discreet "Open-source licenses" / "Open-Source-Lizenzen" link (depending on browser locale).
4. Click it. The browser navigates to `/licenses.html` (URL visible in address bar — confirms it's a real route, not a modal).
5. The page displays a sortable list with columns: Library, Version, License, Homepage, Copyright.
6. Visually verify:
   - FullCalendar appears, version matches the `<script>` tag in `index.html`.
   - MSAL.js appears.
   - Several npm packages appear (whatever is in `package-lock.json` production scope — likely empty for this project since runtime deps are CDN, but transitive runtime deps if any).
   - Vendored entries (Spec Kit) appear.
7. Click a `homepageUrl` link — it opens the upstream project's homepage in a new tab.
8. Switch the browser language to German (or set `navigator.languages = ['de']`), reload. The page chrome (column headings, page title, link label on Settings) is in German. Library names, version strings, license IDs, copyright lines, and URLs remain unchanged.
9. Switch the app to dark mode (Settings → dark mode toggle from feature 030). Return to `/licenses.html`. The page respects dark mode (background, text colour) using the existing CSS variable layer (no extra theming code).

**Pass when**: all 9 steps succeed; right-click → "Open in new tab" on the Settings-page link works (URL is shareable); no console errors; the rendered list matches `attributions.json`.

### 2.2 Acceptance scenarios (from spec)

| US1 AS # | Verification                                                                                                                 |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- |
| 1        | Step 1–3 above.                                                                                                              |
| 2        | Steps 5–6 above (name + version + license + copyright + outbound link present).                                              |
| 3        | Inspect the rendered list — CDN-loaded libs appear alphabetically interleaved with npm-resolved libs, no visual distinction. |
| 4        | Step 8 above (locale switch).                                                                                                |
| 5        | Compare a single library's `license` and `homepageUrl` between `attributions.json` and `sbom.json` — values are identical.   |

---

## 3. UAT-2 — SBoM availability (US2)

### 3.1 `/sbom.json` served by the deployed app

```bash
# After the feature is deployed (post-merge), or via local dev:
curl -sS http://localhost:3000/sbom.json | jq '.bomFormat, .specVersion, .metadata.timestamp, (.components | length)'
```

**Pass when**: response includes `"CycloneDX"`, `"1.6"`, a recent RFC-3339 timestamp, and a positive component count.

### 3.2 SBoM is attached to GitHub Release

After this feature is merged and a release is cut (PR merge triggers `release.yml`):

```bash
# Find the new version
gh release view --json tagName,assets
```

**Pass when**: the latest Release has an `sbom.json` asset attached; downloading it (`gh release download <tag> --pattern sbom.json`) produces a file byte-identical to the deployed app's `/sbom.json` for the same version (FR-008, SC-004).

### 3.3 CycloneDX 1.6 schema validation

```bash
# Local validation (CI also runs this in the release job)
npx @cyclonedx/cyclonedx-npm --validate sbom.json
```

**Pass when**: validator exits zero. (FR-007, SC-003.)

### 3.4 Acceptance scenarios

| US2 AS # | Verification                                                                          |
| -------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
| 1        | Step 3.2 above.                                                                       |
| 2        | Step 3.3 above.                                                                       |
| 3        | Step 3.1 above + Step 3.2 download → `diff` produces no output.                       |
| 4        | `jq '.components[0]                                                                   | {name, version, licenses, purl, scope}' sbom.json` shows all five fields populated. |
| 5        | `diff <(jq '.components[] \| select(.scope=="required") \| {name, version}' sbom.json | sort) <(jq '.entries[] \| {name, version}' attributions.json                        | sort)` → no output.                            |
| 6        | `jq '.components[]                                                                    | .scope' sbom.json                                                                   | sort -u`shows both`"required"`and`"optional"`. |

---

## 4. UAT-3 — CI drift gate (US3)

### 4.1 Drift detection on dependency-tree change

```bash
# On the feature branch, create a throwaway test branch
git checkout -b 034-drift-smoke

# Simulate adding an npm dep (any small lib)
npm install --save-dev --save-exact wrappy@1.0.2
# Don't regenerate — leave attributions.json + sbom.json stale
git add package.json package-lock.json
git commit -m "smoke: add transient dep without regenerating"
git push -u origin 034-drift-smoke

# Open a PR
gh pr create --draft --title "smoke: drift check" --body "do not merge"
```

**Pass when**: the PR's CI run **fails** on the "SBoM + attributions drift check" step within ~30 seconds. The failure log names `sbom.json` and `attributions.json` as stale and suggests `npm run oss:generate` (FR-012).

### 4.2 Drift detection on hand-edit

```bash
# Edit attributions.json by hand (e.g. delete a single line, save)
git add attributions.json
git commit -m "smoke: hand-edit generated file"
git push
```

**Pass when**: CI fails again, this time pointing only at `attributions.json`.

### 4.3 Drift resolution

```bash
npm run oss:generate         # regenerates both files
git add sbom.json attributions.json
git commit -m "smoke: regenerate"
git push
```

**Pass when**: CI passes on the next run.

### 4.4 Clean-up

```bash
gh pr close 034-drift-smoke --delete-branch
```

### 4.5 Acceptance scenarios

| US3 AS # | Verification                                                                                                                                                                                                |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1        | Step 4.1 above.                                                                                                                                                                                             |
| 2        | Inspect the failure log — it names the stale file(s) + the local `npm run oss:generate` command.                                                                                                            |
| 3        | Step 4.3 above.                                                                                                                                                                                             |
| 4        | Drift check runs on every PR (including PRs that touch only `js/` or `css/`) — verify by looking at the CI job listing on this feature branch's own PR (#103) and confirming the drift step ran and passed. |
| 5        | A single `npm run oss:generate` invocation updates both files (no separate commands).                                                                                                                       |

---

## 5. UAT-4 — CI license-allowlist gate (US4)

### 5.1 Disallowed-license detection

```bash
git checkout -b 034-licgate-smoke

# Simulate adding a dep declaring a non-allowlisted license. A real GPL-3
# transitive dep is hard to procure on demand; the most reliable simulation
# is to hand-edit oss-manifest.json with a fake entry declaring GPL-3.0-only:
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('oss-manifest.json','utf8'));m.entries.push({name:'smoke-disallowed',version:'0.0.1',license:'GPL-3.0-only',copyright:null,homepageUrl:'https://example.org/',supplier:'vendored',scope:'runtime',vendoredPath:'.specify/'});fs.writeFileSync('oss-manifest.json',JSON.stringify(m,null,2)+'\n');"
npm run oss:generate    # picks up the new entry
git add oss-manifest.json sbom.json attributions.json
git commit -m "smoke: introduce disallowed license"
git push -u origin 034-licgate-smoke
gh pr create --draft --title "smoke: license gate" --body "do not merge"
```

**Pass when**: PR CI **fails** on "License allowlist check" with a message naming `smoke-disallowed@0.0.1` and `GPL-3.0-only`.

### 5.2 Exemption resolution

```bash
# Add an exemption pinned to that exact name@version
node -e "const fs=require('fs');const a=JSON.parse(fs.readFileSync('oss-allowlist.json','utf8'));a.exemptions.push({name:'smoke-disallowed',version:'0.0.1',license:'GPL-3.0-only',justification:'Smoke test for UAT — to be removed before merge. Approved by <maintainer> on 2026-05-18.'});fs.writeFileSync('oss-allowlist.json',JSON.stringify(a,null,2)+'\n');"
git add oss-allowlist.json
git commit -m "smoke: add exemption"
git push
```

**Pass when**: CI passes on the next run.

### 5.3 Version-pin discipline

```bash
# Bump the fake entry's version — exemption should NO LONGER cover it
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('oss-manifest.json','utf8'));const e=m.entries.find(x=>x.name==='smoke-disallowed');e.version='0.0.2';fs.writeFileSync('oss-manifest.json',JSON.stringify(m,null,2)+'\n');"
npm run oss:generate
git add oss-manifest.json sbom.json attributions.json
git commit -m "smoke: version-bump (should re-fail)"
git push
```

**Pass when**: CI fails again — the `0.0.1` exemption does NOT cover `0.0.2` (FR-016).

### 5.4 Missing-license detection

```bash
# Edit the fake entry to have no license metadata
node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('oss-manifest.json','utf8'));const e=m.entries.find(x=>x.name==='smoke-disallowed');e.license='UNKNOWN';fs.writeFileSync('oss-manifest.json',JSON.stringify(m,null,2)+'\n');"
npm run oss:generate
git add oss-manifest.json sbom.json attributions.json
git commit -m "smoke: unknown license (should fail)"
git push
```

**Pass when**: CI fails with a message naming the parse failure / unknown-license state.

### 5.5 Clean-up

```bash
gh pr close 034-licgate-smoke --delete-branch
```

### 5.6 Acceptance scenarios

| US4 AS # | Verification                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1        | Step 5.1 above.                                                                                                                                                                                  |
| 2        | Step 5.4 above.                                                                                                                                                                                  |
| 3        | Steps 5.2 + 5.3 above.                                                                                                                                                                           |
| 4        | Run `npm run oss:licenses` on the feature branch with no exemption — it passes with zero exemptions OR the committed `oss-allowlist.json` documents every needed exemption with a justification. |

---

## 6. UAT-5 — Release-pipeline integration (FR-006, FR-020)

This UAT is verifiable only _after_ the feature merges and a release cuts. Until then, it's a desk-check:

1. Inspect `.github/workflows/release.yml` — confirm a "Validate SBoM (CycloneDX 1.6 schema)" step exists _before_ the "Create GitHub Release" step.
2. Confirm the release-create step uploads `sbom.json` as an asset (look for `gh release create … sbom.json` or equivalent).
3. After the first post-merge release, repeat UAT-2.

**Pass when**: the next Release has the SBoM attached; if a schema-validation failure is artificially induced (e.g. corrupt `sbom.json` on a release-test branch), no tag and no Release are created (FR-020).

---

## 7. Tests

```bash
npm run test:coverage    # ≥ 95 % per file
npm run test:ui          # Playwright incl. licenses.html navigation + axe-core scan
```

**Pass when**: both green, no coverage regressions, axe-core reports zero WCAG 2.2 AA failures on the new page.

---

## 8. Documentation cross-check

- `CLAUDE.md` "Active Technologies" lists the 034 entry with the two new dev deps.
- `CLAUDE.md` "Quality + security pipeline" describes the drift + license gates in the right order.
- `package.json` has three new `oss:*` scripts.

**Pass when**: all three docs/config items reflect reality.

---

## Sign-off

If every section above passes, flip PR #103 from draft to ready-for-review. The `/speckit-uat-run` command records each item's result and posts a UAT comment on the PR.
