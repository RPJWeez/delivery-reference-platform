# Implementation roadmap and acceptance evidence

Work in vertical slices. Keep delivered and proposed capabilities distinguishable in the README and demonstrations.

| Milestone | Deliverable | Acceptance evidence | Status |
| --- | --- | --- | --- |
| 0 | Architecture, dependency catalog, release policy, common chart | Offline tests reject mutable/cross-team/partial release inputs; Helm renders only selected workloads | Foundation implemented |
| 1 | FieldSignal: two Java services, shared Java libraries, Kafka, two React apps + UI package | A user action crosses API → persisted state/outbox → Kafka → consumer → second UI; replay does not duplicate effects | Implemented and verified locally |
| 2 | Selective PR CI and trusted artifact builds | A service edit selects one build; shared lib selects consumers; published artifacts have verified signatures/provenance/SBOM | Selective CI implemented; trusted publication planned |
| 3 | Versioned library/chart/schema/proxy/config/release publishing | Registry evidence verifies every artifact kind; repeat version publication is refused | Planned |
| 4 | Local Kubernetes deployment and promotion | Digest-pinned bundle deploys to team namespace; injected readiness failure rolls back; other namespace's pod hashes stay unchanged | Planned |
| 5 | Cloud/OIDC, Apigee, production policy | Restricted identities, protected environments, proxy revision promotion and recorded deployment evidence | Planned |
| 6 | Portfolio narrative and repeatable demonstration | Recorded scenario, architecture decisions, timing results, failure evidence and cost teardown instructions | Planned |

## Portfolio demonstration script

1. Show a real user workflow and the service/event ownership map.
2. Open a team-scoped change and explain the affected build set.
3. Show a shared library change selecting multiple consumers without deploying them.
4. Inspect a published digest, its SBOM and signed provenance; verify expected builder identity.
5. Reject an unrelated workload in a release proposal and reject an unsigned artifact.
6. Promote a release; show another team's workloads remain unchanged.
7. Inject a readiness failure; show rollback and its recorded evidence.
8. Make a backward-incompatible event change and show contract checks reject it.

Do not claim SLSA levels, reproducibility, zero downtime or production readiness without evidence for the relevant requirements.
