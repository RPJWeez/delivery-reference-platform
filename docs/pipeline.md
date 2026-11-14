# Pipeline operation

Application CI calls the versioned reusable workflow in
[RPJWeez/pipelines](https://github.com/RPJWeez/pipelines/tree/codex/extract-application-delivery).
The app owns `.github/workflows/ci.yml`, native Maven/npm/Nx builds, Docker/Bake,
Compose/Helm, contracts, and business tests. Shared scripts, actions, pipeline regressions,
portability fixtures, and the verification toolchain live in the pipeline repository.

## Developer workflow

Use `make dev`, `make verify`, and `make stop`. Both local container verification and CI
invoke `npm run verify`: application graph/chart tests, the cached native Maven reactor,
frontend build/typecheck, and Helm lint. Native Nx caching remains in use; verification
covers the full app without a custom publication-history baseline. Browser/API/Kafka
business tests require a running app and are separate from source verification.

`make verify` builds the shared Java/Node/Helm toolchain directly from the pinned pipeline
commit in Compose. It mounts this source read-only and verifies a writable container copy.
It does not require app-owned fetch scripts or pipeline dependencies. Update the workflow
and Compose pipeline refs together when adopting a new reviewed platform version.

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
