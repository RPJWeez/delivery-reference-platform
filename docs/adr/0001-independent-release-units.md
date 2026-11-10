# ADR 0001: independent release units in one application repository

Status: accepted for the reference architecture.

## Context

Multiple teams share libraries and platform tooling. Deploying the entire repository at HEAD risks promoting unrelated changes. One deployment per microservice cannot represent a small team-owned feature that needs a common rollback boundary.

## Decision

Maintain an explicit component graph and separate team-owned release units. A release is a complete manifest of immutable artifact selections for one unit, installed as one Helm release. Shared charts are published independently and pinned by digest. Shared libraries trigger consumer builds but do not trigger consumer deployment.

## Consequences

Teams can promote independently and retain old artifact selections. A release unit must stay small enough to be operated and rolled back by one owner. Contracts must tolerate mixed runtime versions. Helm recovery is bounded to managed Kubernetes resources. Multi-team distributed transactions and global release trains are deliberately outside this boundary.

## Alternatives considered

One application-wide Helm release couples teams and enlarges blast radius. One release per service is appropriate for fully independent services, but loses a shared recovery boundary when several workloads truly form one feature set. A GitOps controller can implement the same manifest model later; adopting one does not eliminate artifact verification or define atomicity by itself.
