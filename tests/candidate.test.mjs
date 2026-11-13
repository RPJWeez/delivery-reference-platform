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
