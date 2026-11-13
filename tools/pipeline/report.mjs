import fs from "node:fs";
import path from "node:path";
const [command, ...args] = process.argv.slice(2);
const directory = ".work/results";
fs.mkdirSync(directory, { recursive: true });
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
  const result = {
    project,
    type,
    outcome,
    destination,
    version,
    digest,
    evidence,
  };
  fs.writeFileSync(
    path.join(
      directory,
      `${Buffer.from(`${type}:${project}`).toString("hex")}.json`,
    ),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result, null, 2));
} else if (command === "summary") {
  const records = fs
    .readdirSync(directory, { recursive: true })
    .filter((p) => p.endsWith(".json"))
    .map((p) => JSON.parse(fs.readFileSync(path.join(directory, p))));
  const plan = records.find((record) => record.kind === "plan");
  const results = records.filter((record) => record.kind !== "plan");
  for (const result of results.filter((result) => result.type === "maven")) {
    const evidence = results.find(
      (item) =>
        item.type === "maven-evidence" && item.project === result.project,
    );
    result.evidence = evidence?.evidence || "evidence generation incomplete";
  }
  const jobs = JSON.parse(process.env.JOB_RESULTS || "{}");
  const runUrl = `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const types = {
    images: ["image", "publish-images"],
    libraries: ["maven", "publish-java"],
    npm: ["npm", "publish-npm"],
    chart: ["chart", "publish-chart"],
  };
  for (const [category, projects] of Object.entries(plan?.selected || {})) {
    const [type, job] = types[category];
    for (const project of projects) {
      if (
        !results.some(
          (result) => result.type === type && result.project === project,
        )
      ) {
        results.push({
          project,
          type,
          outcome:
            process.env.GITHUB_EVENT_NAME === "pull_request"
              ? "not attempted: PR validation only"
              : `no completion record (${jobs[job]?.result || "unknown"}); inspect job log`,
          destination: "",
          version: "",
          digest: "",
          evidence: "",
        });
      }
    }
  }
  const escape = (value) =>
    String(value ?? "")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  const icon = { success: "✅", failure: "❌", skipped: "⏭️", cancelled: "🚫" };
  const lines = [
    "# Pipeline run",
    "",
    `Commit: ${process.env.GITHUB_SHA}`,
    "",
    "```text",
    `Plan ${icon[jobs.plan?.result] || "❔"} → Validation ${icon[jobs.validate?.result] || "❔"} → Gate ${icon[jobs.ci?.result] || "❔"}`,
    `  ├─ Maven ${icon[jobs["publish-java"]?.result] || "❔"} → evidence ${icon[jobs["java-evidence"]?.result] || "❔"}`,
    `  ├─ npm ${icon[jobs["publish-npm"]?.result] || "❔"}`,
    `  └─ Helm ${icon[jobs["publish-chart"]?.result] || "❔"}`,
    `Maven + npm + Java evidence → Images ${icon[jobs["publish-images"]?.result] || "❔"}`,
    "```",
    "✅ success · ❌ failure · ⏭️ skipped · 🚫 cancelled",
    "",
    "## Selection",
    "",
    `Baseline: ${plan?.base || "unavailable"} (${plan?.reason || "planning did not complete"}).`,
    "",
    "| Affected project | Dependency path / reason |",
    "|---|---|",
    ...Object.entries(plan?.reasons || {}).map(
      ([name, reason]) => `| ${escape(name)} | ${escape(reason)} |`,
    ),
    "",
    "A → B means A depends on changed project B. Global inputs may select additional projects.",
    "",
    "Changed files: " + (plan?.files || []).map(escape).join(", "),
    "",
    "## Execution",
    "",
    "| Stage | Result |",
    "|---|---|",
    ...Object.entries(jobs).map(
      ([name, job]) =>
        `| [${escape(name)}](${runUrl}) | ${escape(job.result)} |`,
    ),
    "",
    "## Artifact results",
    "",
    "| Project | Type | Outcome | Destination | Version / digest | Evidence |",
    "|---|---|---|---|---|---|",
    ...results.map(
      (r) =>
        `| ${[r.project, r.type, r.outcome, r.destination, [r.version, r.digest].filter(Boolean).join(" / "), r.evidence].map(escape).join(" | ")} |`,
    ),
    "",
    "Missing completion records do not prove nothing was published; consult the stage result above. PRs validate only. Unaffected publication stages are skipped.",
  ];
  fs.writeFileSync(
    ".work/run-report.json",
    JSON.stringify({ plan, jobs, results }, null, 2),
  );
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY || ".work/summary.md",
    lines.join("\n") + "\n",
  );
}
