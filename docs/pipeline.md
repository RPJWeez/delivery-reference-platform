# Application workflows

Each pipeline has a separate entry in **Actions**:

| Workflow                  | Trigger / inputs                                            | Result                                                 |
| ------------------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| Application CI            | Branch pushes, PRs and main merges                          | Native checks and container proofs; no publication     |
| Create dev package        | Manual on main; select `source-ref`                         | Images and a complete dev chart for that branch commit |
| Create release candidate  | Manual on main                                              | Images and a complete candidate from main              |
| Compose release candidate | Manual on main; `candidate`, optional `overrides`, `reason` | A new chart using existing images; no image builds     |
| Promote release candidate | Manual on main; `candidate`, `release-id`, `qa-run`         | A GitHub Release pointing to that exact candidate      |

CI selects affected projects for PRs and validates the whole application on main. Its
workflow references only validation; manual delivery pipelines are not part of its graph.
Dev/candidate creation build images after native checks. Composition and promotion have
separate graphs without unrelated build or publication stages.

Copy the immutable candidate reference from the package run summary. A composition override
selects one component from another candidate, for example:

```json
{
  "ingestion-service": "ghcr.io/rpjweez/delivery-reference-platform-release-packages/fieldsignal@sha256:..."
}
```

The release owner reviews QA for the assembled candidate and supplies that successful
GitHub Actions run URL when promoting. Promotion records approval and the QA link without
rebuilding or deploying. QA and Kubernetes deployment remain in separate CD workflows.
Configure GitHub's `release` environment reviewers if an additional approval is required.

The application owns Maven/npm/Nx builds, Bake images, Helm workloads and business tests.
The five small Actions files supply triggers and relevant forms; implementation stays in
[the shared pipeline repository](https://github.com/RPJWeez/pipelines/tree/v1), whose `v1`
version is maintained centrally. No application descriptor, service list or delivery script
is copied here. Use `make verify` for local validation.
