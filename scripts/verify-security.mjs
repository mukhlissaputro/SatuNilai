import assert from "node:assert/strict";
import mysql from "mysql2/promise";
import { createHash, randomBytes, randomUUID } from "node:crypto";

const db = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
const sessionId = randomUUID(); const resetId = randomUUID();
const session = randomBytes(32).toString("hex"); const reset = randomBytes(32).toString("hex");
const hash = (token) => createHash("sha256").update(token).digest("hex");
try {
  const [[admin]] = await db.query("SELECT id FROM users WHERE role='admin' LIMIT 1");
  const expired = new Date(Date.now() - 1000).toISOString();
  await db.query("INSERT INTO auth_sessions(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)", [sessionId, admin.id, hash(session), expired]);
  await db.query("INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at) VALUES(?,?,?,?)", [resetId, admin.id, hash(reset), expired]);
  const base = "http://127.0.0.1:3000";
  assert.equal((await fetch(`${base}/api/me`, { headers: { cookie: `satunilai_session=${session}` } })).status, 401, "Expired sessions must be rejected");
  assert.equal((await fetch(`${base}/api/auth/reset-password`, { method: "POST", headers: { "content-type": "application/json", origin: base }, body: JSON.stringify({ token: reset, password: randomBytes(16).toString("hex") }) })).status, 400, "Expired password reset tokens must be rejected");
  assert.equal((await fetch(`${base}/api/bootstrap`, { method: "POST", headers: { "oai-authenticated-user-id": "forged", "oai-authenticated-user-email": "forged@localhost" } })).status, 403);
  console.log("PASS: expired sessions, expired password reset, forged bootstrap rejected.");
} finally {
  await db.query("DELETE FROM auth_sessions WHERE id=?", [sessionId]);
  await db.query("DELETE FROM password_reset_tokens WHERE id=?", [resetId]);
  await db.end();
}
