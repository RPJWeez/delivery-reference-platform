import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
export function verifyObserved(
  application,
  pods,
  expected,
  reference,
  revision,
) {
  assert.equal(application.status?.sync?.status, "Synced");
  assert.equal(application.status?.health?.status, "Healthy");
  assert.equal(
    application.spec.sources[0].repoURL,
    `oci://${reference.split("@")[0]}`,
  );
  assert.equal(
    application.spec.sources[0].targetRevision,
    reference.split("@")[1],
  );
  assert.equal(application.spec.sources[1].targetRevision, revision);
  assert.deepEqual(
    application.status.sync.revisions,
    [reference.split("@")[1], revision],
    "observed sync revisions differ",
  );
  assert(pods.items.length, "no observed application pods");
  const images = [];
  for (const pod of pods.items) {
    assert.equal(pod.status.phase, "Running");
    assert(
      pod.status.containerStatuses?.length,
      "missing runtime image identities",
    );
    assert(
      pod.status.containerStatuses.every((s) => s.ready && s.imageID),
      "runtime containers must be ready with image identities",
    );
    images.push(...pod.spec.containers.map((c) => c.image));
    // An unreviewed init container is also part of the deployed application.
    images.push(...(pod.spec.initContainers || []).map((c) => c.image));
  }
  assert.deepEqual(
    [...new Set(images)].sort(),
    [...new Set(expected)].sort(),
    "observed runtime image set differs from candidate",
  );
  return `sha256:${createHash("sha256")
    .update(
      JSON.stringify({
        application: application.status.sync,
        pods: pods.items.map((p) => ({
          uid: p.metadata.uid,
          images: p.status.containerStatuses.map((s) => s.imageID),
        })),
      }),
    )
    .digest("hex")}`;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const get = (...args) =>
    JSON.parse(execFileSync("kubectl", args, { encoding: "utf8" }));
  const app = get(
    "get",
    "application",
    process.env.APPLICATION,
    "-n",
    "argocd",
    "-o",
    "json",
  );
  const pods = get(
    "get",
    "pods",
    "-n",
    process.env.QUALIFICATION_NAMESPACE,
    "-l",
    `app.kubernetes.io/instance=${process.env.RELEASE_NAME}`,
    "-o",
    "json",
  );
  const expected = fs
    .readFileSync(process.env.EXPECTED_IMAGES, "utf8")
    .trim()
    .split("\n");
  const observedDigest = verifyObserved(
    app,
    pods,
    expected,
    process.env.REFERENCE,
    process.env.DEPLOYMENT_REVISION,
  );
  fs.mkdirSync(".work", { recursive: true });
  fs.writeFileSync(
    ".work/observed.json",
    JSON.stringify(
      {
        candidate: process.env.REFERENCE,
        observedDigest,
        application: app.status.sync,
        pods: pods.items.map((p) => ({
          name: p.metadata.name,
          uid: p.metadata.uid,
          containers: p.status.containerStatuses,
        })),
      },
      null,
      2,
    ),
  );
}
