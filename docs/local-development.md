# Local development

Requires Java 21, Maven 3.9+, Node 22.12+, npm, Docker Compose and Python 3. Helm 3 is needed for delivery checks.

```sh
make infra
npm ci
make build
make dev
```

`make dev` runs built Java JARs and Vite servers. Backend changes require rebuilding and restarting; frontend edits reload automatically. After shared UI TypeScript edits, run `npm run build --workspace @fieldsignal/ui`. Ctrl-C stops the launcher and its child processes.

| Address | Purpose |
| --- | --- |
| `http://127.0.0.1:5173` | Station console |
| `http://127.0.0.1:5174` | Operator console |
| `http://127.0.0.1:8081/api/readings` | Submission and latest 100 observations |
| `http://127.0.0.1:8082/api/incidents` | Latest 100 incidents and acknowledgment |
| `/actuator/health/readiness` on either API | Readiness |
| `127.0.0.1:55432` | PostgreSQL |
| `127.0.0.1:9092` | Kafka external listener |

Vite proxies route to the corresponding API; this is not an Apigee emulator. Container clients use Kafka's `kafka:19092` listener.

```sh
make verify
make test-java
npm run typecheck
make smoke
python3 tools/simulate.py --count 9
```

Java transaction tests use H2 compatibility mode and do not replace PostgreSQL/Kafka integration tests. The smoke test persists synthetic readings, verifies the real asynchronous projection, and checks retry/conflict/acknowledgment behavior. Fresh UUIDs make repeated runs safe.

Environment overrides: `PORT`, `BIND_ADDRESS`, `DATABASE_URL`, `DATABASE_USER`, `DATABASE_PASSWORD`, `KAFKA_BOOTSTRAP_SERVERS`. Defaults bind to loopback with local-only credentials. Production requires secret references, authentication and scoped identities.

`make infra-down` stops containers and retains named volumes. Initialization SQL runs only on an empty PostgreSQL data volume; editing it does not update an existing database. Use migrations or deliberately reset disposable data. Never reuse local credentials outside this stack.

The local reactor uses snapshot versions and unsigned development artifacts. Published immutable versions and verified promotion are a separate milestone.
