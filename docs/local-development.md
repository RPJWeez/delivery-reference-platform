# Contributor guide

Install Git and a supported Docker Desktop/Compose v2 toolchain. Make is optional.

| Task                                 | Convenience   | Native equivalent                        |
| ------------------------------------ | ------------- | ---------------------------------------- |
| Start local application and fixtures | `make dev`    | `docker compose up --build -d`           |
| Verify source/tests                  | `make verify` | `docker compose run --build --rm verify` |
| Stop local processes, retain data    | `make stop`   | `docker compose stop`                    |

Local container verification uses the shared pipeline toolchain at the exact Compose pin.
The same `npm run verify` hook runs in CI; app repositories carry no pipeline scripts.
It covers source/build/type/chart checks; runtime business tests remain separate.

Station console: http://127.0.0.1:5173; operator console: http://127.0.0.1:5174.
APIs: ports 8081/8082. PostgreSQL: 55432; Kafka: 9092. Fixtures and credentials
are local synthetic data. Volumes persist when services stop. Removing volumes is a
separate deliberate reset; do not use a destructive reset as the normal stop command.
After source changes, rerun `docker compose up --build -d`. Compose builds source,
including private libraries; it never needs published application-private packages.

With Java 21, Node 22.22.0 and Helm 3.18.4 installed, IDE/native loops remain available:
`npm ci`, `npm run verify`, `./mvnw verify`, `npx nx run fieldsignal:java-verify`,
`npx nx affected -t build typecheck`, and `npm run test:workspace`.
The Maven wrapper's pinned ZIP requires unzip; slim containers use the pinned Maven
builder directly. `make smoke` requires the running local APIs/Kafka; Playwright tests
also require Chromium (`npx playwright install chromium`). These are business tests,
not certification of a subsequently built registry candidate.

Change a private library and its callers together. Java modules inherit the fixed reactor
version and use `${project.version}`; Maven Enforcer rejects reactor pin drift. npm
libraries are private and consumers use workspace-compatible `*` declarations. Do not
publish them, bump release versions or install nested registry copies. External dependency
updates still belong in native manifests/locks. Declare non-imported API/event coupling
through Nx implicitDependencies.

Add deployables with native Docker/Bake, Helm runtime, ownership and application test
changes. Do not add workflow service matrices. Change environment settings in the
companion deployment repository. Release selection is a candidate/configuration pair,
not a manually assembled set of service images.
