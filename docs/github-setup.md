# GitHub setup

Repository: `RPJWeez/delivery-reference-platform`. The owner created the repository and the local origin is configured. Visibility and license remain the owner's choice; no license has been assigned automatically.

## Before public demonstration

- Configure main branch rules: require pull requests, passing `ci` checks, owner review, resolved conversations, and prevent bypass/force push.
- Replace illustrative team ownership with real GitHub teams if using an organization. For a personal repository, `@RPJWeez` is the effective reviewer; simulated teams demonstrate boundaries but do not prove multi-person approval enforcement.
- Keep PR jobs read-only. Never execute PR-controlled code in `pull_request_target` with write credentials.
- Enable dependency updates and review SHA-pinned action changes.
- Before publication is added, enable GHCR and define package retention/access. Choose Maven/npm package registries and scoped names.
- Define dev/staging/production environments with approvals and branch restrictions. Check which rules and attestation features are supported by the account's plan and visibility.
- Select Kubernetes target, OIDC trust policy and namespace-scoped roles before enabling deployment. Do not add a shared cluster-admin kubeconfig.

## Proposed workflow separation

`ci.yml` runs catalog-based impact selection, policy/Helm checks, affected Java tests, web builds, and a real PostgreSQL/Kafka smoke test on PRs and main. The stable `ci` job aggregates the result for branch protection. Later workflows should separate unprivileged test/build from trusted publishing, artifact selection, and environment promotion. Publish only from protected main with fixed workflow identities. Promotion accepts an already published release bundle digest, not an arbitrary source branch or image tag.
