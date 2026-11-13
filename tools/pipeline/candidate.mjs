import assert from "node:assert/strict";
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { parse, parseAllDocuments, stringify } from "yaml";

const digestPattern = /^sha256:[a-f0-9]{64}$/;
// Bake is build authority. Helm is runtime authority. This adapter only binds them.
export function bindImages(bake, metadata, values, identity) {
  const targets = bake.group?.application?.targets;
  assert(
    Array.isArray(targets) && targets.length > 0,
    "native application group required",
  );
  assert.equal(
    new Set(targets).size,
    targets.length,
    "duplicate application targets",
  );
  assert.deepEqual(
    Object.keys(metadata).sort(),
    [...targets].sort(),
    "incomplete or extra build outputs",
  );
  const workloads = values.application?.workloads;
  assert(
    workloads && Object.keys(workloads).length,
    "runtime workloads required",
  );
  // An image may be shared by roles by using the same native build tag placeholder.
  const expected = new Map(
    targets.map((name) => {
      const tags = bake.target[name]?.tags;
      assert.equal(
        tags?.length,
        1,
        "one immutable publication tag per application target",
      );
      assert.match(tags[0], /^ghcr\.io\/[a-z0-9._/-]+:[a-zA-Z0-9_.-]+$/);
      const digest = metadata[name]["containerimage.digest"];
      assert.match(
        digest,
        digestPattern,
        `missing completed image output: ${name}`,
      );
      assert(
        metadata[name]["buildx.build.ref"],
        "native builder reference required",
      );
      const provenance = metadata[name]["buildx.build.provenance"];
      assert.equal(
        provenance?.buildType,
        "https://mobyproject.org/buildkit@v1",
        "native build provenance required",
      );
      assert(provenance.materials?.length, "resolved build materials required");
      assert(
        provenance.materials.every(
          (material) =>
            material.uri &&
            Object.values(material.digest || {}).some((digest) =>
              /^[a-f0-9]{40,64}$/.test(digest),
            ),
        ),
        "immutable build material identities required",
      );
      return [name, `${tags[0].slice(0, tags[0].lastIndexOf(":"))}@${digest}`];
    }),
  );
  assert.match(identity.source, /^[a-f0-9]{40}$/);
  assert.match(identity.repository, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
  for (const key of ["run", "attempt", "workflow", "toolchain"])
    assert(identity[key], `missing ${key}`);
  const used = new Set();
  const result = structuredClone(values);
  for (const [name, workload] of Object.entries(result.application.workloads)) {
    const target =
      workload.image === "BUILD_OUTPUT"
        ? name
        : workload.image.replace(/^BUILD_OUTPUT:/, "");
    assert(
      workload.image === "BUILD_OUTPUT" ||
        workload.image === `BUILD_OUTPUT:${target}`,
      "manual image selection forbidden",
    );
    assert(
      expected.has(target),
      `runtime workload lacks build output: ${name}`,
    );
    workload.image = expected.get(target);
    used.add(target);
  }
  assert.deepEqual(
    [...used].sort(),
    [...targets].sort(),
    "unused build output",
  );
  return {
    values: result,
    build: {
      schemaVersion: 1,
      ...identity,
      images: Object.fromEntries(expected),
      metadata,
    },
  };
}

export function validateRendered(rendered, build) {
  const images = [];
  for (const doc of parseAllDocuments(rendered)) {
    const resource = doc.toJSON();
    if (!resource) continue;
    const pod =
      resource.kind === "Pod"
        ? resource.spec
        : resource.kind === "CronJob"
          ? resource.spec.jobTemplate.spec.template.spec
          : resource.spec?.template?.spec;
    if (pod)
      images.push(
        ...[...(pod.containers || []), ...(pod.initContainers || [])].map(
          (c) => c.image,
        ),
      );
  }
  assert.deepEqual(
    [...new Set(images)].sort(),
    [...new Set(Object.values(build.images))].sort(),
    "rendered image closure differs from native build outputs",
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  if (process.argv[2] === "render") {
    validateRendered(
      fs.readFileSync(process.argv[3], "utf8"),
      JSON.parse(fs.readFileSync(process.argv[4], "utf8")),
    );
    process.exit(0);
  }
  const [bakeFile, metadataFile, valuesFile, output] = process.argv.slice(2);
  const readJSON = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
  const identity = {
    repository: process.env.GITHUB_REPOSITORY,
    source: process.env.GITHUB_SHA,
    run: process.env.GITHUB_RUN_ID,
    attempt: process.env.GITHUB_RUN_ATTEMPT,
    workflow: process.env.GITHUB_WORKFLOW_REF,
    toolchain: readJSON("tools/pipeline/config.json"),
  };
  const bound = bindImages(
    readJSON(bakeFile),
    readJSON(metadataFile),
    parse(fs.readFileSync(valuesFile, "utf8")),
    identity,
  );
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(`${output}/values.yaml`, stringify(bound.values));
  fs.writeFileSync(
    `${output}/build.json`,
    JSON.stringify(bound.build, null, 2) + "\n",
  );
}
