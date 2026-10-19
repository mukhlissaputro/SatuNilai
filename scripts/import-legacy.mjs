import mysql from "mysql2/promise";
import { readFile, writeFile } from "node:fs/promises";
import { importLegacy } from "./lib/legacy-import.mjs";

const source = process.argv[2];
if (!source) throw new Error("Specify the source.json export path");
const payload = JSON.parse(await readFile(source, "utf8"));
const connection = await mysql.createConnection({ host: process.env.DB_HOST ?? "127.0.0.1", port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER ?? "satunilai", password: process.env.DB_PASSWORD, database: process.env.DB_NAME ?? "satunilai", decimalNumbers: true, dateStrings: true });
try {
  const [[lock]] = await connection.query("SELECT GET_LOCK('satunilai_legacy_import',60) AS acquired");
  if (Number(lock.acquired) !== 1) throw new Error("Import already running");
  const report = await importLegacy(connection, payload, { dryRun: process.argv.includes("--dry-run"), verifyOnly: process.argv.includes("--verify-only"), mergeAdminEmail: process.env.ADMIN_EMAIL });
  const output = `${source}.${report.dryRun ? "dry-run" : report.verifyOnly ? "verified" : "imported"}.json`;
  await writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ mode: report.dryRun ? "dry-run" : report.verifyOnly ? "verify" : "import", tables: Object.keys(report.tables).length, sourceRows: Object.values(report.tables).reduce((sum, table) => sum + table.source, 0), verifiedRows: Object.values(report.tables).reduce((sum, table) => sum + table.verified, 0), inserted: Object.values(report.tables).reduce((sum, table) => sum + table.inserted, 0), mergedAccounts: report.accountsMerged.length, report: output }));
} finally {
  await connection.query("SELECT RELEASE_LOCK('satunilai_legacy_import')").catch(() => {});
  await connection.end();
}
