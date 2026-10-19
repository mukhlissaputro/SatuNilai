import { spawn } from "node:child_process";
import { createWriteStream } from "node:fs";
import { mkdir, copyFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pipeline } from "node:stream/promises";

const destination = resolve("backups", new Date().toISOString().replace(/[:.]/g, "-"));
await mkdir(destination, { recursive: true, mode: 0o700 });
function compose(args) {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", ["compose", ...args], { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Docker exited ${code}`)));
  });
}
try {
  await compose(["stop", "app"]);
  const dump = spawn("docker", ["compose", "exec", "-T", "db", "sh", "-c", 'MYSQL_PWD="$MARIADB_PASSWORD" exec mariadb-dump -u"$MARIADB_USER" --single-transaction --skip-lock-tables "$MARIADB_DATABASE"'], { stdio: ["ignore", "pipe", "inherit"] });
  const exited = new Promise((resolve, reject) => {
    dump.on("error", reject);
    dump.on("exit", (code) => code === 0 ? resolve() : reject(new Error(`Backup database failed: ${code}`)));
  });
  await Promise.all([pipeline(dump.stdout, createWriteStream(resolve(destination, "database.sql"), { mode: 0o600 })), exited]);
  await compose(["cp", "app:/data/evidence", resolve(destination, "evidence")]);
  await copyFile(".env", resolve(destination, ".env"));
  console.log(`Backup selesai: ${destination}. Simpan folder ini secara privat.`);
} finally { await compose(["start", "app"]); }
