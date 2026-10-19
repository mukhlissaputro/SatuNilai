import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import { exportLegacy } from "../scripts/lib/legacy-export.mjs";
import { importLegacy } from "../scripts/lib/legacy-import.mjs";
import { verifyMariaSchema } from "../scripts/lib/verify-schema.mjs";

test("MariaDB: impor publik/favorit utuh, dry-run rollback, dan impor berulang", async () => {
  assert.ok(process.env.TEST_DB_PORT, "Set TEST_DB_PORT ke database uji terisolasi");
  const dir = await mkdtemp(join(tmpdir(), "satunilai-import-"));
  const source = join(dir, "source.sqlite");
  const sqlite = new DatabaseSync(source);
  const id = randomUUID();
  const db = await mysql.createConnection({ host: "127.0.0.1", port: Number(process.env.TEST_DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME, dateStrings: true, decimalNumbers: true });
  try {
    sqlite.exec(await readFile(new URL("../database.sql", import.meta.url), "utf8"));
    sqlite.prepare("INSERT INTO units(id,code,name) VALUES(?,?,?)").run(id, id, "Unit migrasi");
    sqlite.prepare("INSERT INTO users(id,email,display_name,unit_id) VALUES(?,?,?,?)").run(id, `${id}@localhost`, "User migrasi", id);
    sqlite.prepare("INSERT INTO assessment_types(id,code,name,is_public) VALUES(?,?,?,1)").run(id, id, "Publik migrasi");
    sqlite.prepare("INSERT INTO evidence(id,unit_id,title,source_type,created_by) VALUES(?,?,?,'link',?)").run(id, id, "Bukti migrasi", id);
    sqlite.prepare("INSERT INTO evidence_favorites(user_id,evidence_id) VALUES(?,?)").run(id, id);
    const payload = await exportLegacy(source, join(dir, "snapshot.sqlite"));
    const schema = await verifyMariaSchema(db, { checkRows: true });
    assert.equal(schema.applicationTables, 20);
    assert.equal(schema.foreignKeys, 31);
    await importLegacy(db, payload, { dryRun: true });
    assert.equal((await db.query("SELECT id FROM users WHERE id=?", [id]))[0].length, 0);
    const first = await importLegacy(db, payload);
    assert.equal(first.tables.evidence_favorites.inserted, 1);
    await importLegacy(db, payload, { verifyOnly: true });
    const repeat = await importLegacy(db, payload);
    assert.equal(repeat.tables.evidence_favorites.inserted, 0);
    assert.equal(repeat.tables.evidence_favorites.verified, 1);
    const [[type]] = await db.query("SELECT is_public FROM assessment_types WHERE id=?", [id]);
    assert.equal(type.is_public, 1);
  } finally {
    await db.query("DELETE FROM evidence_favorites WHERE user_id=?", [id]);
    await db.query("DELETE FROM evidence WHERE id=?", [id]);
    await db.query("DELETE FROM assessment_types WHERE id=?", [id]);
    await db.query("DELETE FROM users WHERE id=?", [id]);
    await db.query("DELETE FROM units WHERE id=?", [id]);
    await db.end();
    sqlite.close();
    await rm(dir, { recursive: true, force: true });
  }
});
