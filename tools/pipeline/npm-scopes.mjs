import fs from "node:fs";
const manifest = JSON.parse(fs.readFileSync("package.json"));
const workspaces = Array.isArray(manifest.workspaces)
  ? manifest.workspaces
  : manifest.workspaces?.packages || [];
const config = JSON.parse(fs.readFileSync("tools/pipeline/config.json"));
const scopes = new Set();
for (const workspace of workspaces) {
  for (const file of fs.globSync(`${workspace}/package.json`, {
    exclude: ["**/node_modules/**"],
  })) {
    const pkg = JSON.parse(fs.readFileSync(file));
    if (pkg.publishConfig?.registry && pkg.name?.startsWith("@"))
      scopes.add(pkg.name.split("/")[0]);
  }
}
for (const scope of scopes)
  fs.appendFileSync(
    process.env.NPM_CONFIG_USERCONFIG || `${process.env.HOME}/.npmrc`,
    `\n${scope}:registry=${config.npmRegistry}\n`,
  );
