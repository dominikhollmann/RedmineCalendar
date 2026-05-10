# Contributing to RedmineCalendar

Welcome, and thanks for picking this project up. This document is the entry point for new developers — read it first after cloning, then branch out into the deeper docs as you need them.

## What to read first

1. **[README.md](./README.md)** — how to run the app locally, configure `config.json`, and (for ops/admin work) deploy to a shared server.
2. **[CLAUDE.md](./CLAUDE.md)** — project-wide conventions: directory layout, npm scripts, code style, the quality + security pipeline, and the Spec Kit feature workflow. Keep this open while you work.
3. **[BACKLOG.md](./BACKLOG.md)** — the running tracker of features, UAT status, and outstanding work. Update it as part of every feature.

If you only have time to read one of those, read CLAUDE.md.

## Prerequisites

- **Node.js 20.x** — CI pins to Node 20 and the repo ships an `.nvmrc`. If you use [nvm](https://github.com/nvm-sh/nvm), `nvm use` picks it up automatically; otherwise install Node 20 via your usual method.
- **npm** — bundled with Node. The repo uses `package-lock.json`; prefer `npm ci` over `npm install` when you want a clean, reproducible install.
- A modern Chromium- or Firefox-based browser for manual testing. Playwright provisions its own browsers for the UI test suite.

No other system dependencies, no Docker, no global tools.

## Local setup

See [README.md → Quick start (local development)](./README.md#quick-start-local-development) for the full sequence (install deps, create `config.json`, generate dev certs, start `npm run dev`). It is intentionally not duplicated here — the README is the single source of truth for local setup.

Once `npm run dev` is running on `https://localhost:3000`, you're ready to write code.

## Development workflow

The project uses [Spec Kit](https://github.com/github/spec-kit) for all feature work. The flow is:

```
/speckit.specify → /speckit.clarify → /speckit.plan → /speckit.tasks → /speckit.implement → /speckit.uat → merge
```

In practice:

1. **Specify** — write the feature spec from a natural-language description. A new feature branch is created automatically (e.g. `024-some-feature`).
2. **Clarify** — answer up to five targeted questions to remove ambiguity. Answers are folded back into the spec.
3. **Plan** — generate the implementation plan and design artifacts.
4. **Tasks** — produce a dependency-ordered `tasks.md`.
5. **Implement** — execute the tasks. Tests are written alongside production code.
6. **UAT** — work through `quickstart.md` with the user. Only after UAT passes (and the user explicitly approves) does the branch merge to `main`.

`BACKLOG.md` is updated at each milestone — when a feature ships, it moves from "in flight" to "done."

## Branch and commit policy

### Branches

- **Application code** (`js/**`, `css/**`, `*.html`, `tests/**`, `scripts/**`, `docs/**`, `package.json`, `.github/workflows/**`, root markdown other than `BACKLOG.md`) lives on **feature branches** named `NNN-short-kebab-name` (matching the Spec Kit feature directory under `specs/`).
- **Process files only** (`.claude/**`, `.specify/**`, `BACKLOG.md`) may be committed directly to `main`.
- A `PreToolUse` hook in `.claude/settings.json` enforces this: `git commit` on `main` is blocked if the staged set contains anything outside the process-file allowlist. If you hit the block, that's the signal to create a feature branch.
- Feature branches merge to `main` only after `/speckit.uat` passes **and** the user explicitly approves. Never auto-merge.

### Commits

Commits use Conventional Commit prefixes. The history uses these in active rotation:

| Prefix      | When to use                                     |
| ----------- | ----------------------------------------------- |
| `feat:`     | New user-visible functionality                  |
| `fix:`      | Bug fix                                         |
| `chore:`    | Tooling, deps, CI, config — no behavior change  |
| `refactor:` | Internal restructuring with no behavior change  |
| `docs:`     | README, CLAUDE.md, CONTRIBUTING.md, in-app docs |
| `test:`     | Adding or restructuring tests only              |

A scope in parentheses is encouraged (e.g. `feat(calendar):`, `chore(security):`). Look at `git log --oneline` for the established style.

For AI-assisted commits, append a `Co-Authored-By:` trailer attributing the assistant. Don't skip pre-commit hooks (`--no-verify`); if a hook fails, fix the underlying issue and create a new commit.

## Quality gates (run locally before pushing)

CI will run all of these. Catching them locally is faster.

```bash
npm run lint           # ESLint v9 — must pass clean
npm run format:check   # Prettier — CI gate; use `npm run format` to fix
npm run htmlhint       # HTMLHint on *.html
npm run typecheck      # tsc --noEmit (JSDoc + js/types.d.ts)
npm test               # Vitest unit tests
npm run sqi            # Software Quality Index dashboard
```

The pre-commit hook (managed by Husky + lint-staged, see `.husky/pre-commit`) automatically runs `eslint --fix` and `prettier --write` on staged files, so simple style nits are handled for you. The hook does **not** run tests or `tsc` — that's still on you before pushing.

The full CI sequence is documented in [CLAUDE.md → Quality + security pipeline](./CLAUDE.md#quality--security-pipeline). The Software Quality Index is a single 0–100 composite from 8 metrics; any regression below the GREEN band (≥60) needs justification.

## Testing requirements

The test suite lives under `tests/`:

```
tests/
  unit/         # Vitest — pure-logic modules
  ui/           # Playwright — end-to-end user flows
  fixtures/    # Shared test data + mocks
  vitest.config.js
  playwright.config.js
```

- **Unit tests** — [Vitest](https://vitest.dev/) under `tests/unit/`. The coverage threshold is **95% lines per file** for production modules; the run will fail if any file dips below. New pure-logic modules ship with their tests in the same PR.
- **UI tests** — [Playwright](https://playwright.dev/) under `tests/ui/`. User-visible flows (form submissions, view switches, calendar interactions, chatbot tool calls) get a UI test. Run with `npm run test:ui`.
- **Coverage commands**:
  - `npm run test:coverage` — Vitest with per-file thresholds
  - `npm run test:coverage:all` — full pipeline (unit + UI + unified line-level merge via `scripts/coverage-merge.mjs`)

DOM-heavy modules that resist clean unit testing should still be exercised through Playwright. A new feature without tests will not pass review.

When a test fails locally, Playwright drops a `test-results/` directory with traces, screenshots, and videos — open the HTML report with `npx playwright show-report` to debug.

## Code style essentials

The full style guide lives in [CLAUDE.md → Code Style](./CLAUDE.md#code-style). The non-negotiables:

- **Vanilla ES2022 modules.** No build step, no bundler, no transpilation. `<script type="module">` everywhere. FullCalendar and MSAL.js load from CDN.
- **No hardcoded user-visible strings.** Every label, error, tooltip, toast, or button caption goes into `js/i18n/en.js` and `js/i18n/de.js` and is read via `t('key')`. ESLint enforces this for the common `Issue #${id}` template; reviewers will catch the rest.
- **JSDoc on public exports of pure-logic modules.** `tsc --noEmit` runs in CI against the JSDoc + `js/types.d.ts`. Shared types belong in `js/types.d.ts`.
- **DOM-heavy modules** may opt out of strict typing with `// @ts-nocheck` at the top of the file. Don't sprinkle `@ts-ignore` — opt out cleanly or type properly.
- **Prettier owns formatting.** Don't hand-format; the pre-commit hook will fight you.
- **fetch + `X-Redmine-API-Key` header** for all Redmine HTTP. No third-party HTTP libraries.

## PR checklist

Before opening a PR:

- [ ] Branch name follows `NNN-short-kebab-name` (matches `specs/` directory)
- [ ] All quality gates pass locally (`lint`, `format:check`, `typecheck`, `test`, `sqi`)
- [ ] New or changed code has tests (Vitest for logic, Playwright for UI flows)
- [ ] Per-file line coverage stays at or above 95%
- [ ] SQI score did not regress out of the GREEN band (≥60)
- [ ] User-visible strings added to both `js/i18n/en.js` and `js/i18n/de.js`
- [ ] `/speckit.uat` was run and passed; user explicitly approved the merge
- [ ] `BACKLOG.md` updated to reflect the feature's new state
- [ ] Commit messages use a Conventional Commit prefix

## Where to ask

Internal Slack/Teams channel — **TBD by handover team.** Until that's set up:

- Open a draft PR early and tag a maintainer for design feedback.
- File a GitHub issue for bugs, regressions, or scoped feature ideas. `BACKLOG.md` is for tracked, in-flight work — issues are for everything else.
- For urgent operational questions about a deployed instance (auth failure, broken deploy, CORS proxy down), see [README.md → Company deployment](./README.md#company-deployment-multi-user).

Welcome aboard.
