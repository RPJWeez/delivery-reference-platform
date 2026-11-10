# FieldSignal application plan

Monitor synthetic river-level stations, identify elevated observations and coordinate a response. Station operators submit observations through one React app; response operators review and acknowledge incidents through another. A simulator supplies traffic without physical devices or external providers.

The rules are transparent: below 3.0 meters is normal, at least 3.0 meters is watch, and at least 4.5 meters is critical. These are demonstration thresholds, not hydrological guidance.

## Ownership

| Team     | Current deployables                    | Shared inputs                                               | Future capabilities                                        |
| -------- | -------------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------- |
| Sensing  | `ingestion-service`, `station-console` | Event model, measurements, UI, readings API/event contracts | Device registry, authenticated ingestion, calibration      |
| Response | `incident-service`, `operator-console` | Event model, measurements, UI, incident API/event contracts | Rules engine, correlated incidents, notifications          |
| Platform | Common chart and delivery tools        | Catalog, trust and release policy                           | Signed publication, verification, promotion, observability |

Services have separate database users and databases. The application candidate is the complete intended state of all backends and frontends. Library changes rebuild consumers; UI package changes rebuild both frontends. Neither implies automatic deployment.

## First slice

1. Submit a timestamped reading with a client-generated UUID.
2. Validate identifier, range, precision and envelope; reject observations more than 60 seconds in the future.
3. Persist the reading and outbox row in one transaction. Identical retries return the existing reading; a changed payload under the same ID returns HTTP 409.
4. The scheduled publisher locks pending rows, sends to Kafka keyed by station, and marks them sent after broker acknowledgment. A crash before database commit can cause redelivery.
5. The consumer inserts one incident per elevated reading. Replays neither duplicate incidents nor erase acknowledgment state.
6. Operators review and acknowledge incidents. Consoles poll every three seconds and display connection failures instead of mock data.
7. Failed records exhaust a bounded retry budget and go to a dead-letter topic. Operational replay and alerting remain planned.

This slice does not aggregate observations into one incident per station. That later feature needs event-time windows, lateness policy and lifecycle semantics. Arrival order must not substitute for observation order.

## Target growth

- **Device registry service:** device identity, station metadata and calibration history; Sensing.
- **Rules service or stream processor:** versioned rules, windowed detection and replay comparison; Response.
- **Field-work service:** assignments and investigation resolution; a new Field Operations team.
- **Notification worker:** synthetic provider adapter, bounded retries and provider-failure isolation.
- **Scheduled aggregation job:** daily summaries in an independently built CronJob image.
- **Public status frontend:** delayed summaries through a separate read model, exercising public/private gateway routing.

Add each when its demonstration scenario requires it. This gives several Java services, event consumers, scheduled jobs, frontends, shared packages, schemas, gateway bundles and Helm releases with distinct responsibilities.

## Delivery demonstrations

Change incident behavior without rebuilding ingestion. Change measurements and rebuild both consumers without automatically releasing either. Update UI and select only one team's new frontend. Promote identical artifact digests through environments. Break readiness and observe bounded rollback. Send malformed events and observe DLT recovery. Reject incompatible schemas once automated contract gates are installed.
