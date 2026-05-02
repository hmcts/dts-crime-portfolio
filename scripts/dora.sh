#!/usr/bin/env bash
# DORA metrics snapshot for dts-crime-portfolio.
#
# Prints the four metrics for the configurable SINCE window, using
# `gh` (GitHub Actions, PR list) and `git log` only. No external services.
#
# Usage:
#   ./scripts/dora.sh                # default: last 24 hours
#   SINCE=2026-05-01 ./scripts/dora.sh
#
# See docs/dora-metrics.md for definitions, gaps, and the cadence
# (one snapshot per retrospective).

set -euo pipefail

SINCE="${SINCE:-1 day ago}"
SINCE_ISO=$(date -u -j -f '%Y-%m-%d' "$SINCE" '+%Y-%m-%dT%H:%M:%SZ' 2>/dev/null || date -u -v-1d '+%Y-%m-%dT%H:%M:%SZ')
REPO="hmcts/dts-crime-portfolio"

if ! command -v gh >/dev/null 2>&1; then
  echo "error: gh CLI is required. Install via brew install gh." >&2
  exit 2
fi

echo "DORA snapshot — repo: ${REPO}"
echo "Window: ${SINCE_ISO} → now"
echo ""

#######################################
# 1. Deployment frequency
#######################################
deploy_total=$(gh run list \
  --repo "$REPO" \
  --workflow deploy.yml \
  --branch main \
  --created ">=${SINCE_ISO}" \
  --limit 200 \
  --json conclusion --jq 'length')

deploy_success=$(gh run list \
  --repo "$REPO" \
  --workflow deploy.yml \
  --branch main \
  --created ">=${SINCE_ISO}" \
  --limit 200 \
  --json conclusion --jq '[.[] | select(.conclusion == "success")] | length')

deploy_failure=$(gh run list \
  --repo "$REPO" \
  --workflow deploy.yml \
  --branch main \
  --created ">=${SINCE_ISO}" \
  --limit 200 \
  --json conclusion --jq '[.[] | select(.conclusion == "failure")] | length')

echo "1. Deployment frequency"
echo "   ${deploy_total} deploy runs, ${deploy_success} success, ${deploy_failure} failure (workflow-level)"
echo ""

#######################################
# 2. Lead time for changes
#######################################
echo "2. Lead time for changes (PR open → merged)"
gh pr list \
  --repo "$REPO" \
  --state merged \
  --limit 200 \
  --json number,title,createdAt,mergedAt \
  --jq "[.[] | select(.mergedAt >= \"${SINCE_ISO}\")] | sort_by(.mergedAt) | .[] | \"   #\(.number) \(.title[0:60]) — \(.createdAt) → \(.mergedAt)\"" 2>/dev/null \
  || echo "   (no merged PRs in window)"

# Median lead time in minutes — pipe durations through sort -n then compute.
durations=$(gh pr list \
  --repo "$REPO" \
  --state merged \
  --limit 200 \
  --json createdAt,mergedAt \
  --jq "[.[] | select(.mergedAt >= \"${SINCE_ISO}\")] | .[] | [.createdAt, .mergedAt] | @tsv" 2>/dev/null \
  | while IFS=$'\t' read -r created merged; do
      c=$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$created" '+%s' 2>/dev/null || echo 0)
      m=$(date -u -j -f '%Y-%m-%dT%H:%M:%SZ' "$merged" '+%s' 2>/dev/null || echo 0)
      if [ "$c" -gt 0 ] && [ "$m" -gt 0 ]; then
        echo "scale=1; ($m - $c) / 60" | bc
      fi
    done | sort -n)

if [ -n "$durations" ]; then
  count=$(echo "$durations" | wc -l | tr -d ' ')
  mean=$(echo "$durations" | awk '{ s += $1 } END { if (NR > 0) printf "%.1f", s/NR }')
  if [ "$count" -gt 0 ]; then
    mid_index=$(( (count + 1) / 2 ))
    median=$(echo "$durations" | awk -v i="$mid_index" 'NR == i { print $1 }')
    echo "   median lead time: ${median} minutes (${count} PRs)"
    echo "   mean lead time:   ${mean} minutes"
  fi
else
  echo "   no merged PRs in window"
fi
echo ""

#######################################
# 3. Change failure rate
#######################################
echo "3. Change failure rate"
if [ "$deploy_total" -gt 0 ]; then
  cfr_pct=$(awk "BEGIN { printf \"%.1f\", ($deploy_failure / $deploy_total) * 100 }")
  echo "   workflow-level: ${deploy_failure} / ${deploy_total} deploy runs = ${cfr_pct}%"
else
  echo "   no deploy runs in window"
fi
echo "   note: workflow-level failures over-count cosmetic-CI bugs (e.g. PR #80)."
echo "         True CFR requires counting fix-forward PRs against an incident tracker."
echo ""

#######################################
# 4. MTTR
#######################################
echo "4. Mean time to restore"
echo "   not computable from current data sources — see docs/dora-metrics.md → Gaps."
echo "   approximation requires (a) incident-start timestamps and (b) the deploy time"
echo "   of the fix-forward. No incident tracker today."
echo ""

echo "Done. See docs/dora-metrics.md for definitions, performance bands, and cadence."
