import { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";

export const tableOrder = ["units", "users", "assessment_types", "instrument_versions", "categories", "subcategories", "indicators", "score_options", "assessment_periods", "assignments", "indicator_scores", "evidence", "evidence_favorites", "evidence_versions", "evidence_links", "auth_sessions", "password_reset_tokens", "user_assessment_types", "notification_reads", "audit_logs"];

export async function exportLegacy(source, snapshot) {
  const original = new DatabaseSync(source, { readOnly: true });
  try { original.prepare("VACUUM INTO ?").run(snapshot); }
  finally { original.close(); }
  const db = new DatabaseSync(snapshot, { readOnly: true });
  try {
    if (db.prepare("PRAGMA integrity_check").get().integrity_check !== "ok") throw new Error("SQLite integrity check failed");
    if (db.prepare("PRAGMA foreign_key_check").all().length) throw new Error("SQLite foreign key check failed");
    const tables = {};
    for (const table of tableOrder) {
      const columns = db.prepare(`PRAGMA table_info("${table}")`).all().map((column) => column.name);
      if (!columns.length && table === "evidence_favorites") continue; // Older databases predate favorites.
      if (!columns.length) throw new Error(`Missing legacy application table: ${table}`);
      tables[table] = { columns, rows: db.prepare(`SELECT * FROM "${table}" ORDER BY ${table === "user_assessment_types" ? '"user_id","assessment_type_id"' : table === "evidence_favorites" ? '"user_id","evidence_id"' : '"id"'}`).all() };
    }
    const fingerprint = createHash("sha256").update(JSON.stringify(tables)).digest("hex");
    return { format: "satunilai-legacy-v1", exportedAt: new Date().toISOString(), fingerprint, tables };
  } finally { db.close(); }
}
