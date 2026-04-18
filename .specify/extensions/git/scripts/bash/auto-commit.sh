#!/usr/bin/env bash
# Git extension: auto-commit.sh
# Automatically commit changes after a Spec Kit command completes.
# Checks per-command config keys in git-config.yml before committing.
# Also keeps BACKLOG.md on main up-to-date after each speckit step.
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
    _in_auto_commit=false
    _in_event=false
    _default_enabled=false

    while IFS= read -r _line; do
        if echo "$_line" | grep -q '^auto_commit:'; then
            _in_auto_commit=true
            _in_event=false
            continue
        fi
        if $_in_auto_commit && echo "$_line" | grep -Eq '^[a-z]'; then
            break
        fi
        if $_in_auto_commit; then
            if echo "$_line" | grep -Eq "^[[:space:]]+default:[[:space:]]"; then
                _val=$(echo "$_line" | sed 's/^[^:]*:[[:space:]]*//' | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')
                [ "$_val" = "true" ] && _default_enabled=true
            fi
            if echo "$_line" | grep -Eq "^[[:space:]]+${EVENT_NAME}:"; then
                _in_event=true
                continue
            fi
            if $_in_event; then
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

    if [ "$_enabled" = "false" ] && [ "$_default_enabled" = "true" ]; then
        if ! grep -q "^[[:space:]]*${EVENT_NAME}:" "$_config_file" 2>/dev/null; then
            _enabled=true
        fi
    fi
else
    exit 0
fi

if [ "$_enabled" != "true" ]; then
    exit 0
fi

# Derive a human-readable command name from the event
_command_name=$(echo "$EVENT_NAME" | sed 's/^after_//' | sed 's/^before_//')
_phase=$(echo "$EVENT_NAME" | grep -q '^before_' && echo 'before' || echo 'after')

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
    git add --ignore-errors . 2>/dev/null || true
    _git_out=$(git commit -q -m "$_commit_msg" 2>&1) || { echo "[specify] Error: git commit failed: $_git_out" >&2; exit 1; }
    echo "✓ Changes committed ${_phase} ${_command_name}" >&2

    _current_branch=$(git symbolic-ref --short HEAD 2>/dev/null)
    if [ -n "$_current_branch" ] && git remote get-url origin >/dev/null 2>&1; then
        _git_out=$(git push origin "$_current_branch" 2>&1) || { echo "[specify] Warning: git push failed: $_git_out" >&2; }
        echo "✓ Pushed ${_current_branch} to origin" >&2
    else
        echo "[specify] Warning: No remote configured; skipped push" >&2
    fi
fi

# ── BACKLOG.md update on main ─────────────────────────────────────────────────
# Fires for: after_specify, after_clarify, after_plan, after_tasks, after_implement, after_uat
case "$EVENT_NAME" in
    after_specify|after_clarify|after_plan|after_tasks|after_implement|after_uat) ;;
    *) exit 0 ;;
esac

_backlog_warn() { echo "[specify] Warning: BACKLOG.md auto-update skipped: $1" >&2; }

# Resolve feature directory using the same priority as common.sh:
#   1. SPECIFY_FEATURE_DIRECTORY env var (explicit override)
#   2. SPECIFY_FEATURE env var → resolve to .specify/features/<value>
#   3. .specify/feature.json (persisted by create-new-feature.sh)
_feature_dir=""
if [ -n "${SPECIFY_FEATURE_DIRECTORY:-}" ]; then
    _feature_dir="$SPECIFY_FEATURE_DIRECTORY"
elif [ -n "${SPECIFY_FEATURE:-}" ]; then
    # Find the matching feature directory by prefix
    _prefix=$(echo "$SPECIFY_FEATURE" | grep -oE '^[0-9]+')
    if [ -n "$_prefix" ] && [ -d "$REPO_ROOT/.specify/features" ]; then
        for _d in "$REPO_ROOT/.specify/features/${_prefix}"-*; do
            if [ -d "$_d" ]; then
                _feature_dir=".specify/features/$(basename "$_d")"
                break
            fi
        done
    fi
fi
if [ -z "$_feature_dir" ]; then
    _feature_json="$REPO_ROOT/.specify/feature.json"
    if [ ! -f "$_feature_json" ]; then
        _backlog_warn ".specify/feature.json not found"; exit 0
    fi
    _feature_dir=$(grep -o '"feature_directory"[[:space:]]*:[[:space:]]*"[^"]*"' "$_feature_json" \
        | sed 's/.*"feature_directory"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
fi
if [ -z "$_feature_dir" ]; then
    _backlog_warn "could not resolve feature directory"; exit 0
fi

_dir_basename=$(basename "$_feature_dir")
_feature_num=$(echo "$_dir_basename" | grep -oE '^[0-9]+')
_feature_num_int=$(echo "$_feature_num" | sed 's/^0*//')

if [ -z "$_feature_num" ]; then
    _backlog_warn "could not extract feature number from '$_dir_basename'"; exit 0
fi

# Feature name (for specify row insertion only)
_feature_name=""
_spec_file="$REPO_ROOT/$_feature_dir/spec.md"
if [ -f "$_spec_file" ]; then
    _feature_name=$(grep -m1 '^# ' "$_spec_file" | sed 's/^# //' \
        | sed 's/^Feature Specification:[[:space:]]*//' | sed 's/^Feature:[[:space:]]*//')
fi
if [ -z "$_feature_name" ]; then
    _feature_name=$(echo "$_dir_basename" | sed 's/^[0-9]*-//' | sed 's/-/ /g' \
        | awk '{for(i=1;i<=NF;i++) $i=toupper(substr($i,1,1)) tolower(substr($i,2)); print}')
fi

# Verify BACKLOG.md exists on main
if ! git show main:BACKLOG.md >/dev/null 2>&1; then
    _backlog_warn "BACKLOG.md not found on main branch"; exit 0
fi

# ── Determine what to change ─────────────────────────────────────────────────
# BACKLOG.md table columns (pipe-split field indices):
#   $2=num  $3=name  $4=specify  $5=clarify  $6=plan  $7=tasks  $8=implement  $9=uat  $10=status  $11=version
_col=""        # field index to set to ✅ (empty = insert new row)
_skip_col=""   # field index to set to ⏭️ if still ⬜ (optional step skipped)
_new_status="" # new value for $10 (empty = leave unchanged)

case "$EVENT_NAME" in
    after_specify)
        # Insert new row if not present; otherwise mark specify done
        if git show main:BACKLOG.md | grep -qE "^\|[[:space:]]*0*${_feature_num_int}[[:space:]]*\|"; then
            _col=4
        else
            _col=""   # signals row insertion
        fi
        ;;
    after_clarify)   _col=5 ;;
    after_plan)      _col=6; _skip_col=5 ;;
    after_tasks)     _col=7 ;;
    after_implement) _col=8; _new_status="**uat pending**" ;;
    after_uat)       _col=9; _new_status="**done**" ;;
esac

# ── Apply update via a worktree on main ──────────────────────────────────────
# Reuse an existing worktree that has main checked out, or create a temp one.
_tmp_wt=""
_tmp_wt_created=false

_existing_main_wt=$(git worktree list --porcelain 2>/dev/null \
    | awk '/^worktree /{wt=$2} /^branch refs\/heads\/main$/{print wt; exit}')

if [ -n "$_existing_main_wt" ] && [ -d "$_existing_main_wt" ]; then
    _tmp_wt="$_existing_main_wt"
else
    _tmp_wt=$(mktemp -d /tmp/speckit-backlog-XXXXXX)
    if ! git worktree add "$_tmp_wt" main >/dev/null 2>&1; then
        _backlog_warn "could not create temporary worktree for main"
        rm -rf "$_tmp_wt"; exit 0
    fi
    _tmp_wt_created=true
fi

_bl="$_tmp_wt/BACKLOG.md"
_today=$(date +%Y-%m-%d)

# ── Helper: determine which section a row belongs to ─────────────────────────
# Reads a pipe-delimited row and prints: "new", "progress", or "done"
# Columns: $2=num $3=name $4=specify $5=clarify $6=plan $7=tasks $8=implement $9=uat $10=status
# Uses grep to avoid mawk Unicode issues with ⬜/✅
_classify_row() {
    local _row="$1"
    local _status=$(echo "$_row" | awk -F'|' '{ gsub(/[[:space:]]/, "", $10); print $10 }')
    if echo "$_status" | grep -q 'done'; then
        echo "done"; return
    fi
    # Check if plan ($6), tasks ($7), or implement ($8) contain ✅
    local _plan=$(echo "$_row" | awk -F'|' '{ print $6 }')
    local _tasks=$(echo "$_row" | awk -F'|' '{ print $7 }')
    local _impl=$(echo "$_row" | awk -F'|' '{ print $8 }')
    if echo "$_plan$_tasks$_impl" | grep -q '✅'; then
        echo "progress"; return
    fi
    echo "new"
}

if [ -z "$_col" ]; then
    # ── Insert new row into "New" section ────────────────────────────────────
    _new_row="| ${_feature_num} | ${_feature_name} | ✅ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | planned | |"
    awk -v row="$_new_row" '
        /^## New/ { in_new=1 }
        in_new && /^\|/ { last_table=NR }
        { lines[NR]=$0 }
        END { for(i=1;i<=NR;i++) { print lines[i]; if(i==last_table) print row } }
    ' "$_bl" > "${_bl}.tmp" && mv "${_bl}.tmp" "$_bl"
    _commit_label="add feature ${_feature_num} (${_feature_name}) to backlog"
else
    # ── Update existing row and move to correct section ──────────────────────
    # Step 1: Extract and update the row, remove it from its current position
    _updated_row=""
    awk -v num="$_feature_num_int" -v col="$_col" -v skipcol="$_skip_col" -v newstatus="$_new_status" -F'|' '
        /^\|[[:space:]]*[0-9]/ {
            n = $2; gsub(/[[:space:]]/, "", n); gsub(/^0+/, "", n)
            if (n == num) {
                $col = " ✅ "
                if (skipcol != "" && $skipcol ~ /⬜/) $skipcol = " ⏭️ "
                if (newstatus != "") $10 = " " newstatus " "
                print > "/dev/stderr"
                next
            }
        }
        { print }
    ' OFS='|' "$_bl" > "${_bl}.tmp" 2>"${_bl}.row" && mv "${_bl}.tmp" "$_bl"
    _updated_row=$(cat "${_bl}.row")
    rm -f "${_bl}.row"

    if [ -n "$_updated_row" ]; then
        # Step 2: Determine target section
        _target=$(_classify_row "$_updated_row")

        # Step 3: Insert row into the correct section
        case "$_target" in
            new)      _section_header="## New" ;;
            progress) _section_header="## In Progress" ;;
            done)     _section_header="## Done" ;;
        esac

        awk -v section="$_section_header" -v row="$_updated_row" '
            $0 == section { in_section=1 }
            in_section && /^\|/ { last_table=NR }
            in_section && /^---/ { in_section=0 }
            { lines[NR]=$0 }
            END { for(i=1;i<=NR;i++) { print lines[i]; if(i==last_table) print row } }
        ' "$_bl" > "${_bl}.tmp" && mv "${_bl}.tmp" "$_bl"
    fi

    _step=$(echo "$EVENT_NAME" | sed 's/^after_//')
    _commit_label="mark feature ${_feature_num} ${_step} done in backlog"
fi

sed -i "s/^Last updated:.*/Last updated: $_today/" "$_bl"

git -C "$_tmp_wt" add BACKLOG.md
if git -C "$_tmp_wt" commit -q -m "chore: ${_commit_label}" 2>&1; then
    echo "✓ BACKLOG.md updated on main: ${_commit_label}" >&2
    git -C "$_tmp_wt" push origin main >/dev/null 2>&1 \
        || echo "[specify] Warning: push of BACKLOG.md to main failed" >&2
else
    echo "[specify] Warning: BACKLOG.md commit failed (no change?)" >&2
fi

if [ "$_tmp_wt_created" = "true" ]; then
    git worktree remove "$_tmp_wt" --force >/dev/null 2>&1 || true
    rm -rf "$_tmp_wt" 2>/dev/null || true
fi
