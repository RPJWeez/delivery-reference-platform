# ADR 0001: application-level qualification and promotion

Status: accepted; supersedes the initial team-scoped release-unit prototype.

FieldSignal's business capabilities span components. Components build and publish independently, but release qualification and promotion select the complete application composition. One Argo Application per environment manages that composition. Team ownership remains a development/review concern.

A standard packaged Helm candidate contains exact image selections and vendored shared-chart templates. The deployment repository pins its OCI digest and environment values. Qualification evidence is cryptographically bound to the candidate. Native Maven/npm/Nx configuration replaces the custom build catalog and impact engine.

This improves coherent functional testing without claiming instantaneous runtime cutover. Contracts and database/event evolution must remain compatible across rolling deployment and supported rollback windows.
