# Delivery acceptance evidence

The migration replaces the initial custom catalog/renderer with native build tooling and application-level GitOps.

- [x] Infer Maven/npm dependencies and affected tasks; test service, transitive-library, UI and contract cases.
- [x] Pin the Maven Wrapper, Nx/plugin toolchain and hosted workflow actions; disable Nx Cloud.
- [x] Remove custom catalog, impact scripts, team release JSON and renderer.
- [x] Implement independent Maven/npm/image/chart publication and signed artifact evidence.
- [x] Implement the reusable shared chart's real runtime configuration and non-root containers.
- [x] Implement browser business-functional tests and Kubernetes replay-test support.
- [ ] Verify protected-main component publication remotely and make demo packages public.
- [ ] Publish a real application candidate, qualify it through one Argo Application and retain signed evidence.
- [ ] Verify a production pin PR, a rejected unqualified candidate, and restoration of a compatible prior candidate.
- [ ] Demonstrate a newly added component using existing pipeline targets, and document second-application bootstrap.

No permanent cloud resources are provisioned. Optional future work: Apigee, device registry, rule correlation, scheduled aggregation, field assignments, notifications and production admission policy.
