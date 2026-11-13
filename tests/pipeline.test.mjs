import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { parse } from "yaml";
const root = process.cwd();
function temporary(run) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "pipeline-test-"));
  try {
    return run(cwd);
  } finally {
    fs.rmSync(cwd, { recursive: true, force: true });
  }
}
function write(cwd, file, value) {
  fs.mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
  fs.writeFileSync(path.join(cwd, file), value);
}
const run = (cwd, script, args = [], env = {}) =>
  execFileSync(process.execPath, [path.join(root, script), ...args], {
    cwd,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
test("a second application selects changed components, consumers, chart and shared inputs", () =>
  temporary((cwd) => {
    const fixture = JSON.parse(
      fs.readFileSync("tests/fixtures/portable-app/workspace.json"),
    );
    fixture["nx.json"].targetDefaults = JSON.parse(
      fs.readFileSync("nx.json"),
    ).targetDefaults;
    for (const [file, value] of Object.entries(fixture))
      write(
        cwd,
        file,
        typeof value === "string" ? value : JSON.stringify(value),
      );
    fs.symlinkSync(
      path.join(root, "node_modules"),
      path.join(cwd, "node_modules"),
      "dir",
    );
    const affected = (file, target) =>
      JSON.parse(
        run(
          cwd,
          "node_modules/.bin/nx",
          [
            "show",
            "projects",
            "--affected",
            `--files=${file}`,
            `--with-target=${target}`,
            "--json",
          ],
          { NX_DAEMON: "false" },
        ),
      ).sort();
    assert.deepEqual(affected("services/booking/source.txt", "container"), [
      "booking-api",
    ]);
    assert.deepEqual(affected("modules/rates/source.txt", "container"), [
      "booking-api",
    ]);
    assert.deepEqual(affected("modules/rates/source.txt", "publish-maven"), [
      "pricing-core",
    ]);
    assert.deepEqual(affected("deploy/shared/values.yaml", "chart-package"), [
      "harbor-chart",
    ]);
    assert.deepEqual(affected("README.md", "container"), []);
    assert.deepEqual(affected("pipeline/settings.json", "container"), [
      "booking-api",
      "tracking-api",
    ]);
  }));
test("summary preserves partial publication and planning reasons after failure", () =>
  temporary((cwd) => {
    write(
      cwd,
      ".work/results/plan.json",
      JSON.stringify({
        kind: "plan",
        base: "abc",
        reason: "last-successful-main-workflow",
        reasons: { "booking-api": "booking-api → pricing-core" },
      }),
    );
    run(cwd, "tools/pipeline/report.mjs", [
      "record",
      "pricing-core",
      "maven",
      "published",
      "https://registry.example/harbor",
      "2.0.0",
      "sha256:123",
    ]);
    run(cwd, "tools/pipeline/report.mjs", ["summary"], {
      GITHUB_SHA: "def",
      JOB_RESULTS: JSON.stringify({
        "publish-java": { result: "success" },
        "publish-images": { result: "failure" },
      }),
    });
    const report = JSON.parse(
      fs.readFileSync(path.join(cwd, ".work/run-report.json")),
    );
    assert.equal(report.results[0].outcome, "published");
    assert.equal(report.plan.base, "abc");
    const markdown = fs.readFileSync(
      path.join(cwd, ".work/summary.md"),
      "utf8",
    );
    assert.match(markdown, /Images ❌/);
    assert.match(markdown, /2\.0\.0/);
    assert.match(markdown, /booking-api → pricing-core/);
  }));
test("all workflow YAML parses and publication stays gated by validation", () => {
  for (const file of ["ci.yml", "java-evidence.yml"])
    parse(fs.readFileSync(`.github/workflows/${file}`, "utf8"));
  for (const action of ["setup", "qualify", "publish-chart"])
    parse(fs.readFileSync(`.github/actions/${action}/action.yml`, "utf8"));
  const { jobs } = parse(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
  assert.equal(jobs.report.if, "always()");
  for (const name of [
    "publish-java",
    "publish-npm",
    "publish-images",
    "publish-chart",
  ])
    assert(jobs[name].needs.includes("ci"));
});
test("registry scopes do not redirect third party dependencies", () =>
  temporary((cwd) => {
    write(
      cwd,
      "tools/pipeline/config.json",
      JSON.stringify({ npmRegistry: "https://registry.example" }),
    );
    write(cwd, "package.json", JSON.stringify({ workspaces: ["modules/*"] }));
    write(
      cwd,
      "modules/widgets/package.json",
      JSON.stringify({
        name: "@harbor/widgets",
        publishConfig: { registry: "https://registry.example" },
        dependencies: { "@external/util": "1.0.0" },
      }),
    );
    run(cwd, "tools/pipeline/npm-scopes.mjs", [], {
      NPM_CONFIG_USERCONFIG: path.join(cwd, "npmrc"),
    });
    const config = fs.readFileSync(path.join(cwd, "npmrc"), "utf8");
    assert.match(config, /@harbor:registry=https:\/\/registry.example/);
    assert.doesNotMatch(config, /@external/);
  }));
test("release retention repairs missing assets and refuses conflicting immutable bytes", () =>
  temporary((cwd) => {
    write(
      cwd,
      "bin/gh",
      `#!/usr/bin/env node
const fs=require('fs'),path=require('path');const a=process.argv.slice(2);const store=process.env.STORE;const state=path.join(store,'release');
if(a[1]==='view'){if(!fs.existsSync(state))process.exit(1);if(a.includes('--json')){const name=a.at(-1).match(/== "([^"]+)"/)[1];if(fs.existsSync(path.join(store,name)))console.log(name);}}
if(a[1]==='create')fs.writeFileSync(state,'exists');
if(a[1]==='upload')fs.copyFileSync(a[3],path.join(store,path.basename(a[3])));
if(a[1]==='download')fs.copyFileSync(path.join(store,a[a.indexOf('--pattern')+1]),path.join(a[a.indexOf('--dir')+1],a[a.indexOf('--pattern')+1]));
`,
    );
    fs.chmodSync(path.join(cwd, "bin/gh"), 0o755);
    const env = {
      ...process.env,
      PATH: `${cwd}/bin:${process.env.PATH}`,
      STORE: cwd,
      GITHUB_SHA: "abc",
      GITHUB_SERVER_URL: "https://github.com",
      GITHUB_REPOSITORY: "harbor/app",
    };
    write(cwd, "assets/package.jar", "immutable");
    const invoke = (files) =>
      execFileSync(
        "bash",
        [
          path.join(root, "tools/pipeline/retain-release.sh"),
          "package-v1",
          ...files,
        ],
        { cwd, env, stdio: "pipe" },
      );
    invoke(["assets/package.jar"]);
    write(cwd, "assets/package.cdx.json", "sbom");
    invoke(["assets/package.jar", "assets/package.cdx.json"]);
    assert.equal(
      fs.readFileSync(path.join(cwd, "package.cdx.json"), "utf8"),
      "sbom",
    );
    invoke(["assets/package.jar"]);
    write(cwd, "assets/package.jar", "different");
    assert.throws(() => invoke(["assets/package.jar"]));
  }));

test("main baseline retries failed publication ranges and bootstraps only when history is empty", () =>
  temporary((cwd) => {
    write(cwd, "bin/gh", '#!/bin/sh\nprintf "%s" "$SUCCESS_SHA"\n');
    fs.chmodSync(path.join(cwd, "bin/gh"), 0o755);
    const invoke = (extra) =>
      execFileSync("bash", [path.join(root, "tools/pipeline/select-base.sh")], {
        cwd,
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${cwd}/bin:${process.env.PATH}`,
          GITHUB_REPOSITORY: "harbor/app",
          PR_BASE: "",
          ...extra,
        },
      }).trim();
    assert.equal(invoke({ PR_BASE: "pr-target" }), "pr-target pr-target");
    assert.equal(
      invoke({ SUCCESS_SHA: "last-complete-success" }),
      "last-complete-success last-successful-main-workflow",
    );
    assert.match(
      invoke({ SUCCESS_SHA: "" }),
      /^[a-f0-9]+ bootstrap-empty-tree$/,
    );
  }));
