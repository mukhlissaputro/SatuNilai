import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { importLegacy } from "./lib/legacy-import.mjs";

const payload = JSON.parse(await readFile(process.argv[2], "utf8"));
payload.tables.assignments.rows[0].indicator_id = "migration-invalid-foreign-key";
payload.tables.assignments.rows[0].id = randomUUID();
payload.fingerprint = createHash("sha256").update(JSON.stringify(payload.tables)).digest("hex");
const db = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
async function counts() {
  const counts = {};
  for (const table of Object.keys(payload.tables)) {
    assert.match(table, /^[a-z_]+$/);
    const [[row]] = await db.query(`SELECT COUNT(*) total FROM \`${table}\``);
    counts[table] = row.total;
  }
  return counts;
}
try {
  const before = await counts();
  await assert.rejects(importLegacy(db, payload, { dryRun: true, mergeAdminEmail: process.env.ADMIN_EMAIL }), /Migration rejected by MariaDB: ER_NO_REFERENCED_ROW_2/);
  assert.deepEqual(await counts(), before, "Import failure must roll back every inserted row");
  console.log("PASS: invalid foreign key/conflict rejects the import and leaves every table count unchanged.");
} finally { await db.end(); }
