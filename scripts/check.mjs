import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (path.endsWith(".js") || path.endsWith(".mjs")) files.push(path);
  }
}
for (const dir of ["packages", "apps", "scripts"]) await walk(dir);
for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) { process.stderr.write(result.stderr || result.stdout); process.exitCode = 1; }
}
if (!process.exitCode) console.log("Syntax check passed for " + files.length + " JavaScript files.");
