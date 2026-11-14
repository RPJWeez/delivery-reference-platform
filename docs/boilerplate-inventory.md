# Delivery boilerplate inventory and reduction plan

Review date: 2026-11-14. Source checkout: `2bb4222`.

## Assessment

The earlier simplification has not been reversed: private Maven/npm modules still
build from checkout, the custom component catalog/impact engine is gone, and internal
package publication is gone. But the repository now also implements a delivery
platform: evidence distribution, candidate assembly, workflow-result collection,
human reporting, disposable QA orchestration, and runtime observation. That is the
main source of custom boilerplate and maintenance cost.

The problem is responsibility and duplication, more than the number of tools.
Replacing Nx or Helm alone would leave most of this code intact. Moving all of it
into a shared repository would reduce per-app copies but would not reduce total
platform complexity. First delete obsolete behavior and choose clear authorities;
then share the remaining stable behavior.

This is a source inspection and local Git-history review. The companion deployment
repository, live workflows, registries, and protection settings were not inspected.
References to its behavior in existing documents are contracts or recorded historical
observations, not newly verified execution. No delivery behavior was changed.

## Scale and history

These are physical lines, including comments and whitespace, not complexity scores:

| Surface                                                | Lines at reviewed commit |
| ------------------------------------------------------ | -----------------------: |
| `.github/workflows/ci.yml`                             |                      486 |
| Three composite actions: setup, publish-chart, qualify |                      345 |
| `tools/pipeline/*` including configuration             |                    1,064 |
| Qualification shell hooks and verification tooling     |                       79 |
| Four delivery/workspace regression test files          |                    1,313 |

The first three rows alone total **1,895 lines of workflow/platform implementation**.
They exclude Dockerfiles, Compose, Helm, application tests, fixtures, and docs.
`report.mjs` is 647 lines, larger than the CI workflow. Its test file is 877 lines,
although that file also covers other pipeline behavior.

History explains the apparent return:

- `ded8c86` removed `catalog/components.json`, `tools/ci_impact.py`, and
  `tools/delivery.py`, replacing bespoke build inventory/selection with native tools.
- `df5067d` added portable execution/evidence reporting.
- `8d1e429` removed Java evidence publication, Maven publishing, npm scope helpers,
  and the Python development launcher. It also introduced candidate binding, runtime
  observation, full-source Docker builds, Compose, verification tooling, schemas,
  and second-app fixtures. That commit changed 73 files: 2,000 insertions and 852 deletions.
- Subsequent fixes added skipped-job handling, large metadata transfer, Helm schema
  compatibility, and package links. These fixes expose the ongoing cost of owning
  the integration layer; they should survive as platform regression cases.

This is expansion into delivery orchestration, with some obsolete release behavior
still present inside the new path, rather than a return to private-library releases.

## Inventory: custom orchestration and publishing

Paths below are relative to the repository root. “Share” means maintain and test once
as platform code; it does not mean hide an unchanged copy behind an action.

| Files                                      | Purpose and current cost                                                                                                                                                                                                                                                                                                 | Recommended disposition                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/workflows/ci.yml`                 | Nine jobs: plan, validation matrix, PR container proof, required validation gate, image build/push, per-image evidence, candidate packaging, reporting. Contains substantial inline Bash/JS, cache overlays, registry naming, metadata transport, evidence checks, versioning, and artifact aggregation.                 | Keep a thin app caller plus explicit required-check/permission boundaries. Share the stable implementation through versioned reusable workflows. Keep publication success distinct from validation success.                                                                                                                        |
| `.github/actions/setup/action.yml`         | Installs both ecosystems, npm dependencies, download caches, and Nx cache. Matrix-specific producer scopes prevent cache races. Even planning and candidate packaging get a full Java/npm setup.                                                                                                                         | Split lightweight planning/packaging setup from build setup only where useful. Share setup and cache behavior; preserve producer isolation.                                                                                                                                                                                        |
| `tools/pipeline/config.json`, `config.mjs` | Converts five string settings to GitHub outputs. Only Java/Node outputs are consumed; npm registry, chart registry path, and image platform settings are currently unused. CI has additional redundant config-loading steps.                                                                                             | Remove unused settings and redundant loads. Keep a small toolchain authority; do not turn this into an application catalog.                                                                                                                                                                                                        |
| `tools/pipeline/select-base.sh`            | Chooses PR base, otherwise last successful main workflow, otherwise empty tree. Originates in publication recovery selection. Today publication always builds all images; only validation is selective. Reporting failures can influence the next baseline because it uses whole-workflow success.                       | Use PR base for PR validation; benchmark full cached main validation. Remove history lookup if main validates fully. If retained, select a validation baseline explicitly and preserve coverage of earlier failed changes.                                                                                                         |
| `tools/pipeline/plan.mjs`                  | Reads the Nx graph, changed paths, shared-input globs, and selection outputs to explain dependency chains in a custom plan record. Does not schedule builds, but duplicates graph interpretation for diagnostics. Still has `libraries`/`npm` publication categories.                                                    | Delete obsolete categories. Prefer native selection/graph output plus a short selected-project list. Remove dependency-chain reconstruction unless it proves useful in real failure triage.                                                                                                                                        |
| `tools/pipeline/context.mjs`               | Small identity helper records repository, run, attempt, SHA, event for result isolation.                                                                                                                                                                                                                                 | Keep run identity semantics in the shared delivery implementation. It prevents stale results becoming current claims.                                                                                                                                                                                                              |
| `tools/pipeline/candidate.mjs`             | Binds Bake metadata to Helm image placeholders; validates complete output inventory, digest/material identities, build identity, and rendered image closure. Produces generated values and build evidence.                                                                                                               | Retain as a bounded shared adapter with a versioned input/output contract. This is useful custom policy at a native-tool boundary. Do not grow it into a scheduler or dependency engine.                                                                                                                                           |
| `.github/actions/publish-chart/action.yml` | 132 lines: package, query GitHub package versions, compare existing tar content, push/reuse, pull to resolve digest, extract for SBOM, attest archive, sign OCI, retain Releases, and report. Includes Bash and embedded Python. Assumes GHCR and a `users/...` package API route.                                       | Separate candidate packaging from historical package-release semantics. Candidate versions already include run/attempt; test the actual retry contract, then remove unnecessary version discovery/content comparison. Share remaining OCI publication/evidence. Organization ownership needs explicit portability coverage.        |
| `tools/pipeline/retain-release.sh`         | Repairs missing Release assets and rejects conflicting immutable bytes. Called for each image SBOM and chart/archive SBOM, creating a second distribution surface alongside OCI.                                                                                                                                         | Choose a durable evidence authority. Prefer digest-bound registry evidence if its retention meets requirements. Keep Releases only for an explicit archive/export need; preserve existing historical assets.                                                                                                                       |
| `image-evidence` job in CI                 | Scans images again with Syft, emits GitHub provenance/SBOM attestations, Cosign signatures, and per-image Releases. Bake already emits BuildKit provenance and SBOM.                                                                                                                                                     | Document which verifier consumes each format. Choose one accepted signing/attestation path per required claim, and remove duplicate scans/distribution only after consumer migration. Build-material provenance and trusted workflow identity are different claims; do not discard one merely because both are called provenance.  |
| `tools/pipeline/report.mjs`                | Collects result files, checks identity, merges job outcomes, queries Releases, filters artifact attempts, constructs package/download links, renders human and JSON reports. Retains Maven/npm publication and Maven-evidence behavior. CI uploads report inputs and renders the summary twice to link its own artifact. | Delete retired package categories first. Replace the reporting subsystem with a short summary: validation, publication/evidence completion, immutable handoff, QA pending, direct run/evidence links. Use GitHub's native logs/artifact browser for detailed inventories. Reporting must not become the authority for eligibility. |
| `report` job and repeated result uploads   | Upload/download result records and make several GitHub API calls to reconstruct the run's checks, artifacts, attempts, and Release links.                                                                                                                                                                                | Eliminate record fan-out where job outputs/native statuses suffice. Preserve honest partial-publication diagnostics and exact attempt identity; skip exhaustive link catalogs and self-link rerendering.                                                                                                                           |

## Inventory: build and runtime declarations

| Files                                                                            | Purpose and duplication                                                                                                                                                                                                             | Recommended disposition                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root `package.json`, `nx.json`, `project.json`                                   | npm entry points, Nx graph/affected/cache configuration, one cached native Maven reactor command. Shared globals conservatively invalidate many tasks.                                                                              | Keep native Maven/npm and a thin Nx layer initially. Measure warm/cold cost before changing selection or removing Nx. Narrow overly broad inputs only with invalidation proofs.                                                                                                                                |
| App/service/library/contract `project.json`; frontend `package.json` Nx sections | Names/tags, explicit contract edges, and container commands. Four container targets repeat Dockerfile paths and local tags already in Bake/Compose.                                                                                 | Remove redundant Nx container targets after caller search/migration. Keep real dependency edges where native inference cannot see API/event contracts. Empty metadata files can remain if needed for graph identity.                                                                                           |
| Root/module `pom.xml`, `.mvn/wrapper/*`, `mvnw`, `mvnw.cmd`                      | Maven reactor, Spring dependency/build configuration, private module version convention, convergence enforcement, standard Maven wrapper. Service POMs are nearly identical.                                                        | Keep standard manifests/wrappers; they are not a custom release framework. Centralize shared dependency versions/plugin defaults in the parent. Avoid forcing distinct service dependencies into a universal parent.                                                                                           |
| App/library `package.json`, lockfile, TS/Vite configs, `.npmrc`                  | Native workspace dependencies and compilation. Dockerfiles explicitly build the UI dependency again; package metadata retains old publishing-era repository/files fields.                                                           | Keep native manifests and lockfile; remove obsolete publishing metadata when safe. Standardize shared TS/Vite defaults only if it removes meaningful repetition. Private libraries must remain source/workspace dependencies.                                                                                  |
| Four `apps/*/Dockerfile`                                                         | Two near-identical Java recipes and two near-identical frontend recipes. Each copies the whole repository; Java uses image Maven while local validation uses wrapper Maven. Frontend recipes name the shared UI package explicitly. | Trial one parameterized Java recipe and one web recipe with native build args. Keep app-specific runtime extensions possible. Align Maven versions or use the wrapper. Improve context/layer caching after correctness; do not create custom dependency copying/graph code.                                    |
| `docker-bake.hcl`                                                                | Authoritative complete publishable image set; repeats four context/Dockerfile/tag blocks.                                                                                                                                           | Keep Bake as build authority. Use HCL inheritance for repeated defaults. Evaluate Compose-derived Bake targets for build paths, retaining an explicit release group and proving metadata compatibility before changing authority.                                                                              |
| `compose.yaml`                                                                   | Local four-service topology, build definitions, ports/env/dependencies, verification service. Repeats image/build paths from Bake, but local ports/dependency wiring are legitimate environment details.                            | Keep Compose as local runtime authority. Reduce repeated build paths where native integration works; do not generate all local topology from a new platform manifest.                                                                                                                                          |
| `infra/local/compose.yaml`, `init.sql`                                           | Local PostgreSQL/Kafka, health checks, data/roles, topics, persistence. Kafka setup is repeated for Kubernetes qualification.                                                                                                       | Keep app fixture declarations. Share dependency image versions/topic definitions where practical, with separate environment wiring. This is application data setup, not generic release machinery.                                                                                                             |
| `tools/verification/Dockerfile`, `.dockerignore`, `cache-proof.sh`               | Reproducible local verification toolchain and destructive cache/invalidation checks in a disposable copy. Tool versions repeat CI/Docker pins; some proof assertions name specific files, jars, apps.                               | Keep one supported container verification path. Move reusable cache proofs into platform acceptance tests; keep app assertions as app tests. Ensure local verify and required CI agree on checks: currently local verify does not run CI's explicit Helm-lint loop or functional tests. Document those scopes. |
| `Makefile`, package scripts                                                      | Developer entry points and native shortcuts; aliases span Make, npm, Nx, Docker.                                                                                                                                                    | Keep `make dev`, `make verify`, `make stop`; document native debugging separately. Remove aliases only if unused. A small convenience Makefile is helpful, not the main problem.                                                                                                                               |
| `charts/application/*`                                                           | Shared Deployment/Service Helm template, schema, defaults, CI sample values, Nx lint/package targets. Template is 92 lines; schema is 83.                                                                                           | Keep Helm-native declarations. If genuinely shared, distribute and version once; candidate should vendor it. Current template only implements HTTP Deployments/Services: do not claim generic worker/Job/CronJob support from other fixture charts.                                                            |
| `charts/fieldsignal/*`                                                           | App wrapper, local dependency lock, workload defaults and build placeholders, Nx candidate marker, packaged environment schema. Build group names and workload names must agree.                                                    | Keep application runtime values and environment policy. Make chart root an explicit single adoption setting instead of discovering it through Nx and still hard-coding `application-candidate` elsewhere. Retain narrow generated digest binding.                                                              |
| `infra/frontend/*`                                                               | Shared nginx behavior for routing, runtime upstream selection, static content and health.                                                                                                                                           | Keep small shared runtime assets. They encode actual frontend needs.                                                                                                                                                                                                                                           |
| Root/per-tool/chart ignore files                                                 | Exclude host outputs, caches, and metadata from build/package contexts. Several patterns overlap but apply to different native tools.                                                                                               | Keep purposeful exclusions; verify packaged outputs. Do not merge files with different semantics merely to reduce count.                                                                                                                                                                                       |

## Inventory: QA, tests, governance, and documentation

| Files                                                                                                     | Purpose and current cost                                                                                                                                                                                                                                                                                                                                                         | Recommended disposition                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.github/actions/qualify/action.yml`                                                                      | 182-line exported action: verifies test checkout, creates kind, installs Argo, applies companion bootstrap/environment paths, reconciles candidate/config, observes before/after tests, emits evidence, collects diagnostics, destroys cluster. Not invoked by this repository's CI. Its API is generic but its body assumes companion directory structure and two Argo sources. | Move reusable QA mechanics to the delivery platform; deployment workflow should own its Argo layout. Keep an explicit app test/fixture hook. Pin source and harness versions. Preserve cleanup and separate certification authority.         |
| `tools/pipeline/observe-qa.mjs`                                                                           | 116-line Argo/pod readiness and image-set checker; records observed identity. Assumes two positional Argo sources and running pods for all expected images.                                                                                                                                                                                                                      | Share with QA harness. Declare HTTP Deployment scope; completed Jobs and scheduled CronJobs need different observations. Do not broaden the application template until an adopter needs and tests an extension.                              |
| `tools/qualify-dependencies.sh`, `infra/qualification/dependencies.yaml`                                  | App-owned PostgreSQL/Kafka/topic fixtures in kind. 121 lines of dependency YAML.                                                                                                                                                                                                                                                                                                 | Keep app-owned fixture data; reuse maintained dependency setup where practical. These are legitimate test dependencies.                                                                                                                      |
| `tools/qualify-tests.sh`                                                                                  | App service names, four port forwards, readiness polling, Playwright install/run, smoke test.                                                                                                                                                                                                                                                                                    | Keep business test selection/app endpoint mapping. Move generic forwarding/wait/cleanup utilities into the harness only when repetition justifies it.                                                                                        |
| `tools/smoke.py`, `tools/simulate.py`, `tests/functional/*`, `playwright.config.ts`                       | Domain behavior: readings, incidents, Kafka replay, deduplication/conflicts, acknowledgment, UI. Simulator supplies demo data.                                                                                                                                                                                                                                                   | Keep as application code/tests; do not count domain assertions as removable delivery boilerplate.                                                                                                                                            |
| `tests/pipeline.test.mjs`                                                                                 | 877 lines covering reports, release retention, selection, workflow gates, metadata transport, portability and integration regressions. Some assertions inspect workflow text.                                                                                                                                                                                                    | Move platform cases with implementation. Retain meaningful negative/behavioral cases. Delete obsolete package/report tests with obsolete features; replace brittle textual wiring checks where executable integration coverage is practical. |
| `tests/candidate.test.mjs`, `tests/observed.test.mjs`                                                     | Completeness, identity, schema/rendered closure, observation failure cases.                                                                                                                                                                                                                                                                                                      | Keep and share with corresponding adapters. These protect the delivery contract.                                                                                                                                                             |
| `tests/workspace.test.mjs`                                                                                | 173 lines mixing app graph/contract propagation, chart rendering and generic publication checks.                                                                                                                                                                                                                                                                                 | Keep app graph checks with app. Move platform checks with platform. Remove obsolete names such as “affected publication” when selection now means validation.                                                                                |
| `tests/fixtures/portable-app`, `tide-app`, `tide-web`                                                     | Synthetic graph portability plus actual Python API/worker and static web build/chart fixtures.                                                                                                                                                                                                                                                                                   | Keep actual build fixtures in platform acceptance suite; retire graph-only fixture if redundant. Existing fixtures are not proof of complete protected QA/certification portability.                                                         |
| `.github/CODEOWNERS`, `dependabot.yml`                                                                    | Ownership and scheduled dependency updates. Single catch-all reviewer, not demonstrated multi-person governance. Dependabot config covers Actions/Maven/npm, not Docker bases.                                                                                                                                                                                                   | Keep. Assign real platform ownership on extraction and plan updates for pinned container/toolchain inputs.                                                                                                                                   |
| `README.md`, `docs/local-development.md`                                                                  | Contributor entry point and native workflows.                                                                                                                                                                                                                                                                                                                                    | One concise contributor guide, three primary commands, clear verification scope. Link advanced material instead of repeating it.                                                                                                             |
| `docs/pipeline.md`, `publishing.md`, `release-protocol.md`, `operator-runbook.md`, `architecture.md`, ADR | Explain overlapping lifecycle/trust/ownership/recovery rules. ADR still says components publish independently.                                                                                                                                                                                                                                                                   | One normative delivery contract, one contributor guide, one operator runbook; other pages link to these or become historical decisions. Update stale ADR language.                                                                           |
| Golden-path plan/checkpoint, `PROGRESS.md`, roadmap/domain docs                                           | Design history, executed checks, pending external gates, application context. README/release protocol still describe publication as pending while later checkpoint entries record a successful candidate.                                                                                                                                                                        | Archive dated plans/checkpoints as historical evidence; maintain a short current capability table with evidence/date. Do not present historical gates as current status. Keep domain docs separate from delivery instructions.               |

Standard lockfiles, wrappers, OpenAPI/event schemas, source tests, migrations, and
ordinary app configuration are not the primary removal targets. Their presence is
normal for this polyglot application.

## Proposed ownership and developer contract

An application should own its Maven/npm dependency graph, image recipes/Bake release
group, Helm runtime declarations, Compose development topology, contracts, and business
tests. Distinct build/local/cluster declarations are legitimate; their cross-links should
be few and explicit. Do not recreate a universal component catalog to generate them all.

The delivery platform should own the reusable CI workflow, OCI evidence publication,
bounded candidate binder, QA harness, and their acceptance tests. Deployment owners
should own environment configuration, certification authority/policy, promotion and
runtime health integration. Those are separate responsibilities, not necessarily separate
human approvals for every change.

The app caller should specify only an immutable platform version, the existing Bake
group/chart location, and app verification/qualification hooks where convention is
insufficient. It should contain no service matrix, evidence-format selection, registry
pagination, report collection, or private-library release procedure. Keep caller token
permissions explicit. Extracting/signing from reusable workflows can change accepted
workflow identity: migrate verifier trust deliberately, never broaden it by accident.

For developers: change code/tests, run `make verify`, open a PR. For a new service:
add source/native dependencies, an image target, local/runtime declarations, ownership
and tests. No CI algorithm edits, new publisher scripts, internal version bumps, adopter
pins, or hand-selected image digests. Service additions still need native declarations;
zero configuration is not the objective.

## Ordered reduction plan

### 1. Delete obsolete behavior and align the docs

Remove retired Maven/npm reporting categories and associated fixtures/tests; remove
unused pipeline config outputs/loads; retire redundant Nx container commands after
checking callers; correct stale publication/ADR status. Reduce the summary to actual
checks, candidate/evidence outcome, exact digest and a few native links. Keep fragment
diagnostics, run-attempt isolation, and explicit summary writes.

Acceptance: no normal code PR needs release metadata; failed evidence cannot look like
a complete candidate; PR cannot claim publication; stale attempt data stays excluded.
No private package publishing or historical artifact deletion is introduced.

### 2. Simplify publication and evidence

Inventory actual consumers of BuildKit, GitHub attestations, Cosign and Release assets
across source and companion before selecting the minimum supported evidence set.
Remove duplicate scans/archives and historical version-discovery logic only after
consumer/trust migration. Candidate run/attempt identity stays unique; make retries and
partial failures explicit instead of inheriting a general package-release protocol.

Acceptance: publish/pull/verify one candidate end to end; reject missing/extra/wrong-source
images and failed evidence; recover from partial publication without overwriting bytes;
verify a retained rollback candidate. Old artifacts remain available.

### 3. Reduce declarations and build setup

Trial shared Java/web Dockerfiles and Bake inheritance. Compare current/full cached
validation against affected validation, including setup cost, before removing baseline
selection. Keep Nx unless measurements justify removal. Align local/CI checks, toolchain
versions and documentation. Keep business tests as an explicit additional runtime check
if they are outside default source verification.

Acceptance: cold clone works; library changes reach every consumer; cache deletion and
restoration are safe; build images consume checkout sources; measured runtime/cost does
not regress beyond an agreed budget. A service addition touches native declarations,
not workflow code. Do not trade four short Dockerfiles for a large build framework.

### 4. Extract the remaining platform once

After deletion, move shared workflows/actions, binder, QA observer and generic regressions
to one owned/versioned platform package or repository. Keep app fixtures/hooks here.
Use a thin pinned reusable workflow caller, documented upgrade procedure, and an explicit
supported profile. Avoid configurable combinations for hypothetical adopters.

Acceptance: FieldSignal and a second app use the same released platform version with
different names/topologies and no forked pipeline implementation. Exercise actual OCI
handoff, QA and certification trust, not only fixture builds. Preserve required check
names or migrate repository rules intentionally.

### 5. Prove the developer experience and operation

Have a developer unfamiliar with the platform make a private-library change, add a service,
diagnose a failed build, and promote/recover an approved candidate using the appropriate
guide. Complete the separate production health/serialization and recovery gates rather
than treating extraction as proof of deployment readiness.

Acceptance: contributor guide fits one page; an ordinary PR changes no delivery scripts;
app onboarding requires no platform implementation edits; platform upgrades are one
reviewable version change plus any declared contract migration. Record time to first
verified change, files touched per new service, CI setup/build duration, and failures
requiring platform expertise. Aim for an app CI caller under roughly 60 lines, as a
design budget rather than proof that complexity disappeared.

## Recommendation

Start with phases 1 and 2. Reporting, duplicated evidence distribution, and inherited
package-release behavior are the clearest reduction opportunities. Keep the useful
native build and runtime authorities and the small completeness adapter. Extract only
after those deletions, so this application becomes a consumer of a deliberately small
delivery pattern rather than the place every adopter copies a delivery framework from.
