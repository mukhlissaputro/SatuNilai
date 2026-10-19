import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { exportLegacy } from "../scripts/lib/legacy-export.mjs";

test("snapshot menyertakan WAL, semua tabel aplikasi, dan tidak mengubah sumber", async () => {
  const dir = await mkdtemp(join(tmpdir(), "satunilai-export-"));
  const source = join(dir, "source.sqlite");
  const db = new DatabaseSync(source);
  try {
    db.exec(await readFile(new URL("../database.sql", import.meta.url), "utf8"));
    db.exec("PRAGMA journal_mode=WAL; CREATE TABLE _cf_METADATA(key TEXT,value TEXT); INSERT INTO _cf_METADATA VALUES('internal','preserved in snapshot'); INSERT INTO units(id,code,name) VALUES('unit-test','TEST','Unit uji');");
    db.exec("INSERT INTO users(id,email,display_name,unit_id) VALUES('user-test','test@localhost','User uji','unit-test'); INSERT INTO assessment_types(id,code,name,is_public) VALUES('type-test','PUBLIC','Penilaian',1); INSERT INTO evidence(id,unit_id,title,source_type,created_by) VALUES('evidence-test','unit-test','Bukti','link','user-test'); INSERT INTO evidence_favorites(user_id,evidence_id) VALUES('user-test','evidence-test');");
    const result = await exportLegacy(source, join(dir, "snapshot.sqlite"));
    assert.equal(Object.keys(result.tables).length, 20);
    assert.equal(result.tables.units.rows[0].name, "Unit uji");
    assert.equal(result.tables.assessment_types.rows[0].is_public, 1);
    assert.equal(result.tables.evidence_favorites.rows[0].evidence_id, "evidence-test");
    assert.deepEqual(result.tables.evidence_favorites.columns, ["user_id", "evidence_id", "created_at"]);
    assert.equal(result.tables._cf_METADATA, undefined);
    assert.equal(db.prepare("SELECT COUNT(*) n FROM units").get().n, 1);
    const snapshot = new DatabaseSync(join(dir, "snapshot.sqlite"), { readOnly: true });
    try { assert.equal(snapshot.prepare("SELECT COUNT(*) n FROM _cf_METADATA").get().n, 1); }
    finally { snapshot.close(); }
  } finally { db.close(); await rm(dir, { recursive: true, force: true }); }
});

test("export menolak sumber yang relasinya rusak", async () => {
  const dir = await mkdtemp(join(tmpdir(), "satunilai-invalid-"));
  const db = new DatabaseSync(join(dir, "source.sqlite"));
  try {
    db.exec(await readFile(new URL("../database.sql", import.meta.url), "utf8"));
    db.exec("PRAGMA foreign_keys=OFF; INSERT INTO users(id,email,display_name,unit_id) VALUES('bad','bad@localhost','Bad','missing');");
    await assert.rejects(exportLegacy(join(dir, "source.sqlite"), join(dir, "snapshot.sqlite")), /foreign key/i);
  } finally { db.close(); await rm(dir, { recursive: true, force: true }); }
});


test("export tetap menerima database lama sebelum fitur publik dan favorit", async () => {
  const dir = await mkdtemp(join(tmpdir(), "satunilai-old-export-"));
  const source = join(dir, "source.sqlite");
  const db = new DatabaseSync(source);
  try {
    db.exec(await readFile(new URL("../database.sql", import.meta.url), "utf8"));
    db.exec("DROP TABLE evidence_favorites; DROP INDEX idx_assessment_types_public_active; ALTER TABLE assessment_types DROP COLUMN is_public;");
    const result = await exportLegacy(source, join(dir, "snapshot.sqlite"));
    assert.equal(Object.keys(result.tables).length, 19);
    assert.equal(result.tables.evidence_favorites, undefined);
  } finally { db.close(); await rm(dir, { recursive: true, force: true }); }
});
