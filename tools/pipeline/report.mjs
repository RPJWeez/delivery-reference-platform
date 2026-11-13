import fs from "node:fs";
import path from "node:path";
import { runIdentity } from "./context.mjs";
const [command, ...args] = process.argv.slice(2);
const directory = ".work/results";
const run = runIdentity();
fs.mkdirSync(directory, { recursive: true });
function save(key, data) {
  fs.writeFileSync(
    path.join(directory, `${Buffer.from(key).toString("hex")}.json`),
    JSON.stringify({ schemaVersion: 1, run, ...data }, null, 2),
  );
}
const escape = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");
const status = (value) =>
  ({
    success: "✅ Passed",
    failure: "❌ Failed",
    skipped: "⏭️ Not run",
    cancelled: "🚫 Cancelled",
  })[value] || "❔ Unavailable";
const categories = {
  images: ["image", "publish-images", "Container image"],
  libraries: ["maven", "publish-java", "Maven package"],
  npm: ["npm", "publish-npm", "npm package"],
  chart: ["chart", "publish-chart", "Helm chart"],
};
if (command === "record") {
  const [
    project,
    type,
    outcome,
    destination,
    version = "",
    digest = "",
    evidence = "",
  ] = args;
  if (
    !project ||
    (!Object.values(categories).some(([kind]) => type === kind) &&
      type !== "maven-evidence")
  )
    throw Error("Unknown artifact identity");
  if (!["published", "reused", "retained"].includes(outcome))
    throw Error("Unknown publication outcome");
  save(`${type}:${project}`, {
    kind: "publication",
    project,
    type,
    outcome,
    destination,
    version,
    digest,
    evidence,
  });
  console.log(
    `${project}: ${outcome}\nDestination: ${destination}\nVersion: ${version || "—"}\nDigest: ${digest || "—"}\nEvidence: ${evidence || "not recorded yet"}`,
  );
} else if (command === "candidate") {
  if (run.event !== "push")
    throw Error("Only a protected publication run may record a candidate");
  if (!/^ghcr\.io\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(args[0]))
    throw Error("Candidate must be digest addressed");
  save("candidate", {
    kind: "candidate",
    reference: args[0],
    state: "published",
    qa: "pending",
    certification: "pending",
  });
} else if (command === "validation") {
  const [name, outcome, lint = "skipped"] = args;
  const log = fs.existsSync(".work/validation.log")
    ? fs.readFileSync(".work/validation.log", "utf8")
    : "";
  const failures = [...log.matchAll(/^(?:# )?not ok \d+ - (.+)$/gm)].map(
    (match) => match[1],
  );
  save(`validation:${name}`, {
    kind: "validation",
    name,
    outcome,
    lint,
    failures,
  });
} else if (command === "summary") {
  const notices = [];
  const records = [];
  for (const file of fs
    .readdirSync(directory, { recursive: true })
    .filter((file) => file.endsWith(".json"))) {
    try {
      const record = JSON.parse(fs.readFileSync(path.join(directory, file)));
      if (
        record.schemaVersion !== 1 ||
        !Object.entries(run).every(
          ([key, value]) => record.run?.[key] === value,
        )
      ) {
        notices.push(
          "Ignored a result file that does not belong to this run and attempt.",
        );
        continue;
      }
      records.push(record);
    } catch {
      notices.push("Ignored an unreadable result file.");
    }
  }
  const plan = records.find((record) => record.kind === "plan");
  const validations = records.filter((record) => record.kind === "validation");
  const jobs = JSON.parse(process.env.JOB_RESULTS || "{}");
  let jobDetails = [];
  try {
    jobDetails = JSON.parse(fs.readFileSync(".work/jobs.json")).jobs || [];
  } catch {
    /* Aggregate results remain available. */
  }
  const runUrl = `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${run.repository}/actions/runs/${run.id}`;
  const isPR = run.event === "pull_request";
  const publications = [
    ...records
      .filter((record) => record.kind === "publication")
      .reduce((unique, record) => {
        const key = `${record.type}:${record.project}:${record.digest}`;
        const previous = unique.get(key);
        // Image publication and its later evidence job describe one observed output.
        if (!previous || !/^https:\/\//.test(previous.evidence || ""))
          unique.set(key, record);
        return unique;
      }, new Map())
      .values(),
  ];
  const results = isPR
    ? []
    : publications.filter((record) => record.type !== "maven-evidence");
  if (isPR && publications.length)
    notices.push(
      "Ignored unexpected publication records: publishing is disabled for pull requests.",
    );
  for (const result of results.filter((record) => record.type === "maven")) {
    result.evidence =
      publications.find(
        (record) =>
          record.type === "maven-evidence" && record.project === result.project,
      )?.evidence || "Evidence not completed";
  }
  const validationState = jobs.ci?.result || jobs.validate?.result || "unknown";
  const failed = validationState === "failure";
  const headline =
    validationState === "success"
      ? "Validation passed"
      : failed
        ? "Validation failed"
        : validationState === "cancelled"
          ? "Validation cancelled"
          : "Validation incomplete";
  const lines = [
    `# ${isPR ? "Pull request checks" : "Main branch pipeline"} — ${headline}`,
    "",
    isPR
      ? "**Publishing disabled.** Pull requests validate changes only. No packages, images, or charts were published by this workflow."
      : "Main branch runs validate changes, then build the complete application candidate. Publication and evidence results are listed separately below.",
    "",
    `Commit: \`${escape(run.sha.slice(0, 12))}\` · [Open workflow run](${runUrl})`,
    "",
    "## Checks",
    "",
    "| Check | Result | Details |",
    "|---|---|---|",
  ];
  const checkNames = [
    "Plan affected work",
    "Java — compile, test, package",
    "Frontend — build and typecheck",
    "Pipeline and Helm regression tests",
    "Validation complete",
  ];
  const aggregate = {
    "Plan affected work": "plan",
    "Validation complete": "ci",
  };
  for (const name of checkNames) {
    const detail = jobDetails.find((job) => job.name === name);
    const record = validations.find((record) => record.name === name);
    const result =
      detail?.conclusion || record?.outcome || jobs[aggregate[name]]?.result;
    const step = detail?.steps?.find((step) => step.conclusion === "failure");
    const url =
      detail?.html_url || (detail?.id ? `${runUrl}/job/${detail.id}` : runUrl);
    const explanation = record?.failures?.length
      ? record.failures.map(escape).join("; ")
      : step
        ? `Failed at: ${escape(step.name)}`
        : result === "skipped"
          ? "A required earlier stage did not complete."
          : "View logs";
    lines.push(
      `| ${escape(name)} | ${status(result)} | [${explanation}](${url}) |`,
    );
  }
  const helm = validations.find(
    (record) => record.name === "Pipeline and Helm regression tests",
  );
  if (helm) {
    const job = jobDetails.find((job) => job.name === helm.name);
    const url = job?.html_url || (job?.id ? `${runUrl}/job/${job.id}` : runUrl);
    lines.push(
      `| Helm chart lint | ${status(helm.lint)} | ${helm.lint === "skipped" ? "Regression tests or setup did not complete." : `[View logs](${url})`} |`,
    );
  }
  if (failed) {
    lines.push(
      "",
      "Fix the failed check above; the validation gate reflects that failure.",
    );
  }
  if (!isPR) {
    lines.push("", "## Publication", "");
    if (!results.length) lines.push("No completed publications were recorded.");
    else {
      lines.push(
        "| Component | Artifact | Result | Destination | Version | Evidence |",
        "|---|---|---|---|---|---|",
      );
      for (const result of results) {
        const type =
          Object.values(categories).find(
            ([type]) => type === result.type,
          )?.[2] || result.type;
        const evidence = /^https:\/\//.test(result.evidence)
          ? `[SBOM and release assets](${result.evidence})`
          : escape(result.evidence || "Evidence not completed");
        lines.push(
          `| ${escape(result.project)} | ${type} | ${result.outcome === "reused" ? "Reused existing version" : "Published"} | ${escape(result.destination)} | ${escape(result.version || "Digest-addressed")} | ${evidence} |`,
        );
      }
    }
    const missing = [];
    for (const [category, projects] of Object.entries(plan?.selected || {})) {
      const [type, job, label] = categories[category];
      for (const project of projects) {
        if (
          results.some(
            (result) => result.project === project && result.type === type,
          )
        )
          continue;
        const outcome = jobs[job]?.result;
        const reason =
          validationState !== "success" && outcome === "skipped"
            ? "Not attempted: validation did not pass"
            : outcome === "skipped"
              ? "Not attempted: a required publication stage did not complete"
              : "Publication unconfirmed: inspect job logs before retrying";
        missing.push(`| ${escape(project)} | ${label} | ${reason} |`);
      }
    }
    if (missing.length)
      lines.push(
        "",
        "### Selected components without a publication record",
        "",
        "| Component | Artifact | Reason |",
        "|---|---|---|",
        ...missing,
      );
    if (results.some((result) => !/^https:\/\//.test(result.evidence)))
      lines.push(
        "",
        "Some artifacts were published or reused before evidence finished. Check the evidence job before consuming them.",
      );
    if (results.length)
      lines.push(
        "",
        "<details><summary>Artifact digests</summary>",
        "",
        "| Component | Digest / integrity |",
        "|---|---|",
        ...results.map(
          (result) =>
            `| ${escape(result.project)} | ${escape(result.digest || "Not recorded")} |`,
        ),
        "",
        "</details>",
      );
  }
  if (!isPR) {
    const candidate = records.find((record) => record.kind === "candidate");
    lines.push(
      "",
      "## Application candidate",
      "",
      candidate
        ? `Candidate published: ${escape(candidate.reference)}. QA pending; certification pending. No application deployment occurred in CI.`
        : "No complete candidate handoff was recorded. Individual publications do not establish candidate completeness or runtime qualification.",
    );
  }
  lines.push(
    "",
    "## Affected projects",
    "",
    "This is the work selected for validation. Selection does not mean an artifact was published.",
    "",
  );
  if (!plan)
    lines.push(
      "The selection plan is unavailable. Check “Plan affected work” above.",
    );
  else {
    const projects = [
      ...new Set([
        ...Object.keys(plan.reasons || {}),
        ...Object.values(plan.validation || {}).flat(),
      ]),
    ];
    if (!projects.length)
      lines.push(
        "No affected projects were selected. Workspace regression tests still run.",
      );
    else {
      lines.push(
        "| Project | Checks planned | Why included |",
        "|---|---|---|",
      );
      for (const project of projects) {
        const checks = Object.entries(plan.validation || {})
          .filter(([, names]) => names.includes(project))
          .map(
            ([target]) =>
              ({
                java: "Java compilation, tests, packaging",
                build: "Build",
                typecheck: "TypeScript checks",
              })[target],
          );
        const reason = plan.direct?.includes(project)
          ? "Files changed in this project"
          : plan.reasons?.[project]?.includes(" → ")
            ? `Depends on changed project: ${plan.reasons[project].split(" → ").slice(1).join(" → ")}`
            : plan.sharedFiles?.length
              ? `Shared build/pipeline inputs changed (${plan.sharedFiles.length} files)`
              : "Selected by Nx dependency/input analysis";
        lines.push(
          `| ${escape(project)} | ${escape(checks.join("; ") || "Workspace/Helm checks")} | ${escape(reason)} |`,
        );
      }
    }
    const reason =
      {
        "pr-target": "PR target branch commit",
        "last-successful-main-workflow": "Last fully successful main workflow",
        "bootstrap-empty-tree":
          "First publication: compare with an empty repository",
      }[plan.reason] || plan.reason;
    lines.push(
      "",
      "<details><summary>Comparison and changed files</summary>",
      "",
      `${escape(reason)}: \`${escape(plan.base)}\` → \`${escape(plan.head)}\``,
      "",
      ...(plan.files || []).map((file) => `- \`${escape(file)}\``),
      "",
      "</details>",
    );
  }
  if (notices.length)
    lines.push(
      "",
      "## Report diagnostics",
      "",
      ...[...new Set(notices)].map((notice) => `- ${notice}`),
    );
  const markdown = lines.join("\n") + "\n";
  fs.writeFileSync(
    ".work/run-report.json",
    JSON.stringify({ run, plan, validations, jobs, results, notices }, null, 2),
  );
  fs.writeFileSync(".work/summary.md", markdown);
  if (
    args.includes("--github-summary") &&
    process.env.GITHUB_STEP_SUMMARY &&
    path.resolve(process.env.GITHUB_STEP_SUMMARY) !==
      path.resolve(".work/summary.md")
  )
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdown);
} else throw Error(`Unknown report command: ${command}`);
