.PHONY: verify test-java build dev stop infra infra-down smoke functional
verify:
	docker compose run --build --rm verify

test-java:
	npx nx run fieldsignal:java-verify

build:
	npm run build

dev:
	docker compose up --build -d

stop:
	docker compose stop

infra:
	docker compose -f infra/local/compose.yaml up -d --wait postgres kafka
	docker compose -f infra/local/compose.yaml run --rm kafka-init

infra-down:
	docker compose -f infra/local/compose.yaml down

smoke:
	python3 tools/smoke.py

functional:
	npm run test:functional
