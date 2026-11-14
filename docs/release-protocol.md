# Application release protocol

1. A contributor changes code/tests/native manifests and runs `make verify`. Private
   libraries require no release-version or adoption-pin edits.
2. The pinned shared workflow runs the app-native `npm run verify` hook and full
   source-container proof. Native caches preserve build reuse; pipeline regressions live
   in the shared project. See [pipeline migration](shared-pipeline-migration.md).
3. Protected main builds the complete Bake application group using explicit caches.
   It publishes exact image outputs and required evidence. Partial uploads remain
   failed/incomplete; they do not produce a complete-candidate handoff.
4. CI binds verified image digests to the app-owned Helm chart, vendors its pinned local
   dependency, assigns a run/attempt package version and signs the candidate. It records
   source, workflow, native builder/material metadata and toolchain inputs. CI ends at
   **published; QA pending**. It does not deploy or certify.
5. In fieldsignal-deploy, QA accepts the digest-addressed candidate handoff, verifies
   trusted source/workflow/revision and all images, checks candidate-specific config
   schema, then runs disposable kind/Argo/functional tests. It records observed identity
   before/after tests. No rebuild or image substitutions occur.
6. A separately protected certification workflow verifies build and signed QA evidence,
   current policy, expiry/revocation and fresh high-or-critical vulnerability scanning.
   It signs eligibility against the original registry digest; it does not copy artifacts.
7. A reviewed promotion selects that digest and an existing reviewed configuration
   commit. Configuration must be committed first; the pointer cannot name itself.
   Production verifies current certification and the exact proposed pairing.
8. GitOps reconciles desired state. Observed sync/health is a separate required state;
   serialization must continue through health confirmation. The shared production
   observer/merge interlock still requires an actual selected runtime integration.
9. Recovery selects a compatible retained pair, rechecking current eligibility and data/
   contract compatibility. An expired/revoked candidate cannot bypass current policy.

Prepared workflows are not executed capability. Local checks are recorded in the
[checkpoint](application-golden-path-checkpoint.md). Source-main publication and the
cross-repository protected path require review/merge and package access configuration;
these actions were not authorized or executed during implementation.
