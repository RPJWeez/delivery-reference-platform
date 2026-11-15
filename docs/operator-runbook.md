# Operating application delivery

Source validation, package creation, release approval and deployment are distinct actions.
See [application workflows](pipeline.md) for the supported operations and inputs.

## Failures and retries

A failed image/chart publication is not a complete candidate, even if some images reached
the registry. Fix the failure and rerun package creation. A failed QA run does not change
or delete its candidate; rerun QA against the same immutable digest after correcting the
underlying issue. Promotion requires the successful QA run reviewed by the release owner.

A release name cannot be reassigned to a different candidate or QA record. Retrying the
same promotion preserves its original selection. Use the repository's Releases page to
see the candidate digest, QA link and approving actor.

No packaging/promotion workflow deploys Kubernetes. A CD request is not proof of healthy
runtime state: inspect sync revisions, rollout readiness and actual container digests.
If rollout stalls, stop further environment changes and collect diagnostics.

## Recovery

Select a retained compatible release/configuration pair. Check database migrations,
API/event overlap, Kafka replay effects and required secrets. Artifact rollback does not
undo data or external events. Requalify a different component combination through QA.
Retain every image and chart referenced by a release; copying a chart alone does not copy
its images. Do not delete retained release artifacts as part of a retry or rollback.

Platform workflow versions, registry permissions and publication mechanics are maintained
centrally.
