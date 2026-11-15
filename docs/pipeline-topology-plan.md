# Delivery pipeline topology implementation plan

Status: implementation design, 2026-11-15. Source implementation and remaining hosted/CD
activation gates are recorded in [implementation status](pipeline-topology-implementation.md).
No live policy changes are included. Shared implementation belongs in RPJWeez/pipelines; this repository
is the first consumer. Deployment and runtime qualification remain separate.

## Intended topology

| Application entry point      | Trigger/source                                              | Result                                                                                                               |
| ---------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Validate                     | Branch pushes, PRs, main merges                             | Native checks and optional non-publishing container proof                                                            |
| Create dev package           | Manual; selected same-repository branch commit              | Immutable dev chart, images and evidence; no deployment                                                              |
| Create release candidate     | Manual workflow on protected main; exact main source commit | Validate, build/publish complete images, compose immutable candidate                                                 |
| Compose release candidate    | Manual workflow on protected main                           | Complete candidate from a trusted baseline and explicit component overrides; no builds                               |
| Promote candidate to release | Manual workflow on protected main                           | Signed release designation referencing an existing qualified candidate digest; no rebuild, repackaging or deployment |

Retain main validation, but remove automatic image/candidate publication on merge.
Avoid duplicate push/PR validation while retaining a stable required aggregate check
and correct merge-queue validation if enabled. Branch publication is explicit, never
an automatic consequence of running untrusted PR code.

## Ownership and reusable interfaces

Expose thin application callers over centrally maintained reusable workflows. Share
planning, native execution, image publication, package assembly, evidence verification,
reporting and release designation as internal primitives. Image publication is not a
required separate human action. Both package workflows orchestrate it and assembly.

Applications own native commands, dependency graph, image declarations, packaging
templates, configuration schema and business qualification hooks. Platform owns the
artifact schemas, adapters, trust enforcement, workflow mechanics and bootstrap tooling.
Organization policy owns trusted identities, release branches, allowed registries,
qualification requirements, approval roles and retention. Application-controlled YAML
must not weaken organization requirements.

Start with existing Nx/native-command, Bake and Helm adapters. Define versioned adapter
contracts for discovery, validation, image output and package output. Nx is optional;
non-Nx callers may provide native commands and explicit image ownership. Unknown ownership
builds conservatively. Do not promise arbitrary builders, registries, Git hosts or package
formats before adapter conformance tests exist. Current GitHub.com/Enterprise Cloud
support must remain explicit; GitHub Enterprise Server is a separate compatibility gate.

No application-specific service lists, namespaces, endpoints, credentials or QA scripts
belong in shared workflow code. Support chart-only applications and dynamic image counts;
handle empty matrices and document/chunk GitHub matrix limits rather than silently truncating.

## Artifact and source contracts

Define versioned, machine-validated manifests before workflow extraction:

- Image set: application identity, dev/release trust class, exact source repository/SHA,
  workflow and pipeline revision, run/attempt, complete image inventory, immutable digests,
  platform architectures, original image provenance and evidence references.
- Package/candidate: immutable chart digest, chart source SHA, complete image inventory,
  configuration schema, component source revisions, baseline and overrides, composition
  reason and pipeline identity. Mixed-source candidates have no misleading single build SHA.
- Release designation: candidate digest, release identifier, policy version and verified
  qualification/certification evidence, actor, timestamp and any supersession/revocation.

Use OCI registry manifests/evidence for durable delivery records; Actions artifacts are
diagnostic conveniences and Actions/Nx/BuildKit caches are disposable acceleration.
Every consumer verifies digest and trust rather than trusting a mutable discovery tag.
Discover defaults only within the same application and trust class, then resolve once
to a digest. Fail closed if an explicitly requested object is absent or untrusted.

Initial release-candidate creation builds every application image using caches. Optional
automatic unchanged-image reuse is a later phase, not required for this topology.
Composition defaults to a complete successful release image set, never independent
per-component latest tags. Overrides select a component from a verified prior set or
an allowed digest with equivalent evidence. Record original provenance and require
qualification of the resulting combination. Dev artifacts cannot enter release by default.

## Trust and execution boundaries

Resolve branch/ref inputs once to an immutable SHA and preserve it across every job.
Release operations execute trusted workflow definitions on protected main and validate
the selected source is on the configured release branch. Default source is current main;
historical main commits require explicit policy support. Being an ancestor is insufficient
if current policy disallows old source or pipeline revisions.

Dev workflow definitions execute from protected main while checking out the selected
branch as build input. Fork inputs are unsupported initially. Branch code is untrusted:
run native builds without release credentials, OIDC issuance or sensitive network access;
use ephemeral isolated runners/builders and dev-only publication identities/storage.
Separate build and credentialed publishing steps/jobs with validated output boundaries;
do not execute branch-provided scripts during credentialed publication. Never use
pull_request_target to execute contributor code with privileged credentials.

Use narrowly scoped permissions, pinned shared workflows/toolchains, independently
verified caller/source/signer identities and protected release authorization. GitHub
workflow-dispatch branch selection alone is not enforcement. Validate branch restrictions
and protected-environment rules before credential access or release mutations.

Serialize mutable default pointers per application/trust class and release identifiers.
Use unique immutable run/attempt outputs, idempotent retry semantics and conflict rejection.
Only completed, verified inventory advances a default pointer; retries use exact outputs
from a compatible prior attempt rather than claiming partial publication succeeded.
Retention must preserve every image and evidence referenced by retained dev packages,
candidates and releases; cleanup is a separate policy-driven operation.

Dev and release caches require separate namespaces and writer identities. Release builds
must never restore dev-produced caches; cache hits cannot replace trusted build evidence.
Private build dependencies need an explicit supported access profile: approved read-only,
short-lived access through a broker/proxy with bounded repository/endpoint scope. Branch
code can observe credentials supplied to it, so secret masking is not isolation. Document
the residual exposure and never supply release or broad enterprise credentials. Include
a private-dependency hosted fixture before claiming that onboarding profile is supported.

The adapter contract must declare required components, supported architectures, contract
versions, configuration schema and chart/component constraints. Composition checks these
declarations and rejects known incompatibilities; runtime/semantic compatibility requires
qualification of the assembled candidate. Include compatible and incompatible mixed-version
fixtures. The initial OCI profile must specify authentication, digest retention, evidence
storage/referrer support or tested fallback, and atomic/concurrency-safe pointer updates.

Bootstrap deliverables include concrete minimal Nx, non-Nx and chart-only descriptors and
callers with required/optional fields marked. Version descriptor schemas and adapter APIs;
publish a supported upgrade window, pin migration/rollback instructions and a clean-app
upgrade fixture. Platform owns schema evolution; app owners review their pinned upgrades.

## Promotion and CD contract

Resolve the existing companion protocol before adding a new promotion implementation.
It currently includes QA, protected certification and a reviewed candidate/config pairing.
Keep qualification/certification with the companion or an enterprise evidence service.
The source-repo promotion caller verifies those external signed results against the exact
candidate and current policy, then publishes a release designation. It does not issue a
second competing certification or alter environment configuration.

Name the operations separately: candidate-to-release designation versus environment
promotion of a release/config pair. CD verifies current release eligibility, config
compatibility and revocation before deployment. Deployment success/observed health is
reported by CD and cannot be inferred from package publication or designation.
Rollback selects retained digests and rechecks current policy; it does not reverse data.

## Implementation sequence and acceptance

1. **Contracts and policy:** approve schemas, trust classes, ownership, release-branch
   semantics and companion evidence interface. Inventory existing consumers/signers.
   Acceptance: fixture manifests validate and incompatible or missing evidence is rejected.
2. **Correct validation:** reproduce/fix Java over-selection for station-console changes,
   add a regression for the exact one-line case, retain conservative shared-input behavior.
   Separate validation from publication and preserve required check contexts.
   Acceptance: UI-only, Java library, contract, Dockerfile and shared-config cases select
   expected work; main validates without writes; optional merge queue works.
3. **Extract reusable primitives:** preserve existing reporting, SBOM/signing, complete
   image closure and immutable handoff behavior. Add registry/toolchain settings and
   validated adapter outputs. Acceptance: existing regressions plus a second application
   with different names, image counts and a non-Nx build pass without shared-code edits.
4. **Manual package creation:** add main-only release creation and trusted-control-plane
   dev creation. Both publish images and charts in one operation. Acceptance: real hosted
   dev and release publications, no cluster access, cross-trust rejection, branch/SHA
   stability, rejected non-main release dispatch and no credentials exposed to branch code.
5. **Composition:** add baseline lookup and explicit overrides, chart-only operation and
   complete inventory verification. Acceptance: older-component composition, incompatible
   contracts/schema rejected where mechanically detectable, new qualification required,
   missing image/evidence or partial baseline cannot publish a complete candidate.
6. **Release designation:** integrate companion evidence and protected approval, immutable
   release identifiers and current policy/expiry/revocation checks. Acceptance: exact
   candidate retained, no rebuilding/repackaging, unauthorized/stale evidence rejected,
   repeat promotion idempotent and conflicting identifier reuse rejected.
7. **Bootstrap and rollout:** provide versioned caller templates, a minimal app descriptor,
   local preflight/doctor, permissions/environment/registry setup guide, policy examples,
   upgrade guide and recovery runbook. Bootstrap two clean apps including non-Nx and
   chart-only fixtures. Stage platform changes, app pins, required checks and downstream
   trust migrations in order; keep historical candidate verification and rollback support.
8. **Optional reuse optimization:** only after measurement, add sound build-input
   fingerprints, pinned external materials and verified ancestor baseline reuse. Test
   pipeline/toolchain/base-image changes, absent baselines, concurrent runs and expiry.

Cross-cutting acceptance includes failed/cancelled matrices, partial pushes, lost caches,
registry outages, retry after image success/chart failure, moving branches, concurrent
publication, pointer races, retention, digest substitution and cross-application confusion.
Conformance is tested centrally; app onboarding should require declarations/callers and
business tests, not copied pipeline scripts. Hosted acceptance is required before claiming
an enterprise capability; fixture success alone is insufficient.

## Additional acceptance requirements from independent review

- Dispatch privileged workflows on protected main, passing build branch/SHA as data,
  not as the dispatch ref. Prove a modified branch workflow cannot become the privileged
  control plane. Pin all third-party actions to immutable commits as well.
- Publishers/signers use fresh isolated runners. Validate transferred archive/manifest
  paths, symlinks and sizes; never execute downloaded build content. Dev and release
  signers must have independently enforceable identities.
- Record image producer and package composer separately: original run/attempt, caller
  workflow repository/path/SHA, reusable workflow revision, event/ref and builder identity.
  Composition retries preserve the original image producer evidence.
- Actions concurrency is load control, not a durable FIFO lock. Default pointers and
  release identifiers require storage-side conditional updates/unique constraints or a
  tested single-writer service. Stale/cancelled/superseded runs cannot advance pointers.
  If the registry cannot safely support discovery updates, require explicit immutable
  baseline references until a supported discovery index exists.
- Test zero and more than 256 projects/images with a supported batching strategy or an
  actionable preflight rejection. Keep reusable workflow nesting shallow and validate
  the complete generated graph against the supported GitHub profile limits.
- Prove dev-cache poisoning cannot affect release builds, failed/cancelled image matrices
  never become defaults, and retained candidates remain recoverable after Actions
  artifacts expire or originating runs are deleted. Exercise actual registry policies.
- Rewrite README, pipeline operation and release protocol during activation: their
  current merge-time publication descriptions document existing behavior, not this
  proposed topology. Distinguish release designation from companion environment promotion.

## Delivery slices

Deliver phases 1–4 first for deliberate dev/release package production. Composition and
release designation follow with their evidence integration. Automatic image reuse is
separate. Implementation spans pipelines, this app, bootstrap templates and companion
consumer contracts; no live approval settings or CD activation are implied by this plan.

## Independent pressure test

Two bounded reviews used gpt-6-luna with high reasoning: one for portability/onboarding,
one for delivery correctness and trust. Both judged the topology sound. Their actionable
findings have been incorporated: private dependency access, cache isolation, composition
constraints, registry capabilities, schema upgrades, trusted dispatch, publisher isolation,
producer/composer provenance, conditional pointer updates, scale limits, storage recovery
and coordinated documentation migration. This is a design review, not certification or
evidence that the future workflows have passed hosted acceptance.
