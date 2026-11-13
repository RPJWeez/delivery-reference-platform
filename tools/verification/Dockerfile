FROM node:22.22.0-bookworm-slim@sha256:dd9d21971ec4395903fa6143c2b9267d048ae01ca6d3ea96f16cb30df6187d94 AS node
FROM maven:3.9.16-eclipse-temurin-21@sha256:99e61abcff91a9b1333463bd8451fb18495d6eba9250ac66a338b518f8278320
# Maven wrapper verifies its pinned ZIP; do not silently switch archive formats.
RUN apt-get update && apt-get install -y --no-install-recommends unzip git jq && rm -rf /var/lib/apt/lists/*
COPY --from=node /usr/local/ /usr/local/
ARG TARGETARCH
RUN curl -fsSL https://get.helm.sh/helm-v3.18.4-linux-${TARGETARCH}.tar.gz -o /tmp/helm-v3.18.4-linux-${TARGETARCH}.tar.gz && curl -fsSL https://get.helm.sh/helm-v3.18.4-linux-${TARGETARCH}.tar.gz.sha256sum -o /tmp/helm.sha256 && cd /tmp && sha256sum -c helm.sha256 && tar -xzf helm-v3.18.4-linux-${TARGETARCH}.tar.gz && install linux-${TARGETARCH}/helm /usr/local/bin/helm
WORKDIR /workspace
COPY . .
RUN npm ci
ENV NX_DAEMON=false NX_NO_CLOUD=true
CMD ["sh", "-ec", "npm run test:workspace && npx nx run fieldsignal:java-verify && npx nx run-many -t build typecheck --parallel=2"]
