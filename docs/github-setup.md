# GitHub setup

The source repository is `RPJWeez/delivery-reference-platform`; shared delivery code lives
in `RPJWeez/pipelines`; environment policy/configuration lives in `RPJWeez/fieldsignal-deploy`.
The app workflow and Compose toolchain pin the same reviewed pipeline commit.

Main should require a PR and the observed reusable validation check, with no routine
bypass or force pushes. Check names change when jobs become nested under `delivery`;
follow [migration notes](shared-pipeline-migration.md) before updating required contexts.
A solo maintainer cannot supply independent review merely by assigning themselves.

Public source/package visibility and cross-repository access are separate settings. This
reference uses public pipeline code and GHCR artifacts. Existing private-library packages
are historical; new private libraries build from checkout without registry credentials.
No paid runners or Nx Cloud are required by these declarations.

Publication runs only for a main push after validation. The caller grants explicit token
permissions and individual shared jobs narrow them. No inherited secrets or additional
publishing credential is passed. The shared workflow uses scoped GITHUB_TOKEN/OIDC.

Before accepting candidates downstream, migrate exact reusable-workflow signer trust
while preserving caller repository/ref/source checks. QA/certification and production
health remain separate capabilities. This migration does not change live permissions,
protection settings, package visibility, or production desired state.
