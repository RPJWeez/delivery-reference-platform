#!/usr/bin/env bash
# Add missing immutable assets; reject conflicting bytes rather than overwrite.
set -euo pipefail
tag=${1:?release tag}; shift
if ! gh release view "$tag" >/dev/null 2>&1; then
  gh release create "$tag" --target "$GITHUB_SHA" --title "$tag" --notes 'Immutable artifacts and raw SBOMs. Signed provenance and SBOM attestations are available through gh attestation verify.'
fi
for file in "$@"; do
  name=$(basename "$file")
  existing=$(gh release view "$tag" --json assets --jq ".assets[] | select(.name == \"$name\") | .name")
  if [[ -n "$existing" ]]; then
    directory=$(mktemp -d)
    gh release download "$tag" --pattern "$name" --dir "$directory"
    cmp "$file" "$directory/$name" || { echo "Conflicting immutable release asset: $tag/$name"; exit 1; }
    rm -r "$directory"
  else
    gh release upload "$tag" "$file"
  fi
done
echo "Evidence: $GITHUB_SERVER_URL/$GITHUB_REPOSITORY/releases/tag/$tag"
