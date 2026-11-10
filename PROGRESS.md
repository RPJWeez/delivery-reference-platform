# Progress

## Current state

FieldSignal is the selected application. The initial implementation is published as commit `16b3eccb8867c127c6c6ae115d93b0f9da9d6546`. Git is on `main`, tracking `origin/main` via `git@github.com:RPJWeez/delivery-reference-platform.git`. No cloud resources have been provisioned.

## Implemented

- Architecture, release protocol, ADR and phased acceptance roadmap.
- Two Spring Boot services: reading ingestion/outbox and incident processing/acknowledgment.
- Two React/TypeScript consoles plus a reusable UI package.
- Shared Java measurement and event-model libraries, API and event contracts.
- Separate PostgreSQL users/databases, migrations, Kafka topics/DLT, Python simulator.
- Dependency impact analysis, complete team release selections and reusable Helm chart.
- Read-only selective CI, pinned Actions, real PostgreSQL/Kafka integration smoke job and stable `ci` gate.

## Verification evidence

- 17 Python delivery-policy tests passed.
- 10 Java tests passed: threshold boundaries, input rejection, transaction rollback, idempotency, conflict rejection, acknowledgment/replay and malformed envelope handling.
- Java packaging passed; both React production builds and TypeScript checks passed.
- Helm 3.18.4 lint and rendering passed for backend/frontend workloads.
- Live HTTP → PostgreSQL/outbox → Kafka → incident projection smoke passed, including acknowledgment and conflicting-ID rejection.
- Browser verification submitted a 4.8 m observation, observed the critical incident, acknowledged it, and confirmed the saved state.
- Live Kafka replay passed: the consumer drained the replayed record and preserved exactly one acknowledged incident.

Commands: `make verify`, `make test-java`, `npm run build`, `npm run typecheck`, `make smoke`.

The [initial GitHub CI run](https://github.com/RPJWeez/delivery-reference-platform/actions/runs/42892772306) passed all seven jobs: impact, policy, both Java service builds, web, real PostgreSQL/Kafka integration and the aggregate `ci` check.

Initial local toolchain: Temurin 21.0.13+9, Maven 3.9.16, Node 22.17.0, npm 10.9.2, Helm 3.18.4, Docker 28.3.0. Java/Maven were downloaded into `/tmp/fieldsignal-toolchain` and verified against vendor SHA-256/SHA-512 metadata; they are not installed system-wide. The Maven dependency cache is `/tmp/fieldsignal-m2`. PostgreSQL 17.7 and Kafka 4.1.1 run through the local Compose stack. Ports: 55432, 9092, APIs 8081/8082, frontends 5173/5174.

## Remaining work

- Configure branch protections/owner approval around the verified `ci` check.
- Publish independently versioned libraries, frontend packages/images, services, chart, schemas, proxy/configuration and release bundles.
- Attach and verify signatures, provenance and SBOM for all promoted artifact types.
- Add registry trust policy, vulnerability/contract checks, namespace roles and digest-only Kubernetes promotion with failure/rollback evidence.
- Implement Apigee routing/authentication, runtime secret references and cloud OIDC after target selection.
- Extend the app with device registry, correlated rules, scheduled aggregation, field work and notification adapter when their demonstration scenarios are defined.

The local reactor uses snapshot libraries; local artifacts are unsigned. The chart's runtime configuration and gateway routing are not yet sufficient for deploying the application. See `docs/roadmap.md` for acceptance criteria. No production-readiness or SLSA-level claim is made.
