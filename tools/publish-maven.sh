#!/usr/bin/env bash
# Small registry adapter: Maven owns builds/dependencies; Nx owns ordering.
# Existing release coordinates may only be reused when their bytes match.
set -euo pipefail
root="${1:?project root required}"
: "${GITHUB_ACTOR:?}" "${GITHUB_TOKEN:?}"
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
./mvnw -B -ntp -Ppublished-dependencies -pl "$group:$artifact" -DskipTests package
directory=$(mktemp -d)
trap 'rm -rf "$directory"' EXIT
base="https://maven.pkg.github.com/RPJWeez/delivery-reference-platform/${group//.//}/$artifact/$version/$artifact-$version"
status=$(curl --silent --show-error --location --user "$GITHUB_ACTOR:$GITHUB_TOKEN" --output "$directory/pom" --write-out '%{http_code}' "$base.pom")
if [[ "$status" == 200 ]]; then
  cmp "$root/pom.xml" "$directory/pom" || { echo 'Published POM differs: bump the component version'; exit 1; }
  if [[ "$packaging" != pom ]]; then
    curl --fail --silent --show-error --location --user "$GITHUB_ACTOR:$GITHUB_TOKEN" "$base.jar" --output "$directory/artifact.jar"
    cmp "$root/target/$artifact-$version.jar" "$directory/artifact.jar" || { echo 'Published JAR differs: bump the component version'; exit 1; }
  fi
  echo "Reusing identical immutable coordinate $group:$artifact:$version"
elif [[ "$status" == 404 ]]; then
  ./mvnw -B -ntp -Ppublished-dependencies -pl "$group:$artifact" -DskipTests deploy
else
  echo "Registry lookup failed ($status); refusing to publish"
  exit 1
fi
