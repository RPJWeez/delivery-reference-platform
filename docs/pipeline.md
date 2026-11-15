# Pipeline operation

The application uses pinned reusable workflows from
[RPJWeez/pipelines](https://github.com/RPJWeez/pipelines/tree/codex/deliberate-delivery-topology).
The application owns native Maven/npm/Nx builds, Bake image definitions, Helm charts,
`.delivery/application.json` and business tests. Generic delivery implementation remains
in the shared repository. CI and the Compose verification toolchain pin the same commit.

## Validation

`Application CI` runs on branch pushes, PR events and merge-queue events. Branch pushes
with an open PR skip duplicate work; an API lookup failure runs checks conservatively.
Main merges validate every native project and do not publish images or candidates.
PR/branch affected selection uses exact source commits, the native Nx graph and declared
inputs; root workspace checks always run. Non-Nx applications can supply named commands.
The required aggregate remains `delivery / Validation complete`; inspect the actual hosted
context before changing branch-protection settings. Tests also protect the UI-only case:
station-console edits do not mark the Maven parent and all Java projects affected.

Native build/test/typecheck jobs and source-container proofs have read-only permissions,
no registry login and no image publication. New validation and package workflows disable
shared build/task caches until safe cross-trust acceleration is demonstrated. Local
`make verify` remains the full native verification command. Its root Java reactor task
is intentionally uncached: parent-owned file inputs exclude nested projects, so caching
that convenience task could miss module edits. Native Maven still handles incremental
compilation; hosted verification uses separate native module jobs.

## Manual artifact production

Dispatch these application workflows **on main**:

| Workflow                     | Input                                                                 | Result                                                   |
| ---------------------------- | --------------------------------------------------------------------- | -------------------------------------------------------- |
| Create dev package           | Same-repository `source-ref` branch                                   | Complete immutable dev image/chart package               |
| Create release candidate     | No source override                                                    | Complete candidate built from exact dispatch-main commit |
| Compose release candidate    | Immutable baseline, optional component-to-candidate overrides, reason | New candidate using existing images; no image builds     |
| Promote candidate to release | Immutable qualified candidate, unique release ID                      | Signed release designation of that same chart digest     |

Workflow instructions and trust policy come from protected main. Dev source is resolved
once to a commit; its chart/component declarations can include new components, while main
retains application identity and trust policy. Fork packaging is not supported. If main
moves before release-source resolution, dispatch again. No workflow in this table deploys.

Package creation runs native validation, then builds each image once into an OCI archive
and builds the Helm chart
without publication credentials. A separate read-only job verifies the payload, chart
image closure, OCI blob hashes, source identities and limits. Fresh publishing jobs copy
images by digest and publish chart/evidence. They do not execute branch scripts or render
branch chart templates. A successful complete handoff includes immutable chart and image
references, original producer/composer identities, compatibility declarations, SBOM and
signed attestations. Partial image uploads are not a complete handoff.

Dev and release artifacts use separate `-dev`/`-release` image repositories and
`-dev-packages`/`-release-packages` chart repositories. Dev packages cannot be release
composition inputs. Release creation initially builds every component; unchanged-image
reuse is a later optimization. Composition requires an explicit baseline digest, not
independent per-component latest tags. Example override:

```json
{
  "ingestion-service": "ghcr.io/rpjweez/delivery-reference-platform-release-packages/fieldsignal@sha256:..."
}
```

This selects ingestion-service from that verified candidate, preserving its original
source/provenance. Other components remain from the baseline. Compatibility labels and
configuration contracts must match. The new combination still requires its own QA.

## Release designation and separate CD

Promotion verifies the candidate/image evidence, trusted external certification, current
policy, expiry and the issuer's protected eligibility ledger. It atomically allocates
`delivery-release/<release-id>` without overwriting an existing ID. Compatible retries
preserve the original designation. The successful release attestation is the completion
signal; a tag alone does not establish eligibility.

The companion's existing QA predicate is not certification. Its legacy workflow also
repackages dependencies; it is not the new exact-candidate CD integration. The descriptor
names the required future `certify.yml` issuer contract, but that issuer/ledger is **not
activated by this change**. Replace its revision with the reviewed real certification
workflow revision before enabling promotion; do not treat the recorded companion baseline
revision as evidence that such a workflow exists. Promotion fails closed until a real
trusted certificate and current eligible ledger entry exist.

Separate CD consumes exact package/release digests, performs deployment and runtime QA,
and owns reviewed environment configuration plus observed health. Candidate-to-release
designation differs from environment promotion of a release/config pair. Neither changes
images or rebuilds a chart. See [release protocol](release-protocol.md).

## Activation and recovery

See [topology implementation status](pipeline-topology-implementation.md) and the shared
[bootstrap guide](https://github.com/RPJWeez/pipelines/blob/codex/deliberate-delivery-topology/bootstrap/README.md).
Configure protected main and fixed environments `delivery-dev`, `delivery-release` and
`delivery-promotion`, scoped identities, protected release tags, registry retention and
certification access. Require review of `.delivery` policy and workflow changes. No live
protection/environment/registry settings are changed by this implementation.

The initial profile is GitHub.com/Enterprise Cloud, GHCR, ephemeral hosted Ubuntu,
linux/amd64, Bake and Helm. It accepts up to 256 checks/components and a 4 GiB payload
(2 GiB per archive); larger/multiarch/private-dependency profiles need tested adapters.
Durable images/charts/evidence stay in OCI; Actions diagnostics expire independently.
Retain every image and evidence object referenced by a retained candidate/release.
Existing pinned legacy workflows and candidate verification remain available for rollback;
downstream consumers must explicitly adopt the new package-v2 signer/predicate contract.
