import { test } from "node:test";
import assert from "node:assert/strict";
import { bindImages } from "../tools/pipeline/candidate.mjs";
const fixture = () => ({
  bake: {
    group: { application: { targets: ["api", "worker"] } },
    target: {
      api: { tags: ["ghcr.io/harbor/tide/api:run-1"] },
      worker: { tags: ["ghcr.io/harbor/tide/worker:run-1"] },
    },
  },
  metadata: Object.fromEntries(
    ["api", "worker"].map((name) => [
      name,
      {
        "containerimage.digest": `sha256:${"a".repeat(64)}`,
        "buildx.build.ref": `builder/${name}/1`,
        "buildx.build.provenance": {
          buildType: "https://mobyproject.org/buildkit@v1",
          materials: [
            {
              uri: "pkg:docker/python@pinned",
              digest: { sha256: "d".repeat(64) },
            },
          ],
        },
      },
    ]),
  ),
  values: {
    application: {
      workloads: {
        api: { image: "BUILD_OUTPUT" },
        consumer: { image: "BUILD_OUTPUT:worker" },
        schedule: { image: "BUILD_OUTPUT:worker" },
      },
    },
  },
  identity: {
    repository: "harbor/tide",
    source: "b".repeat(40),
    run: "1",
    attempt: "2",
    workflow: "harbor/tide/.github/workflows/ci.yml@refs/heads/main",
    toolchain: { node: "22" },
  },
});
const bind = (f) => bindImages(f.bake, f.metadata, f.values, f.identity);
test("native image metadata binds complete runtime roles and records distinct attempts", () => {
  const f = fixture();
  const first = bind(f);
  assert.match(
    first.values.application.workloads.schedule.image,
    /worker@sha256:/,
  );
  f.identity.attempt = "3";
  assert.notDeepEqual(bind(f).build, first.build);
});
for (const [name, mutate] of [
  ["missing image", (f) => delete f.metadata.api],
  ["extra image", (f) => (f.metadata.extra = f.metadata.api)],
  [
    "partial publication",
    (f) => delete f.metadata.api["containerimage.digest"],
  ],
  [
    "missing native provenance",
    (f) => delete f.metadata.api["buildx.build.provenance"],
  ],
  ["missing builder", (f) => delete f.metadata.api["buildx.build.ref"]],
  [
    "unused image",
    (f) => {
      delete f.values.application.workloads.consumer;
      delete f.values.application.workloads.schedule;
    },
  ],
  [
    "unbuilt workload",
    (f) => (f.values.application.workloads.other = { image: "BUILD_OUTPUT" }),
  ],
  [
    "image override",
    (f) =>
      (f.values.application.workloads.api.image = `ghcr.io/evil/api@sha256:${"a".repeat(64)}`),
  ],
  [
    "mutable output",
    (f) => (f.metadata.api["containerimage.digest"] = "latest"),
  ],
  ["missing attempt", (f) => delete f.identity.attempt],
])
  test(`candidate rejects ${name}`, () => {
    const f = fixture();
    mutate(f);
    assert.throws(() => bind(f));
  });

test("rendered runtime inventories reject template injection and omission", async () => {
  const { validateRendered } = await import("../tools/pipeline/candidate.mjs");
  const image = `ghcr.io/tide/api@sha256:${"a".repeat(64)}`;
  const doc = (image) =>
    `apiVersion: apps/v1\nkind: Deployment\nspec:\n  template:\n    spec:\n      containers:\n        - image: ${image}\n`;
  assert.doesNotThrow(() =>
    validateRendered(doc(image), { images: { api: image } }),
  );
  assert.throws(() =>
    validateRendered(doc("evil:latest"), { images: { api: image } }),
  );
  assert.throws(() => validateRendered("", { images: { api: image } }));
});

test("complete candidate wrapper packages and renders without weakening image or global schema policy", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const os = await import("node:os");
  const { execFileSync } = await import("node:child_process");
  const { parse, stringify } = await import("yaml");
  const { validateRendered } = await import("../tools/pipeline/candidate.mjs");
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "candidate-helm-"));
  const helm = (...args) =>
    execFileSync("helm", args, {
      cwd: directory,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  try {
    fs.cpSync("charts", path.join(directory, "charts"), { recursive: true });
    const chart = path.join(directory, "charts/fieldsignal");
    const values = parse(
      fs.readFileSync(path.join(chart, "values.yaml"), "utf8"),
    );
    const names = Object.keys(values.application.workloads);
    const bake = {
      group: { application: { targets: names } },
      target: Object.fromEntries(
        names.map((name) => [
          name,
          { tags: [`ghcr.io/example/app/${name}:proof`] },
        ]),
      ),
    };
    const metadata = Object.fromEntries(
      names.map((name, index) => [
        name,
        {
          ...fixture().metadata.api,
          "containerimage.digest": `sha256:${String(index + 1).repeat(64)}`,
        },
      ]),
    );
    const bound = bindImages(bake, metadata, values, fixture().identity);
    fs.writeFileSync(path.join(chart, "values.yaml"), stringify(bound.values));
    fs.writeFileSync(
      path.join(chart, "build.json"),
      JSON.stringify(bound.build),
    );
    helm("dependency", "build", "--skip-refresh", chart);
    helm("lint", chart);
    const version = "0.0.43529193233-attempt.2";
    helm("package", chart, "--version", version, "--destination", directory);
    const archive = path.join(directory, `fieldsignal-${version}.tgz`);
    validateRendered(helm("template", "candidate", archive), bound.build);
    assert.equal(parse(helm("show", "chart", archive)).version, version);
    const contents = execFileSync("tar", ["-tzf", archive], {
      encoding: "utf8",
    });
    assert.match(contents, /fieldsignal\/build.json/);
    assert.match(contents, /fieldsignal\/environment.schema.json/);
    assert.match(contents, /fieldsignal\/charts\/application\//);
    for (const override of [
      "global.image=ghcr.io/evil/app:latest",
      `application.workloads.${names[0]}.image=ghcr.io/evil/app:latest`,
    ]) {
      assert.throws(
        () => helm("template", "candidate", archive, "--set", override),
        (error) => {
          assert.match(
            error.stderr,
            /Additional property image|does not match pattern/i,
          );
          return true;
        },
      );
    }
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
