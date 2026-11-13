# Candidate publication

Protected source-main CI publishes a complete application candidate. Internal Maven/npm
publication has been retired after maintainer confirmation of no external consumers.
Historical registry packages, Releases and compatible rollback closures are preserved.

Bake's application group is build authority; Helm is runtime authority. Native build
metadata supplies exact image digests. Candidate assembly rejects incomplete/extra
outputs, hand-selected images and rendered image drift. Every image must have trusted
source/workflow/revision-bound provenance and SBOM evidence. Candidate publication
waits for all image evidence and records **published, QA pending, certification pending**.
A chart references registry images; it does not contain or copy their bytes.

A run/attempt assigns the standard Helm package version. Images use commit/run/attempt
tags and are consumed by digest. Retries before a candidate exists may leave inert image
fragments; they cannot qualify or promote. A new build attempt has a separate identity.
After publication, QA/certification can retry the same candidate without rebuilding.
The existing immutable Helm/release-retention adapter repairs missing evidence and
refuses conflicting bytes. Registry authentication failures fail the pipeline.

BuildKit emits per-platform provenance and SBOMs; supplemental image inventories and
signed evidence remain retained with registry/Release artifacts. The chart carries build
metadata and an application-owned environment schema. Certification scans the exact
images against current security data; image build success alone is not runtime or
security qualification. Initial supported runtime coverage is linux/amd64.

GHCR packages may need public read visibility and explicit Actions write access for the
companion repository's QA/certification evidence. These live permissions are not changed
by repository code. No artifacts are deleted or moved to separate certified storage.
