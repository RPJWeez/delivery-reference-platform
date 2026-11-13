// Native complete application image group; CI supplies one run/attempt tag.
variable "REGISTRY" { default = "ghcr.io/fieldsignal/local" }
variable "BUILD_TAG" { default = "source" }
group "application" {
  targets = ["ingestion-service", "incident-service", "station-console", "operator-console"]
}
target "station-console" {
  context = "."
  dockerfile = "apps/station-console/Dockerfile"
  tags = ["${REGISTRY}/station-console:${BUILD_TAG}"]
}
target "operator-console" {
  context = "."
  dockerfile = "apps/operator-console/Dockerfile"
  tags = ["${REGISTRY}/operator-console:${BUILD_TAG}"]
}
target "incident-service" {
  context = "."
  dockerfile = "apps/incident-service/Dockerfile"
  tags = ["${REGISTRY}/incident-service:${BUILD_TAG}"]
}
target "ingestion-service" {
  context = "."
  dockerfile = "apps/ingestion-service/Dockerfile"
  tags = ["${REGISTRY}/ingestion-service:${BUILD_TAG}"]
}
