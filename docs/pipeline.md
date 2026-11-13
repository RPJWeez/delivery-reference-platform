# Pipeline operation

PRs validate merge commits. Protected main publishes complete immutable candidates;
source CI never deploys, QA-tests or certifies an application.

## Reports and failure states

The Run report distinguishes checks, affected validation and actual publication records.
PR reports explicitly disable publication and reject stray publication records. Published
fragments are reported even when subsequent evidence fails. Missing completion records
remain unconfirmed/not attempted; selection alone never establishes publication.
Candidate handoff is recorded only after image evidence, chart publication and candidate
attestations succeed. A published chart with incomplete evidence is not a complete
handoff. QA, certification, promotion and observed health are separate states.

Records belong to repository/run/attempt/source/event. Stale/malformed records are
ignored with diagnostics. `report.mjs summary --github-summary` is the only summary
write route; the explicit flag remains mandatory. Tests isolate inherited GitHub/Nx
context and use temporary output/summary files. Keep the summary-leak regression tests.
Run artifacts include the machine report, Markdown, native build metadata, handoff and
individual results. Failure diagnostics have bounded retention; durable evidence remains
with registry signatures/attestations and retained Release assets.

## Build, selection and caches

Nx retains affected Java/frontend/contract selection. Selected Java work invokes one
cached native Maven reactor task; npm build/typecheck targets remain affected. The full
native reference and container build proofs exercise the same private checkout sources.
Dockerfiles exclude host outputs and use pinned Maven/Node/runtime bases. Bake owns
the complete publishable application group; Helm owns runtime workloads. The bounded
candidate adapter binds native digests and verifies rendered image completeness.

Caches are explicit and independent:

- setup-node caches public npm downloads; setup-java caches Maven downloads.
- Actions cache persists `.nx/cache` with distinct validation matrix scopes so
  producers cannot race to save one incomplete shared cache key. Native task input hashes include source, native
  manifests/locks, toolchain config and shared Nx/workflow inputs. Java and frontend
  outputs are declared and tested for restoration after deletion.
- Protected-main Bake imports/exports Actions BuildKit caches with one scope per native
  target. PR builds only import trusted base-branch caches and never export compilation
  caches to main. GitHub cache ref scoping also isolates PR Nx/download cache writes.

Cache eviction is a performance event: empty caches fall back to native downloads and
builds. Whole source context copying is conservative; unrelated application inputs can
invalidate layers. There is no custom graph, image carry-forward or reuse engine. Initial
local measurements and invalidation tests appear in the checkpoint. Local task/layer
reuse is demonstrated; GitHub cross-run persistence must still be observed after review.
Do not equate npm downloads with compiled-output or Docker caches.

## Publication and handoff

Main builds every native application image for linux/amd64 with BuildKit provenance/SBOM.
Image signing/provenance/SBOM must succeed for every output. Candidate assembly verifies
trusted image source/ref/workflow and exact source digest, generates image values, vendors
the pinned chart dependency, records builder/material/tool/run/attempt inputs and packages
Helm with a CI-assigned version. No user image matrix or manual candidate directory exists.
`candidate-handoff` contains an exact OCI reference and build identities, never a latest tag.

App declarations live in Docker/Bake, Maven/npm, Nx and Helm. The current reference chart
is `charts/fieldsignal`; this app-specific path is an adoption setting, not a second component
catalog. Candidate/image registry paths derive from the source repository. The chart name,
QA hooks and native declarations remain application-owned. Second-app build/runtime adapter
proofs are in `tests/fixtures/tide-app` and `tide-web`; protected governance portability remains
an acceptance gate, not a claim established by the older graph-only fixture.

## Deployment integration

The companion consumes trusted source-CI signatures and exact build/image evidence, pulls
the same candidate, validates its own packaged environment schema, and checks out tests at
the verified source revision. QA runs disposable kind with observed image/config checks
before/after browser/API/Kafka tests and always deletes its cluster. Certification has a
different trusted workflow identity, current policy/expiry/revocation checks and fresh Grype
high/critical scanning. Source CI cannot supply an accepted certification signature.

Production proposals pin a reviewed existing config commit, reject alternate Helm override
routes, verify current certification, and render that exact pairing. No active environment
Applications or shared production observer were provisioned by this migration. See the
[operator runbook](operator-runbook.md) and checkpoint before enabling capabilities.
