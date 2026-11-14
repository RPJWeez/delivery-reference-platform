# Shared pipeline migration

2026-11-14. This app consumes `RPJWeez/pipelines` rather than carrying a pipeline framework.
The implementation is on `codex/extract-application-delivery`; the app migration is on
`codex/shared-application-delivery`. Both are review branches. No deployment or production
activation is included.

## Ownership changes

- `tools/pipeline`, `.github/actions`, delivery regressions/portability fixtures, and the
  verification container move to the pipeline project.
- App smoke tests move to `tests/smoke.py`; the simulator moves to `examples/simulate.py`.
- App qualification hooks move to `tests/qualification/dependencies.sh` and
  `tests/qualification/run.sh`. They retain app fixture/endpoints/business assertions.
- Native manifests, Nx graph checks, Docker/Bake, Compose/Helm and business tests remain here.
- The shared workflow runs the app's `npm run verify`. Native caches remain; full cached
  verification replaces pipeline-level affected scheduling. No custom baseline is needed.

The CI workflow and Compose toolchain both pin `22cc7b8c54fbc5c543c163c0a8f6bb0ca1388a76`. Keep them synchronized
on upgrades; neither follows platform main. The helper checkout uses the reusable workflow's
own commit and dependencies, under excluded `.work/delivery`.

## Review and activation order

1. Review and retain the shared pipeline commit. Observe its platform tests and shared
   runner fixture test. Branch-only commits must remain reachable; merge without losing
   the pinned commit, or update both pins to the reviewed retained commit.
2. Review the app migration and observe the reusable workflow against an app PR. The
   caller is 22 lines. No service-specific workflow scripts remain.
3. Inspect required-check settings. The old `Validation complete` job is now nested under
   `delivery`; confirm the actual check context before replacing protection requirements.
   Do not remove required validation while introducing the new context.
4. Before accepting candidates from the new workflow, migrate deployment trust. Keep the
   source repository/ref/SHA checks, and separately require signer
   `RPJWeez/pipelines/.github/workflows/application.yml` at the reviewed pipeline digest.
   GitHub attestations use the reusable signer identity. Inspect actual Cosign certificates
   and update exact identity checks as needed; do not broadly trust all platform workflows.
5. Candidate `build.json` keeps the caller `workflow` and adds `delivery.workflow` and
   `delivery.revision`. Downstream verifiers should validate both caller and delivery
   identities. Preserve existing legacy-candidate verification for retained rollback subjects.
6. Migrate the companion QA action to
   `RPJWeez/pipelines/.github/actions/qualify@22cc7b8c54fbc5c543c163c0a8f6bb0ca1388a76` and the two app hook paths
   together. Leave old pinned source actions available for old callers.
7. Observe a real source-main publication and separate QA/certification run. Production
   health/serialization and recovery acceptance remain separate gates. Do not equate an
   extraction test with qualification or certification.

This source change does not edit the companion repository or live protection settings.
A downstream verifier that still expects the old signer should reject new candidates
until its reviewed trust migration is complete.

## Validation evidence

- Shared regression suite: 48 local tests passed, including preserved chart SBOM inventory.
- Shared runner: built successfully and executed a native fixture hook from a read-only
  source mount with outputs isolated inside the container.
- Platform GitHub run before the final chart-inventory follow-up passed:
  [run 43622386975](https://github.com/RPJWeez/pipelines/actions/runs/43622386975).
- Compose successfully built the toolchain from an exact published pipeline Git commit.
- Full application verification passed in the shared runner: 7 workspace checks, native
  Java reactor verification, all frontend build/typecheck targets, and Helm lint.
- The app reusable caller still needs a GitHub PR run. Connector PR creation returned
  HTTP 403; automatic approval review rejected a browser fallback. Comparison links
  are supplied for review. No candidate publication or runtime QA is claimed.

Actionlint 1.7.12 requires narrowly ignoring its unknown `job.workflow_*` properties for
GitHub.com's newer exact-self-checkout contexts. Other workflow diagnostics remain enabled.
These documented contexts are unavailable on GitHub Enterprise Server; this implementation
currently targets GitHub.com / Enterprise Cloud.
