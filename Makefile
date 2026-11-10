.PHONY: verify test-java build dev infra infra-down smoke
MAVEN ?= mvn
verify:
	python3 -m unittest discover -s tests -v
	helm lint charts/application
	python3 tools/delivery.py values releases/examples/sensing.json > /tmp/application-monorepo-values.json
	helm template sensing charts/application -f /tmp/application-monorepo-values.json > /tmp/application-monorepo-rendered.yaml

test-java:
	$(MAVEN) --batch-mode --no-transfer-progress verify

build:
	$(MAVEN) --batch-mode --no-transfer-progress package
	npm run build

dev:
	python3 tools/dev.py

infra:
	docker compose -f infra/local/compose.yaml up -d --wait postgres kafka
	docker compose -f infra/local/compose.yaml run --rm kafka-init

infra-down:
	docker compose -f infra/local/compose.yaml down

smoke:
	python3 tools/smoke.py
