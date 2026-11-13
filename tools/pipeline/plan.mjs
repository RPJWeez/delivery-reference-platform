import fs from "node:fs";
import { execFileSync } from "node:child_process";
const selection = JSON.parse(process.env.SELECTION);
const { graph } = JSON.parse(fs.readFileSync(".work/graph.json"));
const files = execFileSync(
  "git",
  ["diff", "--name-only", process.env.BASE, process.env.GITHUB_SHA],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter(Boolean);
const direct = Object.entries(graph.nodes)
  .filter(([, node]) =>
    files.some(
      (file) => node.data.root !== "." && file.startsWith(node.data.root + "/"),
    ),
  )
  .map(([name]) => name);
function chain(name, visited = new Set()) {
  if (direct.includes(name)) return [name];
  if (visited.has(name)) return null;
  visited.add(name);
  for (const dependency of graph.dependencies[name] || []) {
    const rest = chain(dependency.target, new Set(visited));
    if (rest) return [name, ...rest];
  }
  return null;
}
const selected = Object.fromEntries(
  ["images", "libraries", "npm", "chart"].map((key) => [
    key,
    JSON.parse(selection[key] || "[]"),
  ]),
);
const reasons = Object.fromEntries(
  [...new Set(Object.values(selected).flat())].map((name) => [
    name,
    chain(name)?.join(" → ") ||
      "Shared/root input or Nx inferred dependency change",
  ]),
);
const plan = {
  kind: "plan",
  base: process.env.BASE,
  head: process.env.GITHUB_SHA,
  reason: process.env.BASE_REASON,
  files,
  direct,
  selected,
  reasons,
};
fs.writeFileSync(".work/plan.json", JSON.stringify(plan, null, 2));
console.log(JSON.stringify(plan, null, 2));
