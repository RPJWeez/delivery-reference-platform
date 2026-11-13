#!/usr/bin/env bash
# Run only inside the disposable verification container; mutates its source copy.
set -euo pipefail
npx nx run fieldsignal:java-verify
npx nx run-many -t build typecheck --parallel=2
# Check that persisted task outputs restore after container-local outputs disappear.
rm -rf apps/*/target libraries/*/target apps/*/dist libraries/*/dist
npx nx run fieldsignal:java-verify
npx nx run-many -t build typecheck --parallel=2
for service in ingestion-service incident-service; do test -f "apps/$service/target/$service.jar"; done
for frontend in station-console operator-console; do test -f "apps/$frontend/dist/index.html"; done
# A library-only edit changes both packaged Java consumers without version edits.
node --input-type=module <<'JS'
import fs from 'node:fs';
const java='libraries/measurements/src/main/java/io/fieldsignal/measurements/RiverLevel.java';
fs.writeFileSync(java,fs.readFileSync(java,'utf8').replace('private RiverLevel()', 'public static final String CACHE_PROOF = "checkout-library-proof";\n    private RiverLevel()'));
const ui='libraries/ui/src/index.tsx';
fs.writeFileSync(ui,fs.readFileSync(ui,'utf8').replace('Cedar Creek','Cedar Cache Proof'));
JS
npx nx run fieldsignal:java-verify
npx nx affected --files=libraries/ui/src/index.tsx -t build typecheck --parallel=2
for service in ingestion-service incident-service; do
  unzip -p "apps/$service/target/$service.jar" BOOT-INF/lib/measurements-0.0.0-SNAPSHOT.jar > "/tmp/$service-measurements.jar"
  unzip -p "/tmp/$service-measurements.jar" io/fieldsignal/measurements/RiverLevel.class | grep -aq checkout-library-proof
done
for frontend in station-console operator-console; do grep -l 'Cedar Cache Proof' apps/"$frontend"/dist/assets/*.js; done
# Native Maven rejects internal pin/version drift before reaching compilation.
sed -i 's/<version>${project.version}<\/version>/<version>9.9.9<\/version>/' apps/ingestion-service/pom.xml
if npx nx run fieldsignal:java-verify > /tmp/drift.log 2>&1; then
  echo 'ERROR: internal Maven pin drift was accepted' >&2; exit 1
fi
grep -qi 'convergence\|reactor\|9.9.9' /tmp/drift.log
printf 'PASS: cold build, output restoration, library invalidation, private-pin rejection\n'
