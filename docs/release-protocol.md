# Application release protocol

Deployment operations are defined in [fieldsignal-deploy](https://github.com/RPJWeez/fieldsignal-deploy), separately from source development.

1. Publish affected components from protected main with independent versions and evidence.
2. Select a complete application's image digests and a shared-chart version in a standard Helm candidate chart.
3. Vendor the chart dependency and verify its evidence before packaging. Publish/sign the candidate once.
4. Verify every selected image and the candidate. Deploy the candidate digest through one Argo Application in disposable kind.
5. Run business-functional browser tests and API/Kafka replay tests. Attest success against the candidate digest, recording configuration/test inputs.
6. Promote by PR changing the candidate digest in an environment's Argo Application. Require matching qualification and valid environment configuration; no image overrides or rebuilding.
7. Let GitOps reconcile, then observe application health. Serialize promotions into the same environment through health confirmation.
8. Restore a previous compatible candidate via Git if recovery is needed. Do not claim rollback of external data/events.

New source commits/publications do not change an existing candidate. Changing candidate selections creates a new candidate requiring qualification. Environment-only differences must be validated/reviewed explicitly. This replaces the original custom release JSON, team release-unit catalog and Python renderer.
