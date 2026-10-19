import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { normalizeIdentifiers } from "./lib/sql-identifiers.mjs";

const generated = spawnSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "generate"], { stdio: "inherit" });
if (generated.status !== 0) process.exit(generated.status ?? 1);
for (const name of readdirSync("drizzle-mysql").filter((name) => name.endsWith(".sql"))) {
  const path = `drizzle-mysql/${name}`;
  const source = readFileSync(path, "utf8");
  const normalized = normalizeIdentifiers(source);
  if (source !== normalized) writeFileSync(path, normalized);
}
