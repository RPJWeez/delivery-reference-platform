# Component publication

## Existing components

The protected main workflow publishes only affected components selected by Nx. Maven/npm define dependency edges; per-project targets describe artifact types. Publishing does not promote application releases.

Images use `sha-<commit>-<run>-<attempt>` versions and immutable digest references. Maven/npm/chart packages use explicit versions from their standard manifests. Bump a version before changing an already published package. The publishing adapters reject different content under an existing coordinate, and allow identical retries. Shared library dependency pins are explicit; no release consumes `SNAPSHOT` or `latest`.

GitHub Actions uses its scoped workflow token for package publishing. Public Maven packages still require authentication for local reads; configure a read-only package token in Maven settings when resolving published dependencies locally. Never commit that token. Local reactor development does not require publishing first.

Images get per-platform BuildKit SBOM/provenance, GitHub provenance/SBOM attestations, and a keyless Cosign signature on the OCI index digest. Java/npm artifacts get GitHub provenance and SBOM attestations, with copies retained in GitHub Releases. Charts are checked for coordinate reuse, published to OCI, attested and signed. No SLSA level is claimed.

## Adding a component

- **Java:** create a normal module/POM and add it to the Maven reactor. Give it its own version and explicit library dependency versions. Nx discovers its Maven tasks/dependencies. A deployable adds a Dockerfile and native Nx `container` target; a library adds the native `publish-maven` target using the existing adapter. No pipeline service list changes.
- **React:** create a Vite workspace under apps/, with standard build/typecheck scripts and exact package dependencies. Add its Dockerfile and native Nx container target. The npm workspace glob discovers it.
- **Library:** add its normal Maven/npm manifest. Use the appropriate existing publication target and increment package/dependent versions deliberately.
- **Contract:** declare native Nx implicitDependencies for API/event consumption that cannot be inferred from imports.

A newly published service does not automatically become part of FieldSignal. Add it to an application candidate and extend business-functional tests when its capability requires them.

## Package visibility and retention

GitHub may initially create granular packages as private even when source is public. Set the demo's packages public before anonymous Argo pulls. Never change token scopes or visibility automatically merely to bypass a failed pull.

Do not publish PR builds to long-lived package coordinates. Retain qualified/promoted candidates and all referenced component versions/evidence. Temporary reports use native Actions retention. Registry cleanup starts as a report, not deletion; public storage currently removes the need for aggressive garbage collection.

See [pipeline operation](pipeline.md) for the run report, exact SBOM retention policy, retry behavior, and template configuration. Maven/npm/chart SBOM files are retained as component/run/attempt release assets; image SBOM files have per-component run releases.
