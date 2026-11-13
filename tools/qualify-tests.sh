#!/usr/bin/env bash
export FIELDSIGNAL_TEST_NAMESPACE=${QUALIFICATION_NAMESPACE:?}
export KAFKA_TEST_BOOTSTRAP=fieldsignal-test-kafka:9092
export STATION_URL=http://127.0.0.1:15173 OPERATIONS_URL=http://127.0.0.1:15174
export INGESTION_URL=http://127.0.0.1:18081 INCIDENT_URL=http://127.0.0.1:18082
set -euo pipefail
npm ci --prefix "${PLATFORM_ROOT:?}"
cd "${PLATFORM_ROOT:?}"
npx playwright install --with-deps chromium
kubectl -n "${QUALIFICATION_NAMESPACE:?}" port-forward service/fieldsignal-station-console 15173:8080 > /tmp/stations.log 2>&1 &
station_pid=$!
kubectl -n "${QUALIFICATION_NAMESPACE:?}" port-forward service/fieldsignal-operator-console 15174:8080 > /tmp/operators.log 2>&1 &
operator_pid=$!
kubectl -n "${QUALIFICATION_NAMESPACE:?}" port-forward service/fieldsignal-ingestion-service 18081:8080 > /tmp/ingestion.log 2>&1 &
ingestion_pid=$!
kubectl -n "${QUALIFICATION_NAMESPACE:?}" port-forward service/fieldsignal-incident-service 18082:8080 > /tmp/incidents.log 2>&1 &
incident_pid=$!
trap 'kill "$station_pid" "$operator_pid" "$ingestion_pid" "$incident_pid" 2>/dev/null || true' EXIT
curl --fail --retry 20 --retry-connrefused --retry-delay 1 http://127.0.0.1:15173/healthz
curl --fail --retry 20 --retry-connrefused --retry-delay 1 http://127.0.0.1:15174/healthz
npm run test:functional
python3 tools/smoke.py
