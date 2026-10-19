import { spawn } from "node:child_process";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { exportLegacy } from "./lib/legacy-export.mjs";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
  });
}
let source = process.argv[2];
if (!source) {
  const folder = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
  const files = (await readdir(folder)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  if (files.length !== 1) throw new Error("Specify one SQLite source path");
  source = join(folder, files[0]);
}
const destination = resolve(`backups/legacy-${new Date().toISOString().replace(/[:.]/g, "-")}`);
await mkdir(destination, { recursive: true, mode: 0o700 });
const payload = await exportLegacy(resolve(source), join(destination, "source.sqlite"));
await writeFile(join(destination, "source.json"), JSON.stringify(payload), { mode: 0o600 });
await run(process.execPath, ["scripts/backup.mjs"]);
await run("docker", ["compose", "build", "app"]);
const container = ["compose", "run", "--rm", "--no-deps", "--user", "root", "--volume", `${destination}:/migration`, "app", "node"];
let stopped = false;
try {
  await run("docker", ["compose", "stop", "app"]);
  stopped = true;
  await run("docker", ["compose", "run", "--rm", "--no-deps", "app", "node", "scripts/init-db.mjs"]);
  await run("docker", ["compose", "run", "--rm", "--no-deps", "app", "node", "scripts/verify-schema.mjs"]);
  await run("docker", [...container, "scripts/verify-import-rollback.mjs", "/migration/source.json"]);
  await run("docker", [...container, "scripts/import-legacy.mjs", "/migration/source.json", "--dry-run"]);
  await run("docker", [...container, "scripts/import-legacy.mjs", "/migration/source.json"]);
  await run("docker", [...container, "scripts/import-legacy.mjs", "/migration/source.json", "--verify-only"]);
  await run("docker", [...container, "scripts/import-legacy.mjs", "/migration/source.json"]);
  console.log(`Migrasi dan verifikasi selesai; laporan privat: ${destination}`);
  await mkdir("outputs", { recursive: true });
  await writeFile("outputs/legacy-migration-latest.json", JSON.stringify({ destination, fingerprint: payload.fingerprint }, null, 2));
} finally {
  if (stopped) await run("docker", ["compose", "up", "-d", "--wait", "app"]);
}
