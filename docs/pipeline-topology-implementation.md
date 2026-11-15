# Deliberate delivery topology implementation

Implemented 2026-11-15 on review branches; no main merge, cluster deployment, live protection
changes or registry-policy changes are included.

## Delivered

- Shared read-only validation with branch/PR deduplication, merge-queue support and explicit
  aggregate checks; legacy reusable workflow retained for existing callers.
- Manual dev/release package creation, exact commit resolution and separate credential-free
  build/inspection and fresh publication jobs. Dev declarations may evolve on branches;
  application identity and trust policy remain controlled by main.
- Immutable candidate composition with explicit component overrides, original producer
  evidence and declared compatibility checks; no independent latest-image selection.
- Candidate-to-release designation with current certification/eligibility verification,
  atomic release-ID allocation and idempotent retry records; no chart/image rebuilding.
- Versioned descriptor and artifact contracts, bootstrap/doctor tooling, non-Nx and chart-only
  fixtures, explicit support limits and activation/recovery/upgrade documentation.
- FieldSignal thin callers and descriptor, synchronized verification pin, and regression fix
  for workspace-root Maven inputs that previously selected Java work for frontend edits.

## Verification

Shared local suite: 76 regressions, formatting and workflow lint passed. The linter has
narrow exemptions for documented GitHub Cloud exact-self-checkout contexts and `$/`
self-repository workflow syntax. Local Docker OCI export with pinned SBOM scanner,
recursive blob verification, architecture checks and Helm packaging passed without registry
publication. FieldSignal's 8 workspace/graph/chart regressions passed inside the existing
Java/Node verification container. Modified application files pass formatting; the full
application formatting check reports 10 pre-existing issues in untouched files. Hosted CI results are recorded in the implementation
handoff after the final pinned commit is tested.

## Activation gates and explicit deferrals

- Retain/merge shared pipeline changes, then review/merge application callers and confirm
  required check contexts. No production capability is inferred from source tests.
- Configure protected main; `delivery-dev`, `delivery-release`, `delivery-promotion`
  environments; tag protections; scoped identities and OCI retention/evidence policy.
- Migrate downstream verification to package-v2 evidence and the new reusable signer.
  Preserve old verification for retained rollback candidates.
- Implement/connect the companion's exact-candidate QA and certification issuer plus
  protected eligibility ledger. The current companion has only legacy qualification;
  the descriptor's certify.yml integration is intentionally fail-closed until configured
  with a reviewed real issuer revision. Do not replace certification with legacy QA.
- Observe real protected dev/release publication, composition, signing, promotion/retries,
  unauthorized dispatch rejection, OCI-only recovery and registry retention acceptance.
- Automatic unchanged-image reuse, mutable latest discovery, multiarch/large-artifact and
  private-dependency adapters remain deferred. New shared caches are disabled pending
  demonstrated trust isolation. Composition can reuse existing images explicitly.

These are integration/activation gates, not silently bypassed checks. Separate CD still owns
Kubernetes access, environment pairing, runtime qualification and deployment health.
