#!/usr/bin/env bash
# Git extension: run-tests.sh
# Runs unit tests and UI tests as a post-implementation quality gate.
# Exits non-zero if any test suite fails.
#
# Usage: run-tests.sh

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

if [ ! -f "package.json" ]; then
    echo "[specify] Warning: No package.json found; skipped test run" >&2
    exit 0
fi

echo "── Running unit tests ──────────────────────────────────────────" >&2
npm test || { echo "[specify] ✗ Unit tests failed" >&2; exit 1; }
echo "✓ Unit tests passed" >&2

echo "── Running UI tests ───────────────────────────────────────────" >&2
npm run test:ui || { echo "[specify] ✗ UI tests failed" >&2; exit 1; }
echo "✓ UI tests passed" >&2

echo "✓ All tests passed — implementation complete" >&2
