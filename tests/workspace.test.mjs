import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  statSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { parseAllDocuments } from "yaml";

test("affected publication has the history needed to compare commits", () => {
  const workflow = parseAllDocuments(
    readFileSync(".github/workflows/ci.yml", "utf8"),
  )[0].toJSON();
  for (const job of Object.values(workflow.jobs)) {
    if (!job.steps?.some((step) => step.run?.includes("nx affected"))) continue;
    const checkout = job.steps.find((step) =>
      step.uses?.startsWith("actions/checkout@"),
    );
    assert.equal(checkout?.with?.["fetch-depth"], 0);
  }
});

test("chart SBOM inventories the packaged artifact as a directory", () => {
  const action = parseAllDocuments(
    readFileSync(".github/actions/publish-chart/action.yml", "utf8"),
  )[0].toJSON();
  const inventory = action.runs.steps.find((step) => step.id === "inventory");
  const scanner = action.runs.steps.find((step) =>
    step.uses?.startsWith("anchore/sbom-action@"),
  );
  const directory = mkdtempSync(join(tmpdir(), "fieldsignal-chart-inventory-"));
  try {
    execFileSync("helm", [
      "package",
      resolve("charts/application"),
      "--destination",
      directory,
    ]);
    const archive = join(
      directory,
      readdirSync(directory).find((name) => name.endsWith(".tgz")),
    );
    execFileSync("bash", ["-c", inventory.run], {
      cwd: directory,
      env: { ...process.env, ARCHIVE: archive },
    });
    const scanPath = join(directory, scanner.with.path);
    assert(statSync(scanPath).isDirectory());
    assert.equal(
      readFileSync(join(scanPath, "application/Chart.yaml"), "utf8"),
      execFileSync("tar", ["-xOzf", archive, "application/Chart.yaml"], {
        encoding: "utf8",
      }),
    );
    assert(
      !readdirSync(join(scanPath, "application")).includes("project.json"),
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

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
