---
description: "Run unit and UI test suites as a post-implementation quality gate"
---

# Run Tests

Run the project's unit and UI test suites to verify the implementation is correct.

## Behavior

This command is invoked as a hook after implementation completes. It:

1. Runs `npm test` (Vitest unit tests)
2. Runs `npm run test:ui` (Playwright UI tests)
3. Exits non-zero if any suite fails, blocking the implementation from being marked complete

## Execution

Run the script:

- **Bash**: `.specify/extensions/git/scripts/bash/run-tests.sh`

## Graceful Degradation

- If `package.json` is missing: skips with a warning
- If a test suite fails: exits with error, implementation should not proceed to UAT
