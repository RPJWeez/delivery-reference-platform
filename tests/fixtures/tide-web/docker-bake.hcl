group "application" { targets = ["status"] }
target "status" {
  context = "."
  dockerfile = "Dockerfile"
  tags = ["ghcr.io/harbor/tide-web/status:proof"]
}
