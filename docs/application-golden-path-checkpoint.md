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
