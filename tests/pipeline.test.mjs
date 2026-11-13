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
function isolatedEnvironment(cwd, overrides = {}) {
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) =>
        !/^(GITHUB_|GH_|RUNNER_|ACTIONS_|NX_|NODE_TEST_)/.test(name) &&
        name !== "NODE_AUTH_TOKEN",
    ),
  );
  return {
    ...env,
    NX_DAEMON: "false",
    NX_NO_CLOUD: "true",
    GITHUB_STEP_SUMMARY: path.join(cwd, ".work/github-summary.md"),
    GITHUB_OUTPUT: path.join(cwd, "output"),
    NPM_CONFIG_USERCONFIG: path.join(cwd, "npmrc"),
    ...overrides,
  };
}
const run = (cwd, script, args = [], env = {}) =>
  execFileSync(process.execPath, [path.join(root, script), ...args], {
    cwd,
    encoding: "utf8",
    env: isolatedEnvironment(cwd, env),
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
        schemaVersion: 1,
        run: {
          repository: "local",
          id: "local",
          attempt: "1",
          sha: "local",
          event: "local",
        },
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
      JOB_RESULTS: JSON.stringify({
        "publish-java": { result: "success" },
        "publish-images": { result: "failure" },
        ci: { result: "failure" },
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
    assert.match(markdown, /Validation failed/);
    assert.match(markdown, /2\.0\.0/);
    assert.match(markdown, /Depends on changed project: pricing-core/);
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
      ...isolatedEnvironment(cwd),
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
          ...isolatedEnvironment(cwd),
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

// Reproduce the runner environment that originally redirected fixture output
// into GitHub's real step summary and made the local summary assertion fail.
test("summary tests leave GitHub runner files untouched", () =>
  temporary((cwd) => {
    const runnerSummary = path.join(cwd, "runner-summary.md");
    const runnerOutput = path.join(cwd, "runner-output");
    fs.writeFileSync(runnerSummary, "runner summary sentinel\n");
    fs.writeFileSync(runnerOutput, "runner output sentinel\n");
    const output = execFileSync(
      process.execPath,
      [
        "--test",
        "--test-name-pattern=^summary preserves partial publication",
        path.join(root, "tests/pipeline.test.mjs"),
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...isolatedEnvironment(cwd),
          GITHUB_STEP_SUMMARY: runnerSummary,
          GITHUB_OUTPUT: runnerOutput,
          GITHUB_EVENT_NAME: "pull_request",
          GITHUB_RUN_ID: "real-run",
          GITHUB_RUN_ATTEMPT: "4",
          GITHUB_SHA: "real-commit",
          NX_BASE: "runner-base",
          NX_HEAD: "runner-head",
        },
      },
    );
    assert.match(output, /ok \d+ - summary preserves partial publication/);
    assert.equal(
      fs.readFileSync(runnerSummary, "utf8"),
      "runner summary sentinel\n",
    );
    assert.equal(
      fs.readFileSync(runnerOutput, "utf8"),
      "runner output sentinel\n",
    );
  }));
function planFixture(cwd, env, fields = {}) {
  write(
    cwd,
    ".work/results/plan.json",
    JSON.stringify({
      schemaVersion: 1,
      run: {
        repository: "local",
        id: "local",
        attempt: "1",
        sha: "local",
        event: env.GITHUB_EVENT_NAME || "local",
      },
      kind: "plan",
      base: "base-commit",
      head: "merge-commit",
      reason:
        env.GITHUB_EVENT_NAME === "pull_request"
          ? "pr-target"
          : "last-successful-main-workflow",
      files: ["services/booking/source.txt"],
      direct: ["booking-api"],
      selected: { images: ["booking-api"], libraries: [], npm: [], chart: [] },
      validation: { java: ["booking-api"], build: [], typecheck: [] },
      reasons: { "booking-api": "booking-api" },
      ...fields,
    }),
  );
}
test("PR summary states validation only and rejects publication claims", () =>
  temporary((cwd) => {
    const env = {
      GITHUB_EVENT_NAME: "pull_request",
      JOB_RESULTS: JSON.stringify({
        ci: { result: "failure" },
        validate: { result: "failure" },
        "publish-images": { result: "skipped" },
      }),
    };
    planFixture(cwd, env);
    run(
      cwd,
      "tools/pipeline/report.mjs",
      [
        "record",
        "pricing-core",
        "maven",
        "published",
        "https://registry.example/harbor",
        "2.0.0",
      ],
      env,
    );
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    const report = JSON.parse(
      fs.readFileSync(path.join(cwd, ".work/run-report.json")),
    );
    const markdown = fs.readFileSync(
      path.join(cwd, ".work/summary.md"),
      "utf8",
    );
    assert.equal(report.results.length, 0);
    assert.match(markdown, /# Pull request checks — Validation failed/);
    assert.match(markdown, /Publishing disabled/);
    assert.match(markdown, /No packages, images, or charts were published/);
    assert.doesNotMatch(
      markdown,
      /pricing-core|registry.example|## Publication|Artifact results/,
    );
    assert.match(markdown, /Files changed in this project/);
  }));
test("main summary distinguishes blocked work from uncertain publication", () =>
  temporary((cwd) => {
    const env = {
      GITHUB_EVENT_NAME: "push",
      JOB_RESULTS: JSON.stringify({
        ci: { result: "failure" },
        "publish-images": { result: "skipped" },
      }),
    };
    planFixture(cwd, env);
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    const markdown = fs.readFileSync(
      path.join(cwd, ".work/summary.md"),
      "utf8",
    );
    assert.match(markdown, /Not attempted: validation did not pass/);
    assert.doesNotMatch(markdown, /Publication unconfirmed/);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(cwd, ".work/run-report.json")))
        .results.length,
      0,
    );
  }));
test("stale publication results cannot appear in another run or attempt", () =>
  temporary((cwd) => {
    const env = {
      GITHUB_EVENT_NAME: "push",
      JOB_RESULTS: JSON.stringify({ ci: { result: "success" } }),
    };
    planFixture(cwd, env, {
      selected: {},
      reasons: {},
      validation: {},
      files: [],
    });
    run(
      cwd,
      "tools/pipeline/report.mjs",
      [
        "record",
        "stale-project",
        "image",
        "published",
        "ghcr.io/other/image",
        "",
        "sha256:old",
      ],
      { ...env, GITHUB_RUN_ATTEMPT: "9" },
    );
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    const report = JSON.parse(
      fs.readFileSync(path.join(cwd, ".work/run-report.json")),
    );
    assert.equal(report.results.length, 0);
    const markdown = fs.readFileSync(
      path.join(cwd, ".work/summary.md"),
      "utf8",
    );
    assert.doesNotMatch(markdown, /stale-project|sha256:old/);
    assert.match(markdown, /Ignored a result file/);
    assert.match(markdown, /No affected projects were selected/);
  }));
test("summary identifies the failing test and links its actual job", () =>
  temporary((cwd) => {
    const env = {
      GITHUB_EVENT_NAME: "pull_request",
      JOB_RESULTS: JSON.stringify({ ci: { result: "failure" } }),
    };
    planFixture(cwd, env);
    write(
      cwd,
      ".work/validation.log",
      "TAP version 13\nnot ok 2 - summary must isolate runner files\n",
    );
    run(
      cwd,
      "tools/pipeline/report.mjs",
      [
        "validation",
        "Pipeline and Helm regression tests",
        "failure",
        "skipped",
      ],
      env,
    );
    write(
      cwd,
      ".work/jobs.json",
      JSON.stringify({
        jobs: [
          {
            name: "Pipeline and Helm regression tests",
            conclusion: "failure",
            html_url: "https://github.com/harbor/app/actions/runs/123/job/456",
            steps: [{ name: "Execute validation", conclusion: "failure" }],
          },
        ],
      }),
    );
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    const markdown = fs.readFileSync(
      path.join(cwd, ".work/summary.md"),
      "utf8",
    );
    assert.match(markdown, /summary must isolate runner files/);
    assert.match(
      markdown,
      /https:\/\/github.com\/harbor\/app\/actions\/runs\/123\/job\/456/,
    );
    assert.doesNotMatch(markdown, /## Publication/);
  }));

test("writing a GitHub summary requires an explicit workflow flag", () =>
  temporary((cwd) => {
    const summary = path.join(cwd, "github-summary.md");
    const env = {
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_STEP_SUMMARY: summary,
    };
    planFixture(cwd, env);
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    assert.equal(fs.existsSync(summary), false);
    run(cwd, "tools/pipeline/report.mjs", ["summary", "--github-summary"], env);
    assert.match(fs.readFileSync(summary, "utf8"), /Publishing disabled/);
  }));
