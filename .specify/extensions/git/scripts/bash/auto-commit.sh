#!/usr/bin/env bash
# Git extension: auto-commit.sh
# Automatically commit changes after a Spec Kit command completes.
# Checks per-command config keys in git-config.yml before committing.
#
# Usage: auto-commit.sh <event_name>
#   e.g.: auto-commit.sh after_specify

set -e

EVENT_NAME="${1:-}"
if [ -z "$EVENT_NAME" ]; then
    echo "Usage: $0 <event_name>" >&2
    exit 1
fi

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

# Check if git is available
if ! command -v git >/dev/null 2>&1; then
    echo "[specify] Warning: Git not found; skipped auto-commit" >&2
    exit 0
fi

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "[specify] Warning: Not a Git repository; skipped auto-commit" >&2
    exit 0
fi

# Read per-command config from git-config.yml
_config_file="$REPO_ROOT/.specify/extensions/git/git-config.yml"
_enabled=false
_commit_msg=""

if [ -f "$_config_file" ]; then
    # Parse the auto_commit section for this event.
    # Look for auto_commit.<event_name>.enabled and .message
    # Also check auto_commit.default as fallback.
    _in_auto_commit=false
    _in_event=false
    _default_enabled=false

    while IFS= read -r _line; do
        # Detect auto_commit: section
        if echo "$_line" | grep -q '^auto_commit:'; then
            _in_auto_commit=true
            _in_event=false
            continue
        fi

        # Exit auto_commit section on next top-level key
        if $_in_auto_commit && echo "$_line" | grep -Eq '^[a-z]'; then
            break
        fi

        if $_in_auto_commit; then
            # Check default key
            if echo "$_line" | grep -Eq "^[[:space:]]+default:[[:space:]]"; then
                _val=$(echo "$_line" | sed 's/^[^:]*:[[:space:]]*//' | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')
                [ "$_val" = "true" ] && _default_enabled=true
            fi

            # Detect our event subsection
            if echo "$_line" | grep -Eq "^[[:space:]]+${EVENT_NAME}:"; then
                _in_event=true
                continue
            fi

            # Inside our event subsection
            if $_in_event; then
                # Exit on next sibling key (same indent level as event name)
                if echo "$_line" | grep -Eq '^[[:space:]]{2}[a-z]' && ! echo "$_line" | grep -Eq '^[[:space:]]{4}'; then
                    _in_event=false
                    continue
                fi
                if echo "$_line" | grep -Eq '[[:space:]]+enabled:'; then
                    _val=$(echo "$_line" | sed 's/^[^:]*:[[:space:]]*//' | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')
                    [ "$_val" = "true" ] && _enabled=true
                    [ "$_val" = "false" ] && _enabled=false
                fi
                if echo "$_line" | grep -Eq '[[:space:]]+message:'; then
                    _commit_msg=$(echo "$_line" | sed 's/^[^:]*:[[:space:]]*//' | sed 's/^["'\'']//' | sed 's/["'\'']*$//')
                fi
            fi
        fi
    done < "$_config_file"

    # If event-specific key not found, use default
    if [ "$_enabled" = "false" ] && [ "$_default_enabled" = "true" ]; then
        # Only use default if the event wasn't explicitly set to false
        # Check if event section existed at all
        if ! grep -q "^[[:space:]]*${EVENT_NAME}:" "$_config_file" 2>/dev/null; then
            _enabled=true
        fi
    fi
else
    # No config file — auto-commit disabled by default
    exit 0
fi

if [ "$_enabled" != "true" ]; then
    exit 0
fi

# Derive a human-readable command name from the event
# e.g., after_specify -> specify, before_plan -> plan
_command_name=$(echo "$EVENT_NAME" | sed 's/^after_//' | sed 's/^before_//')
_phase=$(echo "$EVENT_NAME" | grep -q '^before_' && echo 'before' || echo 'after')

# Use custom message if configured, otherwise default
if [ -z "$_commit_msg" ]; then
    _commit_msg="[Spec Kit] Auto-commit ${_phase} ${_command_name}"
fi

# ── Commit feature branch changes (if any) ───────────────────────────────────
_do_commit=true
if git diff --quiet HEAD 2>/dev/null && git diff --cached --quiet 2>/dev/null && [ -z "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
    echo "[specify] No changes to commit after $EVENT_NAME" >&2
    _do_commit=false
fi

if [ "$_do_commit" = "true" ]; then
    # Stage and commit
    git add --ignore-errors . 2>/dev/null || true
    _git_out=$(git commit -q -m "$_commit_msg" 2>&1) || { echo "[specify] Error: git commit failed: $_git_out" >&2; exit 1; }
    echo "✓ Changes committed ${_phase} ${_command_name}" >&2

    # Push to remote
    _current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)
    if [ -n "$_current_branch" ] && git remote get-url origin >/dev/null 2>&1; then
        _git_out=$(git push origin "$_current_branch" 2>&1) || { echo "[specify] Warning: git push failed: $_git_out" >&2; }
        echo "✓ Pushed ${_current_branch} to origin" >&2
    else
        echo "[specify] Warning: No remote configured; skipped push" >&2
    fi
fi

# ── BACKLOG.md update on main (after_specify only) ───────────────────────────
if [ "$EVENT_NAME" != "after_specify" ]; then
    exit 0
fi

_backlog_update_error() {
    echo "[specify] Warning: BACKLOG.md auto-update skipped: $1" >&2
}

# Read feature directory from .specify/feature.json
_feature_json="$REPO_ROOT/.specify/feature.json"
if [ ! -f "$_feature_json" ]; then
    _backlog_update_error ".specify/feature.json not found"
    exit 0
fi

_feature_dir=$(grep -o '"feature_directory"[[:space:]]*:[[:space:]]*"[^"]*"' "$_feature_json" \
    | sed 's/.*"feature_directory"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
if [ -z "$_feature_dir" ]; then
    _backlog_update_error "could not parse feature_directory from feature.json"
    exit 0
fi

_dir_basename=$(basename "$_feature_dir")
_feature_num=$(echo "$_dir_basename" | grep -oE '^[0-9]+')
_feature_num_int=$(echo "$_feature_num" | sed 's/^0*//')

if [ -z "$_feature_num" ]; then
    _backlog_update_error "could not extract feature number from '$_dir_basename'"
    exit 0
fi

# Extract feature name from spec.md title (first "# Title" line), fallback to dir name
_spec_file="$REPO_ROOT/$_feature_dir/spec.md"
if [ -f "$_spec_file" ]; then
    # Spec title format: "# Feature Specification: <Name>" or "# <Name>"
    _feature_name=$(grep -m1 '^# ' "$_spec_file" | sed 's/^# //' | sed 's/^Feature Specification:[[:space:]]*//' | sed 's/^Feature:[[:space:]]*//')
fi
if [ -z "$_feature_name" ]; then
    # Fallback: convert dir basename to title case, strip number prefix
    _feature_name=$(echo "$_dir_basename" | sed 's/^[0-9]*-//' | sed 's/-/ /g' \
        | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')
fi

# Check if main branch exists and has BACKLOG.md
if ! git show main:BACKLOG.md >/dev/null 2>&1; then
    _backlog_update_error "BACKLOG.md not found on main branch"
    exit 0
fi

# Skip if entry already exists
if git show main:BACKLOG.md | grep -qE "^\|[[:space:]]*0*${_feature_num_int}[[:space:]]*\|"; then
    echo "[specify] Feature ${_feature_num} already in BACKLOG.md; skipping" >&2
    exit 0
fi

# Create a temporary worktree pointing to main
_tmp_worktree=$(mktemp -d /tmp/speckit-backlog-XXXXXX)
if ! git worktree add "$_tmp_worktree" main >/dev/null 2>&1; then
    _backlog_update_error "could not create temporary worktree for main"
    rm -rf "$_tmp_worktree"
    exit 0
fi

_tmp_backlog="$_tmp_worktree/BACKLOG.md"
_new_row="| ${_feature_num} | ${_feature_name} | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | planned |"

# Insert the new row after the last existing feature row in the table
awk -v row="$_new_row" '
    { lines[NR]=$0; if (/^\|[[:space:]]*[0-9]/) last=NR }
    END {
        for (i=1; i<=NR; i++) {
            print lines[i]
            if (i==last) print row
        }
    }
' "$_tmp_backlog" > "${_tmp_backlog}.tmp" && mv "${_tmp_backlog}.tmp" "$_tmp_backlog"

# Update the "Last updated" date
_today=$(date +%Y-%m-%d)
sed -i "s/^Last updated:.*/Last updated: $_today/" "$_tmp_backlog"

# Commit and push
git -C "$_tmp_worktree" add BACKLOG.md
if git -C "$_tmp_worktree" commit -q -m "chore: add feature ${_feature_num} (${_feature_name}) to backlog" 2>&1; then
    echo "✓ BACKLOG.md updated on main with feature ${_feature_num} (${_feature_name})" >&2
    git -C "$_tmp_worktree" push origin main >/dev/null 2>&1 \
        || echo "[specify] Warning: push of BACKLOG.md to main failed" >&2
else
    echo "[specify] Warning: BACKLOG.md commit failed" >&2
fi

# Clean up temporary worktree
git worktree remove "$_tmp_worktree" --force >/dev/null 2>&1 || true
rm -rf "$_tmp_worktree" 2>/dev/null || true
