#!/usr/bin/env bash
# Git extension: create-pr.sh
# Opens a GitHub pull request for the current feature branch after UAT passes.
#
# Usage: create-pr.sh
#   Reads spec.md from the matching specs/<feature-num>-*/ directory for the PR title/body.

set -e

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

_find_project_root() {
    local dir="$1"
    while [ "$dir" != "/" ]; do
        if [ -d "$dir/.specify" ] || [ -d "$dir/.git" ]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

REPO_ROOT=$(_find_project_root "$SCRIPT_DIR") || REPO_ROOT="$(pwd)"
cd "$REPO_ROOT"

# Check git
if ! command -v git >/dev/null 2>&1 || ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[specify] Warning: Not a Git repository; skipped PR creation" >&2
    exit 0
fi

# Check gh CLI
if ! command -v gh >/dev/null 2>&1; then
    echo "[specify] Warning: GitHub CLI (gh) not found; skipped PR creation" >&2
    exit 0
fi

CURRENT_BRANCH=$(git symbolic-ref --short HEAD 2>/dev/null)
if [ -z "$CURRENT_BRANCH" ]; then
    echo "[specify] Warning: Could not determine current branch; skipped PR creation" >&2
    exit 0
fi

# Refuse to open a PR from main/master
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "master" ]; then
    echo "[specify] Warning: On default branch ($CURRENT_BRANCH); skipped PR creation" >&2
    exit 0
fi

# Check remote is configured
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "[specify] Warning: No remote 'origin' configured; skipped PR creation" >&2
    exit 0
fi

# Check if a PR already exists for this branch
if gh pr view "$CURRENT_BRANCH" >/dev/null 2>&1; then
    echo "[specify] PR already exists for branch '$CURRENT_BRANCH'; skipped" >&2
    exit 0
fi

# Extract feature number prefix from branch name (e.g. 006 from 006-improve-settings)
FEATURE_NUM=""
if echo "$CURRENT_BRANCH" | grep -Eq '^[0-9]{3,}-'; then
    FEATURE_NUM=$(echo "$CURRENT_BRANCH" | grep -Eo '^[0-9]+')
fi

# Find matching spec directory and read title from spec.md
SPEC_TITLE=""
SPEC_SUMMARY=""
if [ -n "$FEATURE_NUM" ]; then
    SPEC_NUM_PADDED=$(printf "%03d" "$((10#$FEATURE_NUM))")
    SPEC_DIR=$(find "$REPO_ROOT/specs" -maxdepth 1 -type d -name "${SPEC_NUM_PADDED}-*" 2>/dev/null | head -1)
    if [ -n "$SPEC_DIR" ] && [ -f "$SPEC_DIR/spec.md" ]; then
        # First H1 heading in spec.md as the PR title
        SPEC_TITLE=$(grep -m1 '^# ' "$SPEC_DIR/spec.md" | sed 's/^# //' || true)
        # First non-empty paragraph after the title as summary
        SPEC_SUMMARY=$(awk '/^# /{found=1; next} found && /^[^#]/ && NF{print; exit}' "$SPEC_DIR/spec.md" || true)
    fi
fi

# Fall back to branch name if no spec title found
if [ -z "$SPEC_TITLE" ]; then
    SPEC_TITLE=$(echo "$CURRENT_BRANCH" | sed 's/^[0-9]*-//' | sed 's/-/ /g' | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) substr($i,2); print}')
fi

PR_BODY="## Summary

${SPEC_SUMMARY:-Feature implementation complete. UAT passed.}

## UAT

All acceptance tests in \`quickstart.md\` have passed.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"

# Determine default base branch
BASE_BRANCH=$(git remote show origin 2>/dev/null | grep 'HEAD branch' | sed 's/.*: //' || echo "main")

_pr_out=$(gh pr create \
    --title "$SPEC_TITLE" \
    --body "$PR_BODY" \
    --base "$BASE_BRANCH" \
    --head "$CURRENT_BRANCH" 2>&1) || {
    echo "[specify] Warning: gh pr create failed: $_pr_out" >&2
    exit 0
}

echo "✓ Pull request created: $_pr_out" >&2
