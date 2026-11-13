#!/usr/bin/env bash
# Small registry adapter: Maven owns builds/dependencies; Nx owns ordering.
# Existing release coordinates may only be reused when their bytes match.
set -euo pipefail
root="${1:?project root required}"
: "${GITHUB_ACTOR:?}" "${GITHUB_TOKEN:?}" "${GITHUB_REPOSITORY:?}"
read -r group artifact version packaging < <(python3 - "$root/pom.xml" <<'PY'
import sys, xml.etree.ElementTree as ET
p = ET.parse(sys.argv[1]).getroot()
n = {'m': 'http://maven.apache.org/POM/4.0.0'}
def value(path, default=''):
    return p.findtext('m:' + path.replace('/', '/m:'), default, n)
print(value('groupId', value('parent/groupId')), value('artifactId'), value('version'), value('packaging', 'jar'))
PY
)
[[ "$version" != *SNAPSHOT* ]] || { echo 'Release versions cannot be snapshots'; exit 1; }
echo "::group::Build Maven release $group:$artifact:$version"
./mvnw -B -ntp -Ppublished-dependencies -pl "$group:$artifact" -DskipTests package
echo "::endgroup::"
directory=$(mktemp -d)
trap 'rm -rf "$directory"' EXIT
registry=$(./mvnw -q -N -Dstyle.color=never help:evaluate -Dexpression=project.distributionManagement.repository.url -DforceStdout)
echo "Publishing $group:$artifact:$version to $registry"
base="${registry}/${group//.//}/$artifact/$version/$artifact-$version"
status=$(curl --silent --show-error --location --user "$GITHUB_ACTOR:$GITHUB_TOKEN" --output "$directory/pom" --write-out '%{http_code}' "$base.pom")
if [[ "$status" == 200 ]]; then
  cmp "$root/pom.xml" "$directory/pom" || { echo 'Published POM differs: bump the component version'; exit 1; }
  if [[ "$packaging" != pom ]]; then
    curl --fail --silent --show-error --location --user "$GITHUB_ACTOR:$GITHUB_TOKEN" "$base.jar" --output "$directory/artifact.jar"
    cmp "$root/target/$artifact-$version.jar" "$directory/artifact.jar" || { echo 'Published JAR differs: bump the component version'; exit 1; }
  fi
  outcome=reused
  echo "Reusing identical immutable coordinate $group:$artifact:$version"
elif [[ "$status" == 404 ]]; then
  outcome=published
  ./mvnw -B -ntp -Ppublished-dependencies -pl "$group:$artifact" -DskipTests deploy
else
  echo "Registry lookup failed ($status); refusing to publish"
  exit 1
fi

subject="$root/pom.xml"
if [[ "$packaging" != pom ]]; then subject="$root/target/$artifact-$version.jar"; fi
digest="sha256:$(shasum -a 256 "$subject" | cut -d ' ' -f 1)"
project="$group:$artifact"
if [[ "$root" == . ]]; then project=$(node -p 'require("./package.json").name'); fi
node tools/pipeline/report.mjs record "$project" maven "$outcome" "$registry" "$version" "$digest"
