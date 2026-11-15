# Application release protocol

1. A contributor changes source/native manifests and runs `make verify`. Branch and PR
   CI run affected native checks, workspace checks and non-publishing container proofs.
2. A developer may manually create a dev package from their branch. Trusted main resolves
   its exact commit, validates/builds it and publishes complete dev images/chart/evidence.
   Separate dev CD selects and deploys that immutable package.
3. Merging to main runs complete validation only. It does not publish images or a chart.
4. A release owner manually creates a release candidate from main. One operation validates
   the exact commit, builds/publishes the complete image inventory, binds exact digests into
   the app-owned chart and publishes signed package evidence. It ends at **QA pending**.
   A partial upload or failed attestation is not a complete handoff.
5. Alternatively, compose a candidate from an explicit existing baseline and component
   overrides. Verify each image's original trusted producer and declared compatibility;
   record chart source, original component revisions and composition reason. No rebuilds.
6. Separate QA/CD verifies and deploys the exact candidate/configuration in its test
   environment and records candidate-specific runtime evidence. Certification independently
   checks that evidence, current policy and vulnerability requirements and issues an
   expiring signed decision on the same candidate digest. Mixed-component candidates
   require qualification of the resulting combination.
7. The source repository's manual **Promote candidate to release** workflow checks that
   certificate and the issuer's current protected eligibility ledger. It atomically reserves
   a unique release ID and signs a designation of the same candidate digest. It does not
   copy/repackage the chart, rebuild images, modify environment config or deploy.
8. Separate environment promotion selects the released digest and an existing reviewed
   configuration commit. CD rechecks current eligibility, revocation and configuration
   compatibility, then GitOps reconciles desired state. Deployment/observed health is a
   separate result and must be serialized through health confirmation.
9. Recovery selects a compatible retained release/configuration pair and rechecks current
   eligibility and data/contract compatibility. Rollback does not reverse data or external
   events, and an old certificate cannot bypass a current revocation.

The new source workflows implement artifact production, composition and release-designation
consumption. The legacy companion does not yet implement the new exact-candidate
qualification/certification producer and eligibility ledger. That CD integration and live
protection/registry activation are required before claiming a working protected release path.
See [implementation status](pipeline-topology-implementation.md) for executed checks and gates.
