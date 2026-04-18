# Research: Automated Testing & CI/CD Pipeline

## R1: Unit Test Framework

**Decision**: Vitest

**Rationale**: Vitest is the modern standard for testing ES module JavaScript. It natively supports ES2022 modules (import/export) without transpilation, which matches the project's vanilla ES module architecture. It's fast, has built-in mocking, and works without a bundler.

**Alternatives considered**:
- **Jest**: Requires transpilation (Babel/SWC) for ES modules. Adds build complexity to a project that has no build step.
- **Mocha + Chai**: Works but requires more setup for mocking and assertions. Less ergonomic.
- **Node.js native test runner**: Limited mocking support; less mature ecosystem.

## R2: UI Test Framework

**Decision**: Playwright

**Rationale**: Playwright provides reliable cross-browser testing with built-in auto-wait (reduces flakiness), headless mode for CI, and excellent debugging tools. It can serve the static app and intercept network requests (for stubbing Redmine API responses) without needing a separate mock server.

**Alternatives considered**:
- **Cypress**: Good DX but single-tab only, Chromium-focused. Network stubbing is less flexible.
- **Puppeteer**: Lower-level, requires more boilerplate. Chrome-only.
- **Selenium/WebDriver**: Heavy, slow, flaky. Overkill for a static SPA.

## R3: API Mocking Strategy

**Decision**: Playwright `route()` for UI tests; Vitest `vi.mock()` for unit tests.

**Rationale**: Playwright's `route()` intercepts fetch requests at the network level, returning fixture JSON. This tests the full request pipeline including headers and URL construction. For unit tests, `vi.mock()` replaces the fetch function directly, keeping tests fast and isolated.

**Alternatives considered**:
- **MSW (Mock Service Worker)**: Good for shared mocks between unit and UI tests, but adds a dependency and complexity for a project that can use framework-native mocking.
- **Local mock server**: Adds a process to manage; fragile in CI.

## R4: CI/CD Platform

**Decision**: GitHub Actions

**Rationale**: The project is hosted on GitHub (both public for development and GitHub Enterprise for production). GitHub Actions is native, free for public repos, and available on GHE. No additional service to configure.

**Workflow structure**:
- `ci.yml`: Runs on push to any branch. Runs unit tests + UI tests. Reports status on PRs.
- `deploy.yml`: Runs on push to `main` only. After tests pass, deploys to GitHub Pages.

## R5: Deployment to GitHub Pages

**Decision**: Use `peaceiris/actions-gh-pages` action to deploy static files to GitHub Pages.

**Rationale**: Standard, well-maintained action. Copies the static files to the `gh-pages` branch. Works on both public GitHub and GHE. The `config.json` is excluded from the deployed files (it's environment-specific and added by the admin or CI secrets).

**config.json handling**: The CI workflow generates a `config.json` from GitHub Actions secrets/variables for the staging deployment. Production deployment on GHE would use its own secrets.
