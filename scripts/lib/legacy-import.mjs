import { createHash } from "node:crypto";
import { verifyMariaSchema } from "./verify-schema.mjs";

const order = ["units", "users", "assessment_types", "instrument_versions", "categories", "subcategories", "indicators", "score_options", "assessment_periods", "assignments", "indicator_scores", "evidence", "evidence_favorites", "evidence_versions", "evidence_links", "auth_sessions", "password_reset_tokens", "user_assessment_types", "notification_reads", "audit_logs"];
const userReferences = { evidence_favorites: ["user_id"], assignments: ["assigned_by"], assessment_periods: ["finalized_by"], indicator_scores: ["reviewed_by"], evidence: ["created_by"], evidence_versions: ["uploaded_by"], auth_sessions: ["user_id"], password_reset_tokens: ["user_id"], user_assessment_types: ["user_id"], notification_reads: ["user_id"], audit_logs: ["actor_id"] };
const quote = (name) => {
  if (!/^[a-z_]+$/.test(name)) throw new Error("Invalid SQL identifier");
  return `\`${name}\``;
};
const equal = (left, right) => left === right || (typeof left === "number" && typeof right === "boolean" && left === Number(right));

export async function importLegacy(connection, payload, { dryRun = false, verifyOnly = false, mergeAdminEmail } = {}) {
  if (payload.format !== "satunilai-legacy-v1" || Object.keys(payload.tables).sort().join() !== order.filter((table) => table !== "evidence_favorites" || payload.tables.evidence_favorites).sort().join()) throw new Error("Unsupported legacy export");
  const fingerprint = createHash("sha256").update(JSON.stringify(payload.tables)).digest("hex");
  if (fingerprint !== payload.fingerprint) throw new Error("Source fingerprint mismatch");
  if (payload.tables.evidence_versions.rows.some((row) => row.object_key)) throw new Error("File evidence requires a verified document transfer before import");
  await verifyMariaSchema(connection);
  const report = { fingerprint, dryRun, verifyOnly, accountsMerged: [], tables: {} };
  const userMap = new Map();
  const mergedUsers = new Set();
  await connection.beginTransaction();
  try {
    const [targetUsers] = await connection.query("SELECT * FROM users FOR UPDATE");
    for (const source of payload.tables.users.rows) {
      const existing = targetUsers.find((user) => user.email.toLowerCase() === source.email.toLowerCase());
      if (existing && existing.id !== source.id) {
        if (source.email.toLowerCase() !== mergeAdminEmail?.toLowerCase() || existing.role !== "admin" || source.role !== "admin") throw new Error("Account collision requires explicit admin merge authorization");
        userMap.set(source.id, existing.id);
        mergedUsers.add(source.id);
        report.accountsMerged.push({ sourceId: source.id, targetId: existing.id, policy: "source-profile-with-target-id-and-credentials" });
      }
    }
    for (const table of order) {
      const source = payload.tables[table];
      if (!source && table === "evidence_favorites") continue;
      const [schema] = await connection.query("SELECT COLUMN_NAME AS name,CHARACTER_MAXIMUM_LENGTH AS maxLength FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=?", [table]);
      for (const column of source.columns) if (!schema.some((item) => item.name === column)) throw new Error(`Destination column missing: ${table}.${column}`);
      const totals = { source: source.rows.length, inserted: 0, existing: 0, merged: 0, verified: 0 };
      report.tables[table] = totals;
      for (const original of source.rows) {
        const row = { ...original };
        const merged = table === "users" && mergedUsers.has(original.id);
        if (merged) {
          const target = targetUsers.find((user) => user.id === userMap.get(original.id));
          const preserved = ["id", "email", "password_hash", "password_salt", "password_changed_at"];
          for (const column of preserved) row[column] = target[column];
          const profile = source.columns.filter((column) => !preserved.includes(column));
          if (profile.some((column) => !equal(row[column], target[column]))) {
            if (verifyOnly) throw new Error("Merged admin profile differs from source");
            await connection.query(`UPDATE users SET ${profile.map((column) => `${quote(column)}=?`).join(",")} WHERE id=?`, [...profile.map((column) => row[column]), target.id]);
          }
          totals.merged++;
        }
        for (const column of userReferences[table] ?? []) if (userMap.has(row[column])) row[column] = userMap.get(row[column]);
        for (const column of schema) if (typeof row[column.name] === "string" && column.maxLength && [...row[column.name]].length > Number(column.maxLength)) throw new Error(`Value too long: ${table}.${column.name}`);
        const keys = table === "user_assessment_types" ? ["user_id", "assessment_type_id"] : table === "evidence_favorites" ? ["user_id", "evidence_id"] : ["id"];
        const where = keys.map((key) => `${quote(key)}=?`).join(" AND ");
        const args = keys.map((key) => row[key]);
        const [existing] = await connection.query(`SELECT * FROM ${quote(table)} WHERE ${where}`, args);
        if (!existing.length) {
          if (verifyOnly) throw new Error(`Missing migrated row: ${table}`);
          await connection.query(`INSERT INTO ${quote(table)} (${source.columns.map(quote).join(",")}) VALUES (${source.columns.map(() => "?").join(",")})`, source.columns.map((column) => row[column]));
          totals.inserted++;
        } else if (!merged) totals.existing++;
        const [[stored]] = await connection.query(`SELECT * FROM ${quote(table)} WHERE ${where}`, args);
        for (const column of source.columns) if (!equal(row[column], stored[column])) throw new Error(`Migration conflict: ${table}.${column}`);
        totals.verified++;
      }
    }
    if (dryRun || verifyOnly) await connection.rollback();
    else await connection.commit();
    return report;
  } catch (error) {
    await connection.rollback();
    // Do not include SQL values, password hashes or session tokens in diagnostics.
    throw new Error(error.code ? `Migration rejected by MariaDB: ${error.code}` : error.message);
  }
}
