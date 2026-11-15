# Application workflows

`Application CI` validates branch updates, PRs and main merges. Validation does not
publish images or charts. PRs select affected projects; main validates the whole app.

For delivery, open **Actions → Application CI → Run workflow**, leave the workflow branch
on `main`, and choose:

| Operation   | Fill in                                         | Result                                                          |
| ----------- | ----------------------------------------------- | --------------------------------------------------------------- |
| `dev`       | `source-ref`: your branch                       | Images and a complete dev chart for that exact branch commit    |
| `candidate` | No additional fields                            | Images and a complete release candidate from main               |
| `compose`   | `candidate`, optional `overrides`, and `reason` | New chart selecting existing component images; no image rebuild |
| `promote`   | `candidate`, `release-id`, and `qa-run`         | A GitHub Release pointing to that exact candidate               |

Copy the immutable candidate reference from the run summary. For composition, `overrides`
selects components from other candidates, for example:

```json
{
  "ingestion-service": "ghcr.io/rpjweez/delivery-reference-platform-release-packages/fieldsignal@sha256:..."
}
```

The release owner reviews QA for the assembled candidate and supplies that successful
GitHub Actions run URL when promoting. Promotion records the approval and QA link; it
neither rebuilds the candidate nor deploys it. QA and Kubernetes deployment remain in
separate CD workflows. Configure GitHub's `release` environment reviewers if an additional
approval is required.

The application declares its builds in Maven/npm/Nx, its images in `docker-bake.hcl`, and
its workloads in the Helm chart. Shared workflows discover these declarations; there is
no second service inventory or delivery policy file in this repository.

The application calls the platform's maintained `v1` workflow version. Shared scripts,
artifact verification, publication and release mechanics stay in
[the pipeline repository](https://github.com/RPJWeez/pipelines/tree/v1).
See its [operator/onboarding guide](https://github.com/RPJWeez/pipelines/blob/v1/bootstrap/README.md)
for platform details. Use `make verify` for local validation.
