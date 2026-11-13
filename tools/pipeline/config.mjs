import fs from "node:fs";
const config = JSON.parse(fs.readFileSync("tools/pipeline/config.json"));
for (const [key, value] of Object.entries(config)) {
  if (typeof value !== "string" || /[\r\n]/.test(value))
    throw Error(`Invalid configuration: ${key}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
