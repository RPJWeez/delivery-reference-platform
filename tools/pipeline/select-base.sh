#!/usr/bin/env bash
set -euo pipefail
base=${PR_BASE:-}
reason=pr-target
if [[ -z "$base" ]]; then
  reason=last-successful-main-workflow
  base=$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/ci.yml/runs?event=push&branch=main&status=success&per_page=1" --jq '.workflow_runs[0].head_sha // empty')
fi
if [[ -z "$base" ]]; then
  base=$(git hash-object -t tree /dev/null)
  reason=bootstrap-empty-tree
fi
printf '%s %s\n' "$base" "$reason"
