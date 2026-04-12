---
description: "Open a GitHub pull request after UAT passes"
---

# Create Pull Request

Open a GitHub pull request for the current feature branch after UAT completes successfully.

## Prerequisites

- Verify Git is available: `git rev-parse --is-inside-work-tree 2>/dev/null`
- Verify the GitHub CLI (`gh`) is available: `command -v gh`
- If either is missing, warn the user and skip PR creation

## Execution

Run the script from the project root:

- **Bash**: `.specify/extensions/git/scripts/bash/create-pr.sh`

The script will:
1. Detect the current feature branch
2. Find the matching `specs/<num>-*/spec.md` and extract the feature title and summary
3. Check whether a PR already exists for this branch (skips if so)
4. Run `gh pr create` with the feature title as the PR title and a summary body

## Graceful Degradation

- If Git is not installed or the directory is not a repository: skip with a warning
- If `gh` is not installed: skip with a warning
- If no remote `origin` is configured: skip with a warning
- If already on `main`/`master`: skip with a warning
- If a PR already exists for this branch: skip with a message
- If `gh pr create` fails: warn and exit cleanly (do not block the UAT workflow)
