# Contract policy

`ReadingRecorded.v1` is owned by Sensing and consumed by Response. Its Kafka key is `stationId`; its globally unique `eventId` is the client-supplied reading ID. This slice emits an incident per elevated observation, rather than maintaining one evolving flood incident per station. Out-of-order readings therefore do not overwrite a newer station state. Aggregation and incident correlation are later capabilities.

Compatible changes add optional fields while preserving existing semantics. New required fields, removed fields, unit changes, narrower accepted ranges or changed event meaning require a new major contract/topic and a consumer migration window. Consumers ignore unknown additive fields and reject unsupported major schema versions. The Java constructor enforces envelope and measurement invariants.

The JSON Schema and OpenAPI descriptions are versioned source contracts. Automated schema compatibility and consumer contract gates are still planned; checking in a schema alone is not compatibility enforcement.

The Response listener retries failures twice, then sends the raw record to `fieldsignal.reading-recorded.v1.DLT`. Recovery fails if DLT publication fails. Database outages can also exhaust the retry budget and send valid records to DLT. An operational replay tool, access controls and retention policy are required before production use. The current simulator submits normal readings through the HTTP ingress; it is not a privileged DLT replay tool.
