# Release and promotion protocol

## Desired end-to-end flow

1. A team merges a source PR after required checks. CI computes impact against the PR merge base, including both sides of renames and deleted files. Shared tooling changes select all components.
2. A trusted build publishes selected components, assigns independent versions, attaches signed provenance and SBOM, then records digest-based artifact descriptors. Builds do not deploy.
3. A release proposal selects the **complete** intended state for one release unit. Unchanged components retain their previous digests. A fresh image from another team is not selected automatically.
4. The proposal pins the chart OCI digest, configuration bundle digest, component versions/digests and each component's build commit. The proposal commit can differ from artifact build commits.
5. Admission verifies evidence for every selected artifact, including chart/config/release bundle: signature trust policy, expected builder and ref, matching subjects/materials, SBOM presence, vulnerability/license policy, artifact availability and compatibility. A JSON field claiming evidence exists is never sufficient.
6. Namespace-scoped deploy credentials are acquired with OIDC after environment approval. A lock serializes this unit/environment. Compare the expected previously deployed release digest with a durable deployment ledger before applying; reject stale promotions.
7. Pull the **chart package by digest** and verify it before invoking Helm. Never deploy `charts/application` from the current checkout in a promotion workflow. Download and verify the exact configuration bundle; reject arbitrary values and command-line overrides.
8. Helm 3 applies the complete release with `--atomic --wait --timeout 5m`. Smoke checks and contract checks produce signed deployment evidence. Persist deployed release digest, Helm revision, previous release and result.
9. Promote the same bundle digest through environments using separately pinned environment configuration. Rollback selects the last approved bundle, with migration/event compatibility checks. Never rebuild on rollback.

## Implemented today

`tools/delivery.py` computes transitive build impact, rejects cross-team or partial release selections, requires digest image references and generates deterministic basic Helm values. Unit tests exercise those boundaries. It is an **offline policy prototype**. Configuration digests are syntactically validated but not resolved; evidence is not yet verified; no cluster deployment workflow is installed.

The chart currently renders port-8080 workloads with Spring health endpoints or frontend /healthz probes. Runtime database/Kafka/secret configuration and production frontend gateway routing remain to be implemented before Kubernetes deployment.

## Handling unrelated merged changes

Suppose Team A and Team B both merge. Both sets may build, but A's proposal selects only A's release unit. Its deployment role cannot write B's namespace. A library change rebuilds consumers across teams; each team still decides when to select its new consumer artifact. A platform chart change is published once; teams independently pin the old or new chart digest.

This isolates artifact selection, not business behavior: incompatible API changes can still break consumers. Contract verification, compatibility windows and runtime telemetry address that separate risk.
