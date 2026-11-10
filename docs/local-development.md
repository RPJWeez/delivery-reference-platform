# Local development

Prerequisites: Java 21, Node 22.12+, Docker, Python 3 and Helm 3. The Maven Wrapper pins Maven; Nx delegates to Maven/npm and does not use Nx Cloud.

```sh
npm ci
make infra
make build
make dev
```

Consoles: 127.0.0.1:5173 and :5174. APIs: :8081 and :8082. Local PostgreSQL: :55432. Kafka: :9092 (container listener kafka:19092). Vite routes local API calls; it is not Apigee.

After Java edits, rebuild and restart. Frontends reload; rebuild the shared UI package with `npx nx build @rpjweez/fieldsignal-ui` after UI TypeScript edits. Ctrl-C stops the dev launcher and its children.

```sh
make verify
make test-java
npm run typecheck
npm run test:functional
make smoke
python3 tools/simulate.py --count 9
make infra-down
```

Java tests use H2 for transactions/idempotency. The smoke test uses real APIs/Kafka; qualification sets FIELDSIGNAL_TEST_NAMESPACE to replay through Kubernetes instead of Compose. Business-functional tests use the two running browser consoles.

Local credentials and test data are synthetic. APIs bind to loopback unless configured otherwise. Production uses secret references and environment configuration. The local Compose named volumes survive `make infra-down`; initialization SQL only runs for an empty PostgreSQL volume.

Local development may compile source-linked libraries. Published image builds resolve explicit released library versions. The deployment repository tests published candidate artifacts without rebuilding them.
