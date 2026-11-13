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
    assert.deepEqual(affected("modules/rates/source.txt", "build"), [
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
  for (const file of ["ci.yml"])
    parse(fs.readFileSync(`.github/workflows/${file}`, "utf8"));
  for (const action of ["setup", "qualify", "publish-chart"])
    parse(fs.readFileSync(`.github/actions/${action}/action.yml`, "utf8"));
  const { jobs } = parse(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
  assert.equal(jobs.report.if, "always()");
  for (const name of ["image-evidence", "publish-images", "publish-chart"])
    assert(jobs[name].needs.includes("ci"));
});
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

test("workflow job lookup paginates with supported GitHub CLI flags", () =>
  temporary((cwd) => {
    const workflow = parse(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
    const step = workflow.jobs.report.steps.find(
      (step) => step.name === "Read individual check results and log links",
    );
    write(
      cwd,
      "bin/gh",
      `#!/usr/bin/env node
const args=process.argv.slice(2);
if(!args.includes('--paginate') || !args.includes('--slurp') || args.includes('--jq')) process.exit(1);
console.log(JSON.stringify([{jobs:[{id:1,name:'Java — compile, test, package',conclusion:'success'}]},{jobs:[{id:2,name:'Frontend — build and typecheck',conclusion:'success'}]}]));
`,
    );
    fs.chmodSync(path.join(cwd, "bin/gh"), 0o755);
    execFileSync("bash", ["-euo", "pipefail", "-c", step.run], {
      cwd,
      env: isolatedEnvironment(cwd, {
        PATH: `${cwd}/bin:${process.env.PATH}`,
        GITHUB_REPOSITORY: "harbor/app",
        GITHUB_RUN_ID: "123",
      }),
      stdio: "pipe",
    });
    const jobs = JSON.parse(
      fs.readFileSync(path.join(cwd, ".work/jobs.json")),
    ).jobs;
    assert.deepEqual(
      jobs.map((job) => job.id),
      [1, 2],
    );
  }));

test("complete candidate reporting stays separate from fragments and PR claims", () =>
  temporary((cwd) => {
    const env = { GITHUB_EVENT_NAME: "push" };
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    assert.match(
      fs.readFileSync(path.join(cwd, ".work/summary.md"), "utf8"),
      /No complete candidate handoff/,
    );
    const candidate = `ghcr.io/harbor/tide@sha256:${"a".repeat(64)}`;
    run(cwd, "tools/pipeline/report.mjs", ["candidate", candidate], env);
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    assert.match(
      fs.readFileSync(path.join(cwd, ".work/summary.md"), "utf8"),
      /QA pending; certification pending/,
    );
    assert.throws(() =>
      run(cwd, "tools/pipeline/report.mjs", ["candidate", candidate], {
        GITHUB_EVENT_NAME: "pull_request",
      }),
    );
  }));

test("Bake actions use the checkout containing generated cache overlays", () => {
  const { jobs } = parse(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
  for (const name of ["container-validate", "publish-images"]) {
    const job = jobs[name];
    const index = job.steps.findIndex((step) =>
      step.uses?.startsWith("docker/bake-action@"),
    );
    const bake = job.steps[index];
    assert.equal(
      bake.with.source,
      ".",
      `${name} must not use the remote Git default`,
    );
    assert(bake.with.files.split("\n").includes(".work/cache.json"));
    assert(
      job.steps
        .slice(0, index)
        .some((step) => step.uses?.startsWith("actions/checkout@")),
    );
    assert(
      job.steps
        .slice(0, index)
        .some((step) => step.run?.includes("> .work/cache.json")),
    );
  }
});

test("PR overview explains Docker builds and links only current-attempt downloads", () =>
  temporary((cwd) => {
    const env = {
      GITHUB_EVENT_NAME: "pull_request",
      REPORT_ARTIFACT_ID: "99",
      JOB_RESULTS: JSON.stringify({
        ci: { result: "success" },
        "container-validate": { result: "success" },
      }),
    };
    planFixture(cwd, env);
    write(
      cwd,
      ".work/artifacts.json",
      JSON.stringify({
        runId: "local",
        attempt: "1",
        startedAt: "2026-11-13T12:00:00Z",
        artifacts: [
          { id: 1, name: "validation-0", created_at: "2026-11-13T12:01:00Z" },
          {
            id: 2,
            name: "previous-attempt",
            created_at: "2026-11-13T11:59:00Z",
          },
          {
            id: 3,
            name: "expired",
            expired: true,
            created_at: "2026-11-13T12:01:00Z",
          },
          {
            id: 4,
            name: "another-run",
            workflow_run: { id: 123 },
            created_at: "2026-11-13T12:01:00Z",
          },
          { id: 5, name: "results-plan", created_at: "2026-11-13T12:01:00Z" },
        ],
      }),
    );
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    const md = fs.readFileSync(path.join(cwd, ".work/summary.md"), "utf8");
    assert.match(md, /Built from source for verification only/);
    assert.match(md, /Container source build.*Passed/);
    assert.match(md, /not deploy the application/);
    assert.match(md, /\/artifacts\/1/);
    assert.match(md, /\/artifacts\/99/);
    assert.doesNotMatch(md, /previous-attempt|expired\]|another-run/);
    assert.match(md, /<details><summary>Individual job result records/);
    assert.match(md, /<details><summary>Why checks were selected/);
  }));

test("main overview exposes publication failure and links recorded packages and release assets", () =>
  temporary((cwd) => {
    const env = {
      GITHUB_EVENT_NAME: "push",
      JOB_RESULTS: JSON.stringify({
        ci: { result: "success" },
        "image-evidence": { result: "failure" },
        "publish-images": { result: "success" },
      }),
    };
    const release = "https://github.com/local/releases/tag/image-run";
    run(
      cwd,
      "tools/pipeline/report.mjs",
      [
        "record",
        "api",
        "image",
        "published",
        "ghcr.io/harbor/tide/api",
        "",
        "sha256:abc",
        release,
      ],
      env,
    );
    write(
      cwd,
      ".work/releases.json",
      JSON.stringify({
        run: {
          repository: "local",
          id: "local",
          attempt: "1",
          sha: "local",
          event: "push",
        },
        notices: [],
        releases: [
          {
            tag: "image-run",
            url: release,
            assets: [
              {
                name: "api.spdx.json",
                url: "https://github.com/local/releases/download/image-run/api.spdx.json",
              },
            ],
          },
        ],
      }),
    );
    run(cwd, "tools/pipeline/report.mjs", ["summary"], env);
    const md = fs.readFileSync(path.join(cwd, ".work/summary.md"), "utf8");
    assert.match(md, /Validation passed; publication failed/);
    assert.match(md, /1 image publication\(s\) recorded/);
    assert.match(md, /users\/harbor\/packages\/container\/tide%2Fapi/);
    assert.match(md, /releases\/download\/image-run\/api.spdx.json/);
    assert.match(md, /No complete candidate handoff/);
    assert.match(md, /Image evidence \(all images\).*Failed/);
    assert.doesNotMatch(md, /send the exact candidate/);
  }));

test("stale artifact catalogs are not presented as downloads from this attempt", () =>
  temporary((cwd) => {
    write(
      cwd,
      ".work/artifacts.json",
      JSON.stringify({
        runId: "local",
        attempt: "9",
        startedAt: "2026-11-13",
        artifacts: [{ id: 1, name: "wrong-attempt", created_at: "2026-11-14" }],
      }),
    );
    run(cwd, "tools/pipeline/report.mjs", ["summary"]);
    const md = fs.readFileSync(path.join(cwd, ".work/summary.md"), "utf8");
    assert.doesNotMatch(md, /wrong-attempt/);
    assert.match(md, /Download inventory unavailable/);
  }));

test("release discovery uses observed records and cannot turn PR fixtures into release claims", () =>
  temporary((cwd) => {
    write(
      cwd,
      "bin/gh",
      `#!/usr/bin/env node
if(process.argv.slice(2).join(' ')!=='api repos/local/releases/tags/image-run') process.exit(1);
console.log(JSON.stringify({assets:[{name:'sbom.json',browser_download_url:'https://github.com/local/releases/download/image-run/sbom.json'}]}));
`,
    );
    fs.chmodSync(path.join(cwd, "bin/gh"), 0o755);
    const env = {
      GITHUB_EVENT_NAME: "push",
      PATH: `${cwd}/bin:${process.env.PATH}`,
    };
    run(
      cwd,
      "tools/pipeline/report.mjs",
      [
        "record",
        "api",
        "image",
        "published",
        "ghcr.io/harbor/api",
        "",
        "sha256:abc",
        "https://github.com/local/releases/tag/image-run",
      ],
      env,
    );
    run(cwd, "tools/pipeline/report.mjs", ["release-links"], env);
    assert.equal(
      JSON.parse(fs.readFileSync(path.join(cwd, ".work/releases.json")))
        .releases[0].assets[0].name,
      "sbom.json",
    );
    run(cwd, "tools/pipeline/report.mjs", ["release-links"], {
      ...env,
      GITHUB_EVENT_NAME: "pull_request",
    });
    assert.deepEqual(
      JSON.parse(fs.readFileSync(path.join(cwd, ".work/releases.json")))
        .releases,
      [],
    );
  }));

test("publishers handle skipped PR-only ancestors but still require successful main validation", () => {
  const { jobs } = parse(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
  const names = ["publish-images", "image-evidence", "publish-chart"];
  for (const name of names) {
    const condition = jobs[name].if;
    assert.match(
      condition,
      /always\(\)/,
      `${name} must handle a skipped PR-only ancestor`,
    );
    const allowed = (event, ci, images = "success", evidence = "success") =>
      Function(
        "always",
        "github",
        "needs",
        `return ${condition.replace(/needs\.([a-z-]+)/g, 'needs["$1"]')}`,
      )(
        () => true,
        { event_name: event, ref: "refs/heads/main" },
        {
          ci: { result: ci },
          "publish-images": { result: images },
          "image-evidence": { result: evidence },
        },
      );
    assert.equal(allowed("push", "success"), true);
    assert.equal(allowed("push", "failure"), false);
    assert.equal(allowed("pull_request", "success"), false);
    if (name !== "publish-images")
      assert.equal(allowed("push", "success", "failure"), false);
    if (name === "publish-chart")
      assert.equal(allowed("push", "success", "success", "failure"), false);
  }
});

test("large native metadata travels through a script file without environment limits or code injection", () =>
  temporary((cwd) => {
    const workflow = parse(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
    const steps = workflow.jobs["publish-images"].steps;
    const step = steps.find((s) => s.id === "metadata");
    assert.equal(step.shell, "node {0}");
    const expression = "${{ toJSON(steps.build.outputs.metadata) }}";
    assert(step.run.includes(expression));
    for (const s of steps)
      assert(
        !JSON.stringify(s.env || {}).includes("steps.build.outputs.metadata"),
      );
    const payload = JSON.stringify({
      api: {
        "containerimage.digest": `sha256:${"a".repeat(64)}`,
        "buildx.build.provenance": {
          padding: "x".repeat(2 * 1024 * 1024),
          adversarial:
            '"; require("node:fs").writeFileSync("INJECTED", "bad"); //\nEOF\n$(touch INJECTED)\n`touch INJECTED`\n${process.exit(1)}\n雪 🐋',
        },
      },
    });
    const file = path.join(cwd, "persist.sh");
    fs.writeFileSync(
      file,
      step.run.replace(expression, JSON.stringify(payload)),
    );
    execFileSync(process.execPath, [file], {
      cwd,
      env: isolatedEnvironment(cwd),
    });
    assert.equal(
      fs.readFileSync(path.join(cwd, ".work/metadata.json"), "utf8"),
      payload,
    );
    assert.equal(fs.existsSync(path.join(cwd, "INJECTED")), false);
    const record = steps.find(
      (s) => s.name === "Record native build outputs immediately",
    );
    assert.match(record.if, /steps.metadata.outcome == 'success'/);
    assert.doesNotMatch(record.run, /\$METADATA|outputs.metadata/);
  }));

test("missing or malformed metadata fails before a publication record can be produced", () =>
  temporary((cwd) => {
    const { jobs } = parse(fs.readFileSync(".github/workflows/ci.yml", "utf8"));
    const step = jobs["publish-images"].steps.find((s) => s.id === "metadata");
    for (const payload of ["", null, "{bad json", "[]", "null"]) {
      const file = path.join(cwd, "persist.sh");
      fs.writeFileSync(
        file,
        step.run.replace(
          "${{ toJSON(steps.build.outputs.metadata) }}",
          JSON.stringify(payload),
        ),
      );
      assert.throws(() =>
        execFileSync(process.execPath, [file], {
          cwd,
          env: isolatedEnvironment(cwd),
          stdio: "pipe",
        }),
      );
      assert.equal(fs.existsSync(path.join(cwd, ".work/metadata.json")), false);
    }
  }));
