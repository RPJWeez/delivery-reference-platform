# Architecture

FieldSignal is one releasable application per source repository. Java application-private
modules compile in Maven's reactor; npm workspaces link private source libraries. There
is no independent internal-library publication or version-adoption workflow.

Maven/npm own compilation and dependency resolution. Nx selects affected projects and
orchestrates native checks. CI verifies Java modules with their private source dependencies
using Maven `-am`. The local whole-reactor verification task is uncached so nested module
edits cannot be missed; native Maven still performs incremental compilation.

Application repositories own source, native build manifests, Docker/Bake definitions,
Helm templates, contracts and business tests. The shared pipeline owns execution,
publication, provenance checks and release mechanics. It reads the existing declarations
instead of requiring another application descriptor or service inventory.

A package contains the complete Helm chart and exact image digest references. Image bytes
remain in the registry. Dev packages come from selected branch commits; release candidates
come from main. Composition can select existing images from older candidates and produces
a new complete chart without rebuilding those images.

Separate CD deploys a selected immutable package. QA tests that exact combination of
components and configuration. A release owner reviews the QA run and approves the candidate
as a GitHub Release. Promotion preserves the candidate digest and does not deploy it.
Shared workflow versions and artifact verification are maintained by the platform.

Runtime configuration is reviewed separately. Deployment must verify actual rollout health;
a merge or successful publication is not runtime success. Recovery selects retained artifacts
and configuration, and must account for database and event compatibility.
