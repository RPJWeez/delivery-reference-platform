group "application" { targets = ["api", "worker"] }
target "api" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["ghcr.io/harbor/tide/api:proof"]
}
target "worker" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["ghcr.io/harbor/tide/worker:proof"]
}
