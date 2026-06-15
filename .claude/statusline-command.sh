#!/usr/bin/env bash
input=$(cat)

# Git branch — skip optional locks, suppress errors if not in a repo
branch=$(git -C "$(echo "$input" | jq -r '.cwd')" branch --show-current 2>/dev/null)

# 5-hour rate limit window
five_pct=$(echo "$input" | jq -r '.rate_limits.five_hour.used_percentage // empty')
five_reset=$(echo "$input" | jq -r '.rate_limits.five_hour.resets_at // empty')

parts=()

if [ -n "$branch" ]; then
  parts+=("$(printf '\033[0;36m %s\033[0m' "$branch")")
fi

if [ -n "$five_pct" ] && [ -n "$five_reset" ]; then
  now=$(date +%s)
  remaining=$(( five_reset - now ))
  [ "$remaining" -lt 0 ] && remaining=0
  hours=$(( remaining / 3600 ))
  mins=$(( (remaining % 3600) / 60 ))

  if [ "$hours" -gt 0 ]; then
    countdown="${hours}h ${mins}min"
  else
    countdown="${mins}min"
  fi

  pct_int=$(printf '%.0f' "$five_pct")

  if [ "$pct_int" -ge 80 ]; then
    color='\033[0;31m'
  elif [ "$pct_int" -ge 50 ]; then
    color='\033[0;33m'
  else
    color='\033[0;32m'
  fi

  parts+=("$(printf "${color}Claude usage: ${pct_int}%% used, resets in %s\033[0m" "$countdown")")
fi

printf '%s' "$(IFS=' | '; echo "${parts[*]}")"
