import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseAllDocuments } from "yaml";

function affected(file, target) {
  return JSON.parse(
    execFileSync(
      process.execPath,
      [
        "node_modules/.bin/nx",
        "show",
        "projects",
        "--affected",
        `--files=${file}`,
        `--with-target=${target}`,
        "--json",
      ],
      {
        encoding: "utf8",
        env: { ...process.env, NX_DAEMON: "false" },
      },
    ),
  ).sort();
}

test("Java source edits select one service through the inferred Maven graph", () => {
  assert.deepEqual(
    affected(
      "apps/ingestion-service/src/main/java/io/fieldsignal/ingestion/ReadingStore.java",
      "mvn-verify",
    ),
    ["io.fieldsignal:ingestion-service"],
  );
});
test("shared measurements reach both Java consumers transitively", () => {
  const projects = affected(
    "libraries/measurements/src/main/java/io/fieldsignal/measurements/RiverLevel.java",
    "mvn-verify",
  );
  assert(projects.includes("io.fieldsignal:ingestion-service"));
  assert(projects.includes("io.fieldsignal:incident-service"));
});
test("shared UI selects both applications through npm dependencies", () => {
  assert.deepEqual(affected("libraries/ui/src/index.tsx", "build"), [
    "@fieldsignal/operator-console",
    "@fieldsignal/station-console",
    "@rpjweez/fieldsignal-ui",
  ]);
});
test("contract changes select the consuming service and frontend", () => {
  assert(
    affected("contracts/apis/readings/openapi.yaml", "container").includes(
      "@fieldsignal/station-console",
    ),
  );
  assert(
    affected("contracts/apis/readings/openapi.yaml", "container").includes(
      "io.fieldsignal:ingestion-service",
    ),
  );
});
test("shared chart renders workloads and native Kubernetes configuration", () => {
  const rendered = execFileSync(
    "helm",
    [
      "template",
      "fieldsignal",
      "charts/application",
      "-f",
      "charts/application/ci/values.yaml",
    ],
    { encoding: "utf8" },
  );
  const resources = parseAllDocuments(rendered).map((d) => d.toJSON());
  assert.equal(resources.filter((r) => r.kind === "Deployment").length, 2);
  const frontend = resources.find(
    (r) =>
      r.kind === "Deployment" && r.metadata.name.endsWith("example-frontend"),
  );
  assert.equal(
    frontend.spec.template.spec.containers[0].readinessProbe.httpGet.path,
    "/healthz",
  );
  assert.equal(
    frontend.spec.template.spec.containers[0].env[0].value,
    "fieldsignal-example-service:8080",
  );
});
test("shared chart rejects mutable image tags", () => {
  assert.throws(() =>
    execFileSync(
      "helm",
      [
        "template",
        "fieldsignal",
        "charts/application",
        "-f",
        "charts/application/ci/values.yaml",
        "--set",
        "workloads.example-service.image=ghcr.io/example/service:latest",
      ],
      { stdio: "pipe" },
    ),
  );
});
test("build tools and hosted workflows do not depend on Nx Cloud", () => {
  assert.equal(JSON.parse(readFileSync("nx.json")).neverConnectToCloud, true);
});
