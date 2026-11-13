# Migration progress

Branch: refactor/application-release-gitops. Main is protected by PRs and the ci check, with zero required approvals for this solo reference project.

## Implemented

- Native Nx Maven/npm graph and affected tasks, explicit native contract relationships.
- Maven Wrapper 3.9.16 with checksum; Nx 24.0.6 and Maven analyzer 0.0.19; TypeScript 5.9.3 compatibility pin; Nx Cloud disabled.
- Seven passing workspace/Helm tests; Nx execution of Java tests, frontend builds and typechecks verified locally.
- Independent component versions, published-dependency image builds, immutable-coordinate checks, package/image/chart publication and signed provenance/SBOM workflows.
- Shared chart runtime env/secret references, non-root Java/frontend images, real browser functional scenario and Kubernetes replay support.
- Reusable qualification action using pinned Argo CD 3.6.1, disposable kind, published candidate digest and signed qualification input record.
- Removed handwritten catalog/impact/renderer and custom team release format.

## In progress

- Source migration PR #6 merged after passing required CI.
- First main publication run 43438584158: CI and npm publication/evidence passed; Maven failed because its checkout lacked the Nx base commit; chart upload succeeded but SBOM inventory incorrectly used an archive as a directory. Images were skipped. Fix branch adds full publication history and inventories the extracted, selected chart archive. Remote retry remains pending merge.
- Main run 43443284515 verified those fixes: Maven publication and library evidence passed, chart SBOM/provenance passed. Chart signing was blocked by an older Cosign installer requesting a removed detached-signature asset; parent-POM evidence used the Nx name instead of Maven coordinates. Follow-up updates the chart/image installer to v4.0.0 and reads evidence coordinates from the POM (including inherited group IDs). The actual upstream installer downloaded and verified Cosign 3.1.4 locally; publication regression checks and workflow lint pass. Remote signing/image publication remain unverified pending merge.
- Main run 43444919362: chart publication/signing, npm publication and all Maven evidence jobs passed. All four image builds/uploads and SBOM scans succeeded, but saving the image SBOM failed because its output directory `.work/` did not exist in those jobs. Follow-up writes the SBOM directly in the workspace and updates its attestation input. Image attestations/signing remain unverified pending merge.
- Deployment repository candidate/qualification/promotion configuration and tests.
- End-to-end candidate qualification and promotion/recovery evidence.

The initial application slice and original CI were verified before this migration (see Git history). Do not confuse implemented workflow code with completed remote publication or qualification; evidence is recorded as each step succeeds.

Local verification uses the temporary Temurin 21.0.13+9 toolchain in /tmp/fieldsignal-toolchain and Maven cache /tmp/fieldsignal-m2. No system Java installation, paid runner, cloud cluster or Apigee instance is created.
