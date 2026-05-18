# Feature Specification: SBoM & Open-Source Attributions

**Feature Branch**: `034-sbom-and-attributions`
**Created**: 2026-05-18
**Status**: Draft
**Input**: User description: "Include a SBoM in the build artifact and add affiliations to the app for the open source libraries used. For affiliation: What would be a typical place for the affiliations? It shouldn't be on the main page but could be a link on the help page or settings page. Both SBoM and attributions need to be checked/updated for all future development. Might be good to integrate automatic tools in the CI pipeline"

## User Scenarios & Testing _(mandatory)_

This feature bundles three independently shippable slices around the same theme — open-source dependency transparency — plus an optional license-allowlist guard. The three primary slices share scaffolding (a generator, the dependency inventory) but each delivers value on its own.

### User Story 1 — Open-source attributions reachable from the app (Priority: P1)

A user (or compliance reviewer, or auditor) opens the running app and can — without reading the source code, the repo, or a release notes file — find a page that lists every open-source library shipped in the app, its version, its license, a copyright notice when present, and a link to the upstream project. The page is not surfaced on the main calendar page; it is a discreet link from a stable secondary surface (the Settings page footer — see Assumptions for placement rationale and alternatives). Users do not need an account, an admin role, or special permissions to view it.

**Why this priority**: This is the user-visible compliance obligation imposed by every permissive open-source license the app already depends on (MIT, BSD, Apache-2.0 all require attribution in a "reasonable" location distributable to end users). Without it the app is technically out of compliance with the licenses of its own dependencies. The fix is small in scope (one new page + one new link) and unlocks the SBoM story (US2) by establishing the same dependency inventory the SBoM consumes.

**Independent Test**: From any in-app screen, a user can reach the attributions page in ≤ 2 clicks. The page lists every runtime dependency (FullCalendar, MSAL.js, plus any future runtime libs) and every npm production dependency, each with name, version, SPDX license identifier, and an outbound link. Removing or upgrading a runtime dep and re-running the generator (US3) updates the page; no manual edits are needed.

**Acceptance Scenarios**:

1. **Given** the app is loaded, **When** the user navigates to the Settings page, **Then** a discreet "Open-source licenses" (or equivalent localised label) link appears in a non-prominent location (Settings page footer or the bottom of the existing in-app docs panel — see Assumptions).
2. **Given** the user clicks the "Open-source licenses" link, **When** the attributions view opens, **Then** every runtime open-source dependency the app ships is listed with **name**, **version**, **SPDX license identifier**, **copyright notice** (when the upstream package exposes one), and a **link to the upstream project's homepage or repository**.
3. **Given** the attributions list is shown, **When** the user reads it, **Then** entries are sorted alphabetically by package name and CDN-loaded runtime libs (FullCalendar, MSAL.js) appear alongside npm-resolved runtime deps with no visible distinction in format.
4. **Given** the project's localisation system (German + English), **When** the attributions page renders, **Then** the page chrome (headings, label "Version", "License", etc.) is localised in both `en.js` and `de.js`; the library names, version strings, license IDs, copyright notices, and URLs are not translated.
5. **Given** the attributions page has loaded, **When** the user copies a license identifier or a URL, **Then** the values match what the SBoM (US2) reports for the same library — there is a single source of truth.

---

### User Story 2 — SBoM published with every release (Priority: P1)

Every published release of the app carries a machine-readable Software Bill of Materials describing the full set of dependencies (runtime + the dev-tool chain that produced the release), each with version, license, and supplier metadata. The SBoM is downloadable as an asset on the GitHub Release and accessible at a stable URL on the running app (e.g. `/sbom.json`, served as a static file alongside `version.json`) so a downstream consumer can fetch it without cloning the repo.

**Why this priority**: A SBoM is the standard artifact that procurement, vulnerability-management, and regulatory processes (EU CRA, US EO 14028, BSI TR-03183) consume. Providing it is increasingly a precondition for adoption in regulated environments. The SBoM is also the canonical source that US3's CI gate compares against to detect drift — it is therefore foundational to both transparency and automation.

**Independent Test**: After a release is cut, the GitHub Release page lists an SBoM file as an attached asset. The file validates against the chosen SBoM schema with no errors. Fetching `/sbom.json` from the deployed app returns the same SBoM. Every runtime dependency listed on the attributions page (US1) appears in the SBoM with matching version and license.

**Acceptance Scenarios**:

1. **Given** a release tag is pushed, **When** the release pipeline runs, **Then** an SBoM file is generated and attached to the GitHub Release as an asset.
2. **Given** the SBoM file, **When** validated against the published SBoM schema for its format (see Assumptions: CycloneDX 1.6 JSON), **Then** validation passes with zero errors.
3. **Given** the deployed app, **When** a consumer fetches `/sbom.json`, **Then** the response body is the SBoM for the deployed version, identical in content to the GitHub Release asset for that version.
4. **Given** the SBoM, **When** a consumer reads it, **Then** every entry carries at minimum: package name, version, SPDX license identifier (or `NOASSERTION` if unknown), and a package URL (`pkg:` identifier) or supplier reference.
5. **Given** the SBoM and the attributions page (US1) for the same release, **When** their dependency lists are diffed, **Then** every runtime dependency appears in both with identical name + version + license — they are generated from the same source.
6. **Given** the SBoM includes the build-time toolchain (Node version, key build/test tools), **When** an auditor inspects it, **Then** the runtime-vs-build distinction is preserved via the SBoM's standard scope/usage fields (e.g. CycloneDX `scope: required` vs `scope: optional`).

---

### User Story 3 — CI keeps attributions + SBoM current on every dependency change (Priority: P1)

When a developer opens a pull request that changes the project's dependency tree (a new npm package, a version bump, a removed package, a new CDN-loaded runtime lib), CI regenerates the attributions data and the SBoM and fails the PR if the committed files do not match what the generator would produce. This guarantees that no dependency change reaches `main` without the in-app attribution page and the SBoM being updated to match. The check runs on every PR, not only on release tags.

**Why this priority**: Without automation, attributions and the SBoM rot the moment a single Dependabot PR merges. Manual maintenance of an attribution list against ~hundreds of transitive npm deps is not realistic — the project already takes weekly grouped Dependabot bumps (testing group, dev-tooling group) that touch dependencies regularly. CI is the only durable enforcement mechanism. This is P1 because shipping US1/US2 without it would mean both go stale within weeks and re-introduce the very compliance problem the feature is meant to fix.

**Independent Test**: Open a PR that adds a new npm dependency (or bumps an existing one). Do not regenerate the attribution data or the SBoM. CI fails on a clearly named check ("attribution/sbom drift") with a message naming the stale files and the command the developer must run locally to regenerate them. Run that command, commit the regenerated files, push — CI passes. Repeat with a CDN-loaded runtime lib added to the relevant manifest — CI fails until the manifest entry is committed alongside the regenerated artifacts.

**Acceptance Scenarios**:

1. **Given** a PR changes `package.json`, `package-lock.json`, or the manifest of CDN-loaded runtime libs (see Assumptions), **When** CI runs, **Then** a dedicated step regenerates the attribution data + SBoM into a temp location and diffs against the committed files; any difference fails the PR.
2. **Given** the drift check fails, **When** the developer reads the CI log, **Then** the failure message names the stale file(s) and the exact local command to regenerate them (single npm script entry).
3. **Given** the developer runs the regeneration command locally and commits the result, **When** CI re-runs, **Then** the drift check passes.
4. **Given** a PR does not touch any dependency manifest, **When** CI runs, **Then** the drift check still runs (cheap, < 30 s) and passes with no changes — it is not gated on manifest changes, so a hand-edited generated file is also detected.
5. **Given** the regeneration runs locally as a one-step `npm run` script, **When** a developer invokes it, **Then** it updates both the attributions data file consumed by US1 and the SBoM file consumed by US2 in a single pass — no separate commands.

---

### User Story 4 — CI blocks dependencies under disallowed licenses (Priority: P2)

When a PR introduces a dependency (direct or transitive) whose SPDX license is not on the project's allowlist of permissive licenses, CI fails the PR with a clear message naming the offending package and its license. The allowlist is committed to the repo and editable by the project maintainer. A package with no detectable license also fails. The maintainer can add a one-off exemption for a specific `name@version` with a justification comment if a borderline-but-acceptable dependency is genuinely required.

**Why this priority**: This is the regression-prevention complement to US1/US2 — it catches the case where a Dependabot bump or a new dep silently pulls in a strongly-copyleft transitive lib (GPL, AGPL) that would compromise the app's distribution license. It is P2 because US1/US2/US3 together already make the license of every dep visible; this step adds active blocking. Bumping from P3 to P2 reflects that license compliance failures discovered post-merge are very costly to unwind.

**Independent Test**: Add a fake dependency whose `package.json` declares a non-allowlisted license (e.g. `GPL-3.0-only`). CI fails with a clear message naming the package and its license. Add the package to the exemption list with a justification comment — CI passes. Add a fake dependency with no `license` field — CI fails. Restore the allowlist — CI passes.

**Acceptance Scenarios**:

1. **Given** the project ships a committed allowlist of acceptable SPDX license identifiers, **When** CI runs the license check on a PR, **Then** every dependency (direct + transitive, runtime + dev) whose license is outside the allowlist fails the PR.
2. **Given** a dependency declares no license (or a malformed license string the SPDX parser cannot resolve), **When** CI runs the license check, **Then** the PR fails with a message identifying the package and the parse failure.
3. **Given** the maintainer adds `pkg@version: "<justification>"` to the exemption file and commits it, **When** CI re-runs on a PR using that exact version, **Then** the check passes for that specific entry; an unrelated package or a different version of the same package is not exempted.
4. **Given** the allowlist initially contains: MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0, ISC, MPL-2.0, 0BSD, Unlicense, CC0-1.0 (see Assumptions), **When** every current direct + transitive dependency is checked, **Then** the existing tree passes with zero exemptions or an exemption file documenting any that need it (committed alongside this feature).

---

### Edge Cases

- **CDN-loaded runtime libs.** FullCalendar and MSAL.js are loaded via `<script>` tags from a CDN, not resolved by npm. They are runtime dependencies for license-compliance purposes and MUST appear on the attributions page (US1) and in the SBoM (US2). A small manifest file (committed) declares each CDN-loaded lib with its name, version, license, homepage, and CDN URL; the generator (US3) reads it.
- **Transitive deps.** The SBoM (US2) includes the full transitive dep tree of production npm packages. The in-app attributions page (US1) also lists transitives — they are also shipped/redistributed in the legal sense, so the same compliance obligation attaches. (For a static SPA with no real backend, the published artifact is whatever a release attaches; this conservatively treats every transitive as redistributed.)
- **Dev-only deps in SBoM.** The SBoM includes dev/build deps under the standard "optional/build" scope distinction so consumers can filter. The attributions page lists runtime only — dev-only deps that never ship to a user need not be attributed to the user.
- **Dual-licensed deps.** When `package.json` declares an SPDX expression like `MIT OR Apache-2.0`, the attributions page displays the full expression verbatim; the license-allowlist check (US4) treats the package as acceptable if at least one term in the expression is on the allowlist.
- **Unknown / `UNLICENSED` / missing license.** Attributions page shows `License: unknown` for transparency. SBoM uses `NOASSERTION`. US4's license check fails the PR — an exemption must be filed if the package is genuinely needed.
- **Same package, two versions in the tree.** Both entries appear in the SBoM (different `pkg:` identifiers) and on the attributions page (sorted, both versions listed).
- **Generator unavailable** (e.g. offline CI). The drift check is run from a checked-in dataset, not regenerated from npm registry calls, so the check works fully offline; only release-time SBoM emission and on-demand local regeneration need network access.
- **License of vendored/in-tree code** (e.g. `.specify/` Spec Kit vendor tree). Vendored sources carry their own license metadata; they are listed once each (not per-file) in the attributions and SBoM under a "vendored" supplier category.
- **App is i18n'd but library metadata is not.** Library names, versions, license IDs, copyright notices, and homepage URLs are never translated; only the surrounding page chrome ("Version", "License", page title) is translated.
- **No build step today.** The app is a static SPA with no bundler. The "build artifact" the user refers to is the deployed set of static files and the corresponding GitHub Release. The SBoM is published as both a Release asset and `/sbom.json` next to `version.json`.

## Requirements _(mandatory)_

### Functional Requirements

**Attributions in the app (US1):**

- **FR-001**: The app MUST expose a navigable "Open-source licenses" page reachable from a non-prominent link on the Settings page; the link MUST NOT appear on the main calendar page.
- **FR-002**: The attributions page MUST list every runtime open-source dependency the app ships — both npm-resolved production dependencies (direct + transitive) and CDN-loaded runtime libraries (FullCalendar, MSAL.js, plus any future runtime additions).
- **FR-003**: Each listed entry MUST show: package name, version, SPDX license identifier (or `unknown`), copyright notice when the upstream package exposes one, and a link to the upstream project's homepage or repository.
- **FR-004**: The attributions page chrome (title, column labels, "back" link, etc.) MUST be available in both English and German via the existing `js/i18n/{en,de}.js` mechanism; library names, versions, license IDs, copyright notices, and URLs MUST NOT be translated.
- **FR-005**: The attributions page data MUST be sourced from a single generator (see FR-009) so it cannot drift from the SBoM (FR-006).

**SBoM (US2):**

- **FR-006**: The release pipeline MUST emit a Software Bill of Materials in CycloneDX 1.6 JSON format and attach it to the GitHub Release as a downloadable asset for every version tag the pipeline cuts.
- **FR-007**: The SBoM MUST validate against the published CycloneDX 1.6 JSON schema with zero errors.
- **FR-008**: The deployed app MUST serve the same SBoM at `/sbom.json` (static file alongside the existing `version.json`) so a consumer can fetch the SBoM for the running version without GitHub API access.
- **FR-008a**: Each SBoM component entry MUST carry at minimum: `name`, `version`, SPDX `licenses`, a package URL (`purl`), and a `scope` field distinguishing required (runtime) from optional (build/dev) components.

**Single source of truth (US1 + US2):**

- **FR-009**: A single committed generator script MUST produce both the attributions data file consumed by FR-002 and the SBoM file consumed by FR-006/FR-008, in one invocation, from the same input dataset (npm dependency tree + the CDN-runtime manifest of FR-010).
- **FR-010**: The project MUST maintain a committed manifest of CDN-loaded runtime libraries declaring name, version, license, homepage, and CDN URL for each; the generator MUST read this manifest in addition to the npm dependency tree.

**CI drift gate (US3):**

- **FR-011**: CI MUST run on every PR (not only release tags) a "attribution/sbom drift" check that regenerates the attribution data file and the SBoM to a scratch location and diffs against the committed files; any difference MUST fail the PR.
- **FR-012**: When the drift check fails, the CI log MUST name the stale file(s) and the single local `npm` script name that regenerates them.
- **FR-013**: The drift check MUST be fully offline — it MUST NOT require live calls to the npm registry or the CDN at PR time; the committed dataset alone is sufficient input.

**License allowlist (US4):**

- **FR-014**: The project MUST commit an SPDX license allowlist and a per-PR CI check that fails when any direct or transitive dependency (runtime or dev) declares a license not on the allowlist.
- **FR-015**: A dependency declaring no license, an unparseable license string, or `UNLICENSED` MUST fail the FR-014 check.
- **FR-016**: The project MUST commit an exemption file allowing a maintainer to override the FR-014 check for a specific `name@version` with a written justification; an exemption MUST NOT apply to a different version of the same package or to a different package.
- **FR-017**: For an SPDX license expression (e.g. `MIT OR Apache-2.0`), the FR-014 check MUST treat the package as acceptable if at least one term in the expression is on the allowlist.

**Process / housekeeping:**

- **FR-018**: The drift check (FR-011) and the license check (FR-014) MUST be wired into the existing `.github/workflows/` CI pipeline alongside the existing lint/test/SQI gates; they MUST run on every PR and on `main`.
- **FR-019**: Documentation in `CLAUDE.md` (under "Quality + security pipeline") MUST be updated to list the two new CI gates and the local regeneration command.

### Key Entities

- **Dependency record** — Represents one open-source library the project depends on (whether resolved via npm or loaded from a CDN). Attributes: name, version, SPDX license identifier or expression, copyright notice (optional), homepage/repository URL, supplier (npm | cdn | vendored), scope (runtime | dev/build). One record is consumed by both the in-app attributions page (US1) and the SBoM (US2).
- **CDN-runtime manifest** — A committed file listing every CDN-loaded runtime library with the same attributes as a dependency record. Replaces the missing npm metadata for libs that bypass the package manager. Maintainer edits this file when a CDN-loaded lib is added, removed, or version-bumped.
- **License allowlist** — A committed list of SPDX license identifiers the project accepts. Default contents (see Assumptions). Editable by the maintainer.
- **License exemption** — An entry in a committed exemption file mapping `name@version` → free-text justification, used to override the allowlist check (US4) for a single dependency at a single version.
- **SBoM artifact** — One CycloneDX 1.6 JSON file per release, attached to the GitHub Release and served at `/sbom.json` by the deployed app. Generated alongside the attributions data file from the same dependency records.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: A user can reach the open-source attributions page from any in-app screen in ≤ 2 clicks.
- **SC-002**: The attributions page lists 100 % of the app's runtime open-source libraries (npm production deps + CDN-loaded libs), each with name, version, license, and an outbound link.
- **SC-003**: Every GitHub Release cut after this feature ships carries an SBoM asset that validates against the CycloneDX 1.6 JSON schema with zero errors.
- **SC-004**: For any released version, the contents of `/sbom.json` on the deployed app and the SBoM asset attached to the corresponding GitHub Release are byte-identical.
- **SC-005**: A diff of the dependency list extracted from the attributions page vs. the runtime-scope entries of the SBoM, for the same release, yields zero discrepancies.
- **SC-006**: Adding, removing, or version-bumping any dependency (npm or CDN) and committing only the manifest change — without re-running the generator — fails CI on a clearly named drift check within 60 s.
- **SC-007**: Running the single committed regeneration command locally produces a clean repo (no further diffs) for any otherwise-clean state of the dependency manifests.
- **SC-008**: Introducing a dependency under a license not on the allowlist (and not exempted) fails CI on the license check; introducing one with no detectable license also fails.
- **SC-009**: Zero manual edits to the generated attributions data file or the SBoM are ever required on a normal dependency-change PR — the generator output is the only source of truth, and CI enforces it.

## Assumptions

- **SBoM format**: CycloneDX 1.6 JSON. Chosen because it is the OWASP-maintained industry standard with first-class npm tooling, GitHub renders/recognises the format natively, and CycloneDX is the format named by the EU CRA's reference profile. SPDX is a credible alternative but adds friction (less convenient JS tooling, more verbose). If a downstream consumer requires SPDX, generating both from the same dataset is a small follow-up.
- **Attributions placement**: The link sits in the **Settings page footer**, labelled "Open-source licenses" (localised). Rationale: Settings is the canonical "everything-about-this-app" surface, the user explicitly excluded the main calendar page, the existing in-app docs panel is content-focused (user-facing how-to articles) rather than meta-information, and Settings is the page already touched by recent feature 033's similar information-architecture cleanup. The page itself is a dedicated route/view (not a modal), so URL-sharing and right-click-open-in-new-tab work as users expect. A secondary "Open-source licenses" entry MAY also appear at the bottom of the in-app docs panel for discoverability, since some users will look there first — but the canonical location is Settings.
- **Attributions scope**: Runtime-only. npm devDeps and build/test tooling appear in the SBoM (under build/optional scope) but not on the user-facing attributions page, because they are not shipped to end users. Vendored sources (`.specify/`) appear in both because they are checked into the repo and effectively redistributed.
- **License allowlist default**: MIT, BSD-2-Clause, BSD-3-Clause, Apache-2.0, ISC, MPL-2.0, 0BSD, Unlicense, CC0-1.0. This is the standard permissive set; LGPL, GPL, AGPL, SSPL, and Commons Clause licenses are excluded by default to preserve the project's distribution flexibility. The maintainer can edit the list.
- **CDN-runtime manifest format**: A committed JSON file (e.g. `cdn-runtime.json`) at the repo root, structured as an array of records `{name, version, license, homepageUrl, cdnUrl}`. Hand-maintained — CDN libs change rarely (years between FullCalendar / MSAL major bumps), so the maintenance burden is negligible and the file becomes a natural review surface.
- **Build artifact definition**: The app has no bundler/transpiler, so the "build artifact" is the deployed set of static files plus the GitHub Release. The SBoM is published in both places to cover both consumption modes.
- **Existing release pipeline**: The existing `.github/workflows/release.yml` (which already creates tags, milestones, and Release notes on PR merge) is the natural insertion point for SBoM generation + attachment. The drift check + license check go into the existing PR-time workflow alongside lint/test/SQI.
- **Tooling**: SBoM generation uses `@cyclonedx/cyclonedx-npm` (or equivalent); license scanning uses an established npm license tool (e.g. `license-checker`, `oss-attribution-generator`, or similar). The exact npm packages are an implementation detail to be selected in `/speckit-plan`. The user's request to "integrate automatic tools in the CI pipeline" is satisfied by any well-maintained tool meeting the FRs above.
- **Out of scope**: VEX (Vulnerability Exploitability eXchange) documents, SLSA provenance attestations, signed releases, full dependency-tree security signing. These are natural follow-ups but are not requested and would substantially expand scope.
