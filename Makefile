.PHONY: verify test-java build dev infra infra-down smoke functional
verify:
	npm run test:workspace
	helm lint charts/application -f charts/application/ci/values.yaml

test-java:
	npx nx run-many -t mvn-verify

build:
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

functional:
	npm run test:functional
