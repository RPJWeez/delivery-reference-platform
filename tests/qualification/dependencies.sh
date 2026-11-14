#!/usr/bin/env bash
set -euo pipefail
namespace=${QUALIFICATION_NAMESPACE:?}
kubectl apply -n "$namespace" -f infra/qualification/dependencies.yaml
kubectl wait -n "$namespace" --for=condition=complete job/fieldsignal-test-topics --timeout=240s
kubectl rollout status -n "$namespace" deployment/fieldsignal-test-postgres --timeout=120s
