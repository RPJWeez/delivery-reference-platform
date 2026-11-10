# Architecture

FieldSignal is one business application maintained by several teams. Sensing owns ingestion and the station console; Response owns incident processing and the operator console. The **application composition** is the release and qualification boundary. Components retain independent build/publication identities.

## Sources of truth

| Concern                                       | Authority                                                      |
| --------------------------------------------- | -------------------------------------------------------------- |
| Java dependencies and package versions        | POM files                                                      |
| JavaScript dependencies and package versions  | package.json and package-lock.json                             |
| Affected tasks and declared contract coupling | Standard Nx graph and project configuration                    |
| Review ownership                              | CODEOWNERS                                                     |
| Complete release selection                    | Standard Helm candidate chart and values in fieldsignal-deploy |
| Active application candidate                  | OCI digest in the environment's Argo Application               |
| Qualification                                 | Signed attestation bound to that digest                        |

Nx's Maven plugin is experimental, pinned, and covered by selection/build tests. It delegates dependency analysis to Maven and execution to Maven/npm. No Nx Cloud subscription is required. Contracts that are not imported code still need explicit relationships; native Nx implicitDependencies record them without a second graph format.

## Build and publication

PRs run affected component tests/builds, dependency-selection regression tests and Helm schema/render checks. Protected main publishes affected artifacts. A publication failure keeps the workflow unsuccessful, so the next comparison does not silently omit those changes. Versioned Maven/npm/chart coordinates cannot be overwritten with different bytes; identical retries reuse them. Image versions include commit, run and attempt; deployment uses digests.

Release builds resolve published library versions, never mutable snapshots. A new library version does not silently change a consumer pin. Maven/npm changes must explicitly update the dependent version when adopting a new library. Local source-linked development is separate from this publication path.

## Qualification and promotion

The deployment repository packages a standard Helm wrapper chart containing image digests and its vendored shared-chart dependency. Qualification verifies evidence, deploys that exact OCI candidate through one Argo Application in disposable kind, and runs browser/API/replay tests. Its signed result records the candidate digest, deployment-config revision, test-suite digest, runner architecture and workflow URL.

Promotion changes the environment's candidate OCI digest. GitOps uses Argo CD native OCI sources, so a mutable chart tag cannot change the selected content. Environment values may vary endpoints, secret references, resources and replica counts; they cannot override images or business rules. These differences receive static validation and review, not a claim that every environment is identical.

A prepared PR is not active desired state. Merging its environment change requests deployment. Concurrent source publication cannot alter its digest selections. Conflicting production promotions require refreshed review and validation against the prospective merged configuration. A frozen candidate is qualified as a whole; composing two independently tested candidates produces a new candidate.

## Rollout and recovery

One Application is a coherent desired-state/operational boundary, not a distributed transaction. Rolling pods, cached browser clients and Kafka replay require compatibility. Use expand/migrate/contract database changes, versioned event semantics, deprecation windows and feature activation after prerequisites are ready. Git rollback restores a previous compatible candidate and does not undo emitted events or destructive data changes.

Argo uses Helm to render resources; it does not create a Helm-managed release. Platform dependencies and Argo itself are outside FieldSignal's resource ownership. A restricted AppProject allows application resources only in the intended namespaces. Cluster-administrator intervention remains outside the normal promotion path.

## Free-tier boundaries

Use public GHCR images/charts and public GitHub Packages. Standard GitHub-hosted runners are used; no larger runners or Nx Cloud. Passing CI logs are ephemeral, failure reports retain 14 days, and signed release evidence lives with retained artifacts. Retain every qualified/deployed/rollback candidate and its dependency closure. Never blindly purge untagged OCI manifests or evidence. Persistent cloud Kubernetes and a real Apigee subscription are deliberately outside this baseline.
