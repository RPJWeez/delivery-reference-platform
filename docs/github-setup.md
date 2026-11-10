# GitHub setup

Source repository: RPJWeez/delivery-reference-platform. Deployment repository: RPJWeez/fieldsignal-deploy. Keep both public for the free-tier demonstration.

Main requires a PR and the GitHub Actions ci check, with zero required approvals for a solo maintainer. Block deletion/force pushes, and use no routine bypass. Apply equivalent protection to the deployment repository after its initial ci workflow is registered. Genuine multi-person approval needs another reviewer; the author cannot approve their own PR.

Public package visibility is separate from source visibility. Make GHCR charts/images and the npm package public after initial creation; Maven packages inherit repository access. Do not configure paid runner sizes or Nx Cloud. Verify account billing stop-usage controls separately; this repository does not change billing settings.

Publication jobs run only on protected main. PR jobs are unprivileged. Workflows use scoped GITHUB_TOKEN/OIDC rather than stored publishing credentials. Maven local package reads may need a read-only package token outside CI.

The deployment pipeline verifies the candidate's signed artifact evidence and successful qualification before promotion. Existing production pin updates are reviewed Git changes; publication never updates them automatically. A local kind/Argo installation supplies the demonstration runtime; persistent cloud and Apigee targets remain optional decisions.
