import { mkdir, readdir, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { exportLegacy } from "./lib/legacy-export.mjs";

let source = process.argv[2];
if (!source) {
  const folder = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
  const files = (await readdir(folder)).filter((name) => name.endsWith(".sqlite") && name !== "metadata.sqlite");
  if (files.length !== 1) throw new Error("Specify exactly one SQLite source path");
  source = join(folder, files[0]);
}
const destination = resolve(process.argv[3] ?? `backups/legacy-${new Date().toISOString().replace(/[:.]/g, "-")}`);
await mkdir(destination, { recursive: true, mode: 0o700 });
const payload = await exportLegacy(resolve(source), join(destination, "source.sqlite"));
await writeFile(join(destination, "source.json"), JSON.stringify(payload), { mode: 0o600, flag: "wx" });
const counts = Object.fromEntries(Object.entries(payload.tables).map(([table, data]) => [table, data.rows.length]));
await writeFile(join(destination, "summary.json"), JSON.stringify({ fingerprint: payload.fingerprint, counts }, null, 2), { mode: 0o600 });
console.log(JSON.stringify({ destination, counts, total: Object.values(counts).reduce((sum, count) => sum + count, 0) }, null, 2));
