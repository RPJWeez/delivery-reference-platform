# Operator recovery and activation

Prepared code is not live capability. Review the checkpoint before activation. Do not
merge or deploy merely because local tests pass.

## Activation gates

1. Review source/deployment branches and required checks. Preserve every existing
   package/image/evidence/rollback closure. The source plan remains the acceptance matrix.
2. Merge approved source changes separately, then observe a real protected-main complete
   candidate publication. No branch workflow is a substitute for its protected signer.
3. Grant the deployment repository the minimum GHCR Actions access needed to attach QA/
   certification evidence. Verify public image/chart pulls. No access settings changed here.
4. Update the companion's action pin to the reviewed source implementation commit. Run
   QA with the exact `candidate-handoff` digest. Verify source/build/run/attempt binding,
   observed candidate/config, browser/API/Kafka tests, fixture isolation and cleanup.
5. Protect the certification environment to approved main workflow execution. Automatic
   technical certification needs no duplicate human approval; add reviewers only if actual
   policy requires them. Review seven-day freshness and high/critical scan policy. Then set
   `CERTIFICATION_ENABLED=true`. Verify unauthorized source-CI/QA issuers fail.
6. Select actual staging/production infrastructure and a trusted sync/health observer/merge
   interlock. It must serialize promotions through observed health, reject stale concurrent
   proposals, and stop advancement on failed rollout. This integration remains blocked on
   real environment/access selection; no fake kubeconfig or successful health record exists.
7. Commit environment config first, then propose its existing reviewed commit alongside a
   certified candidate digest. Keep examples inactive until all runtime gates pass.

## Failures and retries

Image/evidence failure leaves the run failed and fragments unpromotable. Retry source
publication as a distinct attempt, or repair missing immutable evidence. Never overwrite
coordinates. QA failure keeps a candidate published but unqualified; retry the same digest
with recorded configuration/test/fixture inputs. Certification failure is not promotion.
Registry outages fail closed. Do not treat authentication errors as artifact absence.

A merge requests GitOps deployment; it is not healthy state. Observe exact sync revisions,
rollout readiness and runtime image identities through health confirmation. If rollout
stalls, collect diagnostics and stop queued advancement. Do not imply atomic cutover.

## Rollback and hotfixes

Select a retained compatible candidate/config pair. Revalidate against its packaged schema
and current eligibility/revocation policy. Check database expand/migrate/contract history,
API/event/client overlap, Kafka replay semantics and secret/version availability. Artifact
rollback does not undo data or external events. Expired evidence requires requalification/
recertification or a separately approved, auditable emergency process; no bypass is provided.

Prefer a main fix and new whole candidate. If main cannot ship, protect a maintenance branch
from the deployed source, forward-port the fix, and explicitly review trust/workflow policy
for that branch before publication. Current CI/trust permits main only: maintenance support
is deliberately fail-closed, not an untested hotfix capability. Never mix one hotfix image into
an old chart. Execute rollback, concurrent-promotion and hotfix drills on selected runtime
infrastructure before describing recovery as proven.

Retention is report-only. Registry deletion and separate certified storage are outside this
migration. A chart copy would not copy referenced images; URL rewrites change its digest.
