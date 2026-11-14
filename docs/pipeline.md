# Pipeline operation

Application CI calls the versioned reusable workflow in
[RPJWeez/pipelines](https://github.com/RPJWeez/pipelines/tree/codex/extract-application-delivery).
The app owns `.github/workflows/ci.yml`, native Maven/npm/Nx builds, Docker/Bake,
Compose/Helm, contracts, and business tests. Shared scripts, actions, pipeline regressions,
portability fixtures, and the verification toolchain live in the pipeline repository.

## Developer workflow

Use `make dev`, `make verify`, and `make stop`. Local `make verify` retains the convenient
full-application `npm run verify` command. Hosted CI exposes the native work as separate jobs:

- `Build/Test - <Java project>` runs native Maven verification for that module and its
  required private source dependencies.
- `Build - <library>` and `Build/Typecheck - <frontend>` run declared native Nx targets.
- `Test - Workspace and dependency graph` runs the root native `ci` target.
- `Lint - application-chart` checks the shared chart templates.
- `Build Image - <target>` verifies a selected PR image; main uses
  `Build & Publish Image - <target>` for every application image.

PRs select changed projects and consumers through the native Nx graph. Repo-wide checks
always run, and ambiguous image ownership builds conservatively. Main checks every native
project and publishes a complete image closure; it does not mix in historical image outputs.
New projects need native targets/dependency edges, image/runtime declarations, and tests.
There is no service list in the app caller or shared workflow. A `ci` target is the native
extension point for additional per-project checks; repositories without Nx can declare
named native commands through the shared workflow's `project-checks` input.

Each matrix job has its own source checkout and cache producer scope. Maven jobs build
needed source dependencies with `-am`, so dependency compilation/tests may repeat across
jobs without private package publication. Native task caching remains available for Nx
jobs. Browser/API/Kafka tests remain separate runtime QA checks.

The Compose verification toolchain and CI caller pin the same reviewed pipeline commit.
Update both pins together when upgrading. The app carries no generic pipeline scripts.

## Delivery ownership

The shared workflow discovers Bake's complete `application` group, builds source containers
without pushing on PRs, and publishes all images on a main push after verification. It
binds exact native output digests into `charts/fieldsignal`, verifies rendered completeness,
vendors the local chart dependency and publishes the immutable candidate with evidence.
There is no hand-maintained workflow service matrix or internal library publication.

Helpers are checked out under ignored `.work/delivery` at the reusable workflow's own
commit, not from the app or platform main. Shared dependencies install there independently.
The app caller grants a permission ceiling; each platform job narrows permissions. No
`secrets: inherit` or extra write token is passed.

The implementation retains current signing, SBOM, Release-retention and human-reporting
behavior for migration compatibility. Its generic regression suite is maintained centrally.
Source CI ends at **published, QA pending, certification pending**. Partial image/chart
uploads and missing evidence cannot establish a complete handoff. Run-attempt identities
and summary-write isolation remain enforced by platform tests.

## Deployment integration and activation

See [shared pipeline migration](shared-pipeline-migration.md) for the exact pin, changed
check names, QA-hook paths, and signer trust changes. Moving attestation generation into
a reusable workflow changes signer identity; the caller source repo/ref/SHA remain separate
verification requirements. Deployment consumers must migrate these checks deliberately.
Existing exported actions remain usable at their historical source commits.

The companion owns candidate consumption, QA/certification policy, immutable environment
configuration, promotion and production health. None of those capabilities is activated
merely by extracting CI. See [release protocol](release-protocol.md) and
[operator recovery](operator-runbook.md).

## Reading the run summary

There is one `Application delivery summary` box. It lists each project's work/result,
images built or omitted as unaffected, failure-step/log links, image evidence, candidate
publication state, and downloads. Native commands and bounded test/build/cache output
are expandable inside that same report.

Third-party Docker and attestation summaries are disabled. Non-report steps and native
child commands redirect job-summary writes; only the final report explicitly writes the
GitHub summary. Logs, Docker build records, test reports and attestations remain available.

Successful image builds/pushes do not establish a complete candidate when chart publication
fails. Source CI never claims runtime QA, certification, or application deployment.

Initial hosted acceptance: [run 43653169063](https://github.com/RPJWeez/delivery-reference-platform/actions/runs/43653169063)
passed nine separately named project-check jobs and four image-build jobs. Its run page
was inspected and contained exactly one consolidated job-summary box. The shared tests
also cover failed discovery, cancelled/failed matrix jobs, native commands without Nx,
and missing/duplicate/inconsistent image metadata.
