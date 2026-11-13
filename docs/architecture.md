# Architecture

FieldSignal is one releasable application per source repository. Java application-private
modules compile in Maven's reactor; npm private workspaces link local source builds.
There is no independent internal-package publication or adoption-version workflow.
Previously published artifacts remain retained and untouched. The maintainer confirmed
that these packages have no external consumers during the golden-path migration.

Maven/npm own compilation and dependencies. Nx remains responsible for affected
selection, orchestration and task caching. Maven dependency inference remains pinned;
execution uses one native reactor target. The experimental plugin's 113-task lifecycle
execution achieved only 70 cache hits on an unchanged repeat and produced recursive
terminal records. The native reactor task restores its declared outputs in one cache
entry. See the checkpoint for measured verification and remaining acceptance gates.

Source CI validates PRs and prepares complete immutable candidates on protected main.
Dockerfiles consume source and run native tests/builds; host target/dist/node_modules
are excluded. Bake's application group owns build outputs. The app-owned Helm chart
owns runtime roles. A bounded adapter binds native output digests to Helm values and
checks the rendered image closure. A candidate includes templates, pinned vendored
chart dependencies, configuration schema and build identities; image bytes remain in
separate registry objects. CI assigns chart versions from run/attempt, not contributor
release bookkeeping. Source SHA alone is not build identity.

Separate deployment-repository QA uses the exact candidate digest in disposable kind
with application-owned fixtures and tests from the verified source revision. Evidence
records artifact/config/test/fixture/platform/attempt identities and observed runtime
images. Protected certification verifies trusted build/QA evidence and current security
policy, then signs eligibility against the same registry digest. Production selects an
eligible candidate plus an existing reviewed configuration commit. The outer GitOps
pointer may follow protected main; runtime configuration cannot move independently.
All alternate Helm override routes are rejected.

These are prepared repository contracts. The migration has demonstrated local source
builds, cache restoration/invalidation and Compose business tests. Signed source-main
publication, cross-repository QA/certification and production health orchestration have
not been demonstrated. Deployment examples remain inactive. Certification remains
fail-closed until its protected capability is configured; no protections were changed.

Coherent desired state does not imply atomic rollout. Preserve API/event compatibility,
expand/migrate/contract database changes and client deprecation windows. Rollback uses
a retained compatible candidate/configuration pair and does not undo data or external
events. Retain old images, packages, evidence and supported rollback closures; no registry
cleanup or copying is part of this migration. See [operator recovery](operator-runbook.md).
