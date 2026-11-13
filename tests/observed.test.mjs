import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyObserved } from "../tools/pipeline/observe-qa.mjs";
const digest = `sha256:${"a".repeat(64)}`,
  reference = `ghcr.io/tide/api@${digest}`,
  revision = "b".repeat(40),
  image = `ghcr.io/tide/api@${digest}`;
const fixture = () => ({
  app: {
    spec: {
      sources: [
        { repoURL: "oci://ghcr.io/tide/api", targetRevision: digest },
        { targetRevision: revision },
      ],
    },
    status: {
      sync: { status: "Synced", revisions: [digest, revision] },
      health: { status: "Healthy" },
    },
  },
  pods: {
    items: [
      {
        metadata: { uid: "pod-1" },
        spec: { containers: [{ image }] },
        status: {
          phase: "Running",
          containerStatuses: [
            { ready: true, imageID: "containerd://sha256:runtime" },
          ],
        },
      },
    ],
  },
});
test("runtime observation binds actual ready pods to candidate/config pair", () => {
  const f = fixture();
  assert.match(
    verifyObserved(f.app, f.pods, [image], reference, revision),
    /^sha256:/,
  );
});
for (const [name, mutate] of [
  [
    "concurrent config sync",
    (f) => (f.app.status.sync.revisions[1] = "c".repeat(40)),
  ],
  [
    "old artifact running",
    (f) => (f.app.status.sync.revisions[0] = `sha256:${"c".repeat(64)}`),
  ],
  ["unhealthy rollout", (f) => (f.app.status.health.status = "Progressing")],
  ["missing pods", (f) => (f.pods.items = [])],
  [
    "wrong image",
    (f) =>
      (f.pods.items[0].spec.containers[0].image = "ghcr.io/evil/api:latest"),
  ],
  [
    "unready pod",
    (f) => (f.pods.items[0].status.containerStatuses[0].ready = false),
  ],
  [
    "injected init image",
    (f) => (f.pods.items[0].spec.initContainers = [{ image: "evil" }]),
  ],
])
  test(`reject observed ${name}`, () => {
    const f = fixture();
    mutate(f);
    assert.throws(() =>
      verifyObserved(f.app, f.pods, [image], reference, revision),
    );
  });
