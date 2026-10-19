import mysql from "mysql2/promise";
import { readFile, readdir, mkdir } from "node:fs/promises";
import { createHash, pbkdf2Sync, randomBytes, randomUUID } from "node:crypto";

const connection = await mysql.createConnection({ host: process.env.DB_HOST ?? "127.0.0.1", port: Number(process.env.DB_PORT ?? 3306), user: process.env.DB_USER ?? "satunilai", password: process.env.DB_PASSWORD, database: process.env.DB_NAME ?? "satunilai", timezone: "Z" });
try {
  const [[lock]] = await connection.query("SELECT GET_LOCK('satunilai_init',60) AS acquired");
  if (Number(lock.acquired) !== 1) throw new Error("Cannot acquire initialization lock");
  await connection.query("CREATE TABLE IF NOT EXISTS schema_migrations (name VARCHAR(255) PRIMARY KEY, sha256 CHAR(64) NOT NULL, applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");
  await connection.query("CREATE TABLE IF NOT EXISTS schema_migration_steps (migration VARCHAR(255) NOT NULL, step_number INT NOT NULL, sha256 CHAR(64) NOT NULL, PRIMARY KEY(migration,step_number))");
  const files = (await readdir(new URL("../drizzle-mysql/", import.meta.url))).filter((name) => name.endsWith(".sql")).sort();
  for (const name of files) {
    const source = await readFile(new URL(`../drizzle-mysql/${name}`, import.meta.url), "utf8");
    const hash = createHash("sha256").update(source).digest("hex");
    const [applied] = await connection.query("SELECT sha256 FROM schema_migrations WHERE name=?", [name]);
    if (applied.length) {
      if (applied[0].sha256 !== hash) throw new Error(`Applied migration changed: ${name}`);
      continue;
    }
    const statements = source.split("--> statement-breakpoint").map((s) => s.trim()).filter(Boolean);
    for (const [index, statement] of statements.entries()) {
      const stepHash = createHash("sha256").update(statement).digest("hex");
      const [steps] = await connection.query("SELECT sha256 FROM schema_migration_steps WHERE migration=? AND step_number=?", [name, index]);
      if (steps.length) {
        if (steps[0].sha256 !== stepHash) throw new Error(`Migration step changed: ${name}:${index}`);
        continue;
      }
      // The initial schema tolerates a retry after MariaDB's implicit DDL commit.
      let sql = statement;
      if (name.startsWith("0000_")) {
        sql = sql.replace(/^CREATE TABLE /, "CREATE TABLE IF NOT EXISTS ").replace(/^CREATE INDEX /, "CREATE INDEX IF NOT EXISTS ");
      }
      // Preserve the checksum of the historical malformed batch. Migration 0001
      // recreates all its foreign keys/indexes, including on a clean database.
      if (name === "0000_hot_starjammers.sql" && statement.includes("--> stat_")) sql = "SELECT 1";
      const constraint = statement.match(/^ALTER TABLE `([^`]+)` ADD CONSTRAINT `([^`]+)`/);
      if (constraint) {
        const [existing] = await connection.query("SELECT 1 FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=? AND CONSTRAINT_NAME=?", [constraint[1], constraint[2]]);
        if (existing.length) sql = "SELECT 1";
      }
      await connection.query(sql);
      await connection.query("INSERT INTO schema_migration_steps(migration,step_number,sha256) VALUES(?,?,?)", [name, index, stepHash]);
    }
    await connection.query("INSERT INTO schema_migrations(name,sha256) VALUES(?,?)", [name, hash]);
    console.log(`Migration applied: ${name}`);
  }
  const [[{ total }]] = await connection.query("SELECT COUNT(*) AS total FROM users");
  if (Number(total) === 0) {
    const password = process.env.ADMIN_PASSWORD ?? "";
    const email = (process.env.ADMIN_EMAIL ?? "admin@localhost").trim().toLowerCase();
    if (password.length < 10 || password.length > 128 || !email.includes("@")) throw new Error("ADMIN_EMAIL atau ADMIN_PASSWORD tidak valid");
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(password, salt, 210000, 32, "sha256").toString("hex");
    const unitId = randomUUID();
    await connection.beginTransaction();
    try {
      await connection.query("INSERT INTO units(id,code,name) VALUES(?,?,?)", [unitId, "INTERNAL", "Unit Internal"]);
      await connection.query("INSERT INTO users(id,email,display_name,role,unit_id,password_hash,password_salt,password_changed_at) VALUES(?,?,?,'admin',?,?,?,?)", [randomUUID(), email, process.env.ADMIN_NAME ?? "Administrator Lemari Digital", unitId, hash, salt, new Date().toISOString()]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    console.log("Administrator awal dan unit internal dibuat.");
  }
  await mkdir(process.env.EVIDENCE_DIR ?? "./data/evidence", { recursive: true });
} finally {
  await connection.query("SELECT RELEASE_LOCK('satunilai_init')").catch(() => {});
  await connection.end();
}
