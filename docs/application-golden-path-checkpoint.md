# Golden-path implementation checkpoint

2026-11-13. Both branches: `codex/application-golden-path`.
Source base: origin/main `3e7783d`; companion checkout:
`/private/tmp/fieldsignal-deploy-golden-path`. No merges, shared deployments,
registry deletion or live protection/permission changes.

## Inventory and decisions

- Read the authoritative plan, architecture, release protocol and pipeline. No applicable
  AGENTS.md found in source ancestors/companion. Original untracked plan is included
  unchanged; superseded release-guardrails proposal is preserved separately.
- Source main run 43460430127 succeeded; no source PR was open at inspection. Companion
  has inactive examples, no candidate directories and no GitHub Releases. Source ruleset
  exists; deployment ruleset API was empty (classic protection was not established).
- Maintainer confirmed no external private-package consumers and selected disposable kind QA.
- Retained Nx inference/affected checks. Replaced Maven lifecycle execution with one native
  cached reactor target: experimental execution spawned 113 tasks, reused only 70 on warm
  repeat and produced recursive terminal records. No replacement graph was built.

## Reviewable phase gates

- [x] Cold Maven/npm source/container builds without private registry credentials/host outputs.
- [x] Private modules, fixed reactor convention/Enforcer, removal of independent publishing,
      registry-consumer builds and Python process launcher; Compose dev/verify/stop entry points.
- [x] Prepared native complete-image candidate CI, generated Helm version/values, vendored
      dependency, rendered closure checks, signed evidence and truthful digest handoff/reporting.
- [x] Prepared companion trust/run-attempt verification, QA/certification interfaces, expiry/
      revocation/security policy and immutable candidate/configuration validation.
- [ ] Protected-main candidate publication, GitHub cross-run cache persistence and actual
      cross-repository kind QA/certification. Cannot demonstrate the protected-main signer on
      an unmerged feature branch. Registry access/protected certification setup remains external.
- [ ] Selected shared production health/serialization integration, concurrent deployment/
      failed rollout/compatible rollback/hotfix drills, and second-app protected governance proof.

## Executed evidence

- Complete four-image source build passed. Migrated private-module build: 41.45 s.
- Native Docker per-target local cache export build: 47.57 s; explicit import repeat: 1.45 s.
  Actions `gha` import/export is configured, not yet observed on GitHub.
- Verification container ran source regressions and full native Nx/Maven/npm checks.
  41 source regressions passed in the full native run. Final phase-boundary run is recorded in `/private/tmp/golden-final-tests.log`.
- Cache proof passed cold fallback, output deletion/restoration, Java/UI library edits reaching
  both consumers, and rejection of internal Maven pin drift. Reactor: 20.5 s cold / 55 ms warm;
  frontend: 1.8 s / 9 ms. Changed Java library: 6.1 s; changed UI: 1.8 s. No release edits.
- Isolated `golden-path-proof` Compose application passed real HTTP/PostgreSQL/Kafka replay,
  deduplication/conflict/acknowledgment smoke test and Playwright business test (1 passed,
  9.2 s). Services stopped; local proof volumes retained. This is not digest-bound QA CD.
- Real tide-app Python API/worker images built with native tests; worker executed. Their actual
  metadata bound to Deployment/Job/CronJob templates. Separate frontend-only tide-web built,
  nginx configuration checked, actual metadata/rendered image closure verified. No claim of
  runtime CronJob execution or protected governance portability.
- Companion tests: 45 passed, covering immutable config/overrides, evidence scope/expiry/
  revocation, uncertified decisions, and wrong/failed/partial issuing workflow attempts.
- Source reporting isolation/explicit summary-write regression coverage remains in place.
  Runtime-observation tests reject wrong images, unready pods and concurrent revision drift.

## Remaining external work

Review branches before merge; observe real source-main publication and Github cache behavior.
Grant minimum GHCR evidence write access to companion jobs; configure protected certification
then enable it. Select/connect the real production health observer/merge interlock before
activating desired state. Production remains fail-closed. Execute the plan's runtime recovery,
concurrency, security scan and maintenance/second-app governance cases; they are not reported
as passed. No newly built candidate has been called QA-tested, certified, promoted or healthy.

Final static verification: both repositories passed actionlint 1.7.12, YAML parsing,
shell syntax and git diff whitespace checks. Added native provenance completeness
focused coverage after the full native run; all focused tests and 45 companion tests passed.

Review handoff: source implementation `8d1e429` plus matrix cache isolation `2a194dc`
were pushed to origin/codex/application-golden-path. Companion implementation `111a4bd`
was pushed under the same branch name and pins source machinery at `2a194dc`. GitHub
connector draft-PR creation returned HTTP 403 for both repositories; no PR-triggered CI
was started. Open review PRs from the pushed branches after resolving that access boundary.

PR #11 follow-up: run 43524557767 passed Java, frontend and regression checks but
Container source build failed because docker/bake-action defaulted to a remote Git
context, where the runner-generated .work/cache.json does not exist. Both PR and main
Bake actions now explicitly use source: . (the checked-out workspace). Pipeline regression
tests and actionlint passed locally; the push requests a fresh PR run. No permissions,
publication gates or summary-write behavior changed.

Human summary follow-up (codex/human-pipeline-summary): report now explains PR Docker
builds, shows actual publication/failed/skipped stages, groups current-attempt download/
registry/Release-asset links, and collapses technical selection. Inspected merged-main
run 43525491538: validation passed but all publishers skipped because the PR-only container
ancestor was skipped. Publisher jobs now explicitly handle skipped ancestors with always()
while requiring successful validation/prerequisites and a main push. No merge/deployment
performed. Summary-isolation/explicit-write and partial-publication coverage preserved.

Metadata handoff follow-up (codex/bake-metadata-file): main run 43527456691 pushed
all four images, then failed to launch Bash for the recording step because full native
provenance JSON exceeded the per-environment-value process limit. Image evidence and
candidate packaging were skipped; no complete candidate was established. Metadata now
uses an escaped JSON string literal in a runner-written Node script file, then ordinary
file reads. No large metadata environment/argv value, shell interpolation or provenance
truncation remains. Tests round-trip a 2 MiB payload with hostile quoting/command text,
reject missing/malformed metadata, and retain summary-write isolation coverage. No
registry artifacts deleted, main rerun, merge or shared deployment performed.

Candidate Helm follow-up (codex/candidate-helm-global): run 43529193233 reached
candidate lint after image evidence, but Helm injected an empty `global` into the
application subchart and the strict root schema rejected it. Schema now permits only
an empty global object; arbitrary global keys and mutable image overrides still fail.
A regression reproduced the original failure before the fix, then exercised complete
wrapper binding, local dependency vendoring, lint, versioned packaging, archive rendering,
image-closure validation and negative override checks. All 42 focused tests and actionlint
passed. Candidate publication was not reached in the failed run; no artifacts were deleted
and no merge/main rerun/shared deployment was performed by this fix.

Package-link follow-up (codex/package-summary-links): run 43530534029 successfully
published the candidate at sha256:d3b5029044bbd2d0ed763353f20e120b7ea2fdc756690f4045fde27415bf9788.
The owner-level GitHub package URL returned HTTP 500 (also for an application image),
while the repository-scoped /pkgs/container route returned HTTP 200. Anonymous Helm
pull by exact OCI digest succeeded and matched that digest. Summary package links now
use the verified repository route; no republishing, candidate mutation or deployment
is involved. Nested candidate/image path and single-encoding regression coverage added.
