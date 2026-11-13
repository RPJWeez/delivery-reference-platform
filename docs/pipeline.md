# Pipeline operation and template contract

The workflow validates PR merge commits and publishes on pushes to main. Standalone feature branch pushes do not run. Publication never deploys an application.

## Reading a run

Open **Run report** in the Actions run summary. It shows a visual execution map, the baseline and why it was selected, changed files, affected publication projects and dependency paths, job outcomes, artifact coordinates/checksums, and evidence links. Download `run-report` for the corresponding JSON. Intermediate `results-*` artifacts preserve individual job results and the selection plan.

Publication results are recorded immediately after registry operations, before evidence generation. A later evidence failure therefore does not hide a successfully published artifact. An absent completion record does not prove the registry is unchanged: an external operation can succeed before the runner records its result. The report calls this out rather than inventing a successful or skipped result. A wholly cancelled workflow may not finish its final report.

The graph notation `consumer → dependency` explains transitive impact. Shared/root inputs and Nx-specific inference can select projects without a direct source path; these are explicitly labeled. The selected project set comes from Nx, not a separate dependency model.

## Validation stages

1. **Plan affected work** checks out full history, selects affected projects with Nx, and records the plan. PRs compare the target commit to the synthetic merge commit. Main compares to the last successful complete `ci.yml` push workflow; bootstrap compares to an empty tree. Failed publication stays in the comparison range for the next main run.
2. **Java — compile, test, package** runs affected Maven `verify` targets. This executes the Maven lifecycle through verify, including configured compilation, tests, and packaging. FieldSignal's unit tests use H2; this is not real Kafka or browser qualification.
3. **Frontend — build and typecheck** runs applicable affected Nx build/typecheck targets and prerequisite builds.
4. **Pipeline and Helm regression tests** exercises selection, reporting, release asset repair, publishing adapters, and chart rendering. It also lints every discovered chart. This suite deliberately runs on every workflow.
5. **Validation complete** is the aggregate gate required by all publishers. When updating branch protection, select this check (the old `ci` display name has changed).

Maven/npm publish before dependent images. Maven publication is serialized in graph order. Chart publication runs independently after validation. Images rebuild against registry dependencies, publish both configured architectures, and receive signatures and attestations. Explicit library/chart versions must be bumped when content changes. Identical immutable versions can be reused. Image tags include commit, run ID, and attempt.

## Finding evidence

| Kind  | Raw SBOM                                                               | Signed evidence                                                   |
| ----- | ---------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Maven | Release linked in report; component/run/attempt `.cdx.json`            | GitHub provenance and SBOM attestations                           |
| npm   | Release linked in report; package/run/attempt `.spdx.json`             | GitHub provenance and SBOM attestations                           |
| Image | Per-component run Release linked in report; `.spdx.json`               | GitHub/registry attestations, BuildKit evidence, Cosign signature |
| Chart | Chart version Release linked in report; chart/run/attempt `.spdx.json` | GitHub archive attestations and Cosign signature on OCI digest    |

SBOM filenames include run/attempt because scanners include generation metadata. Retries can add missing evidence without replacing immutable files. The release retention adapter compares existing asset bytes and rejects conflicts. An existing release no longer prevents missing assets from being uploaded. Old missing evidence is repaired when the component is selected again; this change does not backfill all historical releases.

A chart SBOM inventories the packaged chart, not its selected application images. Each image has its own SBOM. BuildKit retains per-platform inventories; the additional scanner JSON is a supplemental inventory for the scanner-selected platform. Actions artifacts are convenient, retention-limited diagnostics/results; Releases and OCI evidence provide the durable copies. Preserve evidence and artifacts referenced by qualified/deployed candidates.

For registry artifacts, verify provenance with `gh attestation verify oci://<image>@sha256:<digest> --repo <owner>/<repo>`. For downloaded files use `gh attestation verify <file> --repo <owner>/<repo>`. Inspect the linked release's assets for the raw SBOM; provenance and SBOM predicates are separate attestations.

## Using the repository as a template

Reusable mechanics live in `.github/workflows`, `.github/actions`, and `tools/pipeline`. Application definitions remain in native Maven/npm/Helm manifests, Nx targets/implicit dependencies, infrastructure, and business tests. No second service catalog is required.

- Edit `tools/pipeline/config.json` for Java/Node versions, npm registry, image architectures, and the chart registry path. Setup derives authentication scopes only from publishable workspace manifests, leaving third-party scopes alone.
- Maven uses `MAVEN_REPOSITORY_URL`; Actions defaults it to `https://maven.pkg.github.com/$GITHUB_REPOSITORY`. Set this variable locally when resolving published dependencies. This URL is shared by publishing and resolution, eliminating the previous mismatched hardcoded repositories.
- Image repositories derive from the current repository and project directory basename. Component directory basenames must be unique. Charts derive from their Nx project roots and publish under the current owner. npm names/scopes remain standard package manifest settings.
- Add standard Nx `container`, `publish-maven`, or `chart-package` targets as appropriate. Tag npm libraries `type:npm-library`. Maven/npm dependency inference and explicit contract dependencies determine impact. Keep the workflow filename `ci.yml`, or update its history lookup together with a rename.
- Pipeline configuration, publishing scripts, workflow/actions, and shared tool inputs participate in Nx affected selection. Publication targets declare inputs explicitly, including projects that have no build target.
- The current adapters support Maven JAR/POM, npm, OCI images, and Helm on GitHub infrastructure. Adding another language or registry requires an adapter/target; arbitrary ecosystems are not automatically supported.
- `tests/fixtures/portable-app/workspace.json` defines an unrelated Harbor application with different paths and component names. Regression tests instantiate it in an isolated directory and run real Nx selection using the repository target defaults. Registry repair uses a local fake GitHub CLI; these tests do not publish packages.

The Makefile is a local command interface. `tools/smoke.py`, browser tests, Kafka topics, and application assertions remain application-owned. Copying the template means replacing those application examples and their native manifests, not editing the publishing algorithms.

## Qualification caller migration

The reusable qualification action now takes application-owned hooks instead of containing FieldSignal's ports and service names. Deployment-repository callers must supply these inputs when adopting this revision:

```yaml
with:
  reference: <digest-addressed candidate>
  deployment-revision: <exact deployment commit>
  namespace: fieldsignal-qualification
  application: fieldsignal-qualification
  dependencies: tools/qualify-dependencies.sh
  test-command: bash tools/qualify-tests.sh
  test-root: ${{ github.workspace }}/source
  test-revision: <exact source checkout commit>
```

Check out the source containing the hooks at `test-revision` into `test-root` (a clean checkout). This is explicit because remote composite action downloads do not include Git history. The action verifies the checkout before running provisioning or tests. Dependency hooks run from that source root with `QUALIFICATION_NAMESPACE`; tests receive that variable plus `PLATFORM_ROOT`. FieldSignal hooks retain its real API/Kafka/browser scenarios. Qualification records the exact source revision, hooks, command, candidate digest, and deployment revision. Callers retain the bootstrap project and qualification Argo Application files in the deployment checkout, following the existing two-source candidate/configuration convention.

The separate deployment repository is not modified by source CI. Update its caller alongside adopting this action revision. A live qualification run is still required to validate the external integration.

The Maven parent/libraries and their dependency pins move to `0.1.1` in this change because repository URL metadata changes the published POM bytes; reusing `0.1.0` would correctly fail the immutability guard.
