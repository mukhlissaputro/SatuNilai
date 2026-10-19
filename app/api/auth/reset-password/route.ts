import { env } from "../../../../server/runtime";
import { ApiError, apiError, assertSameOrigin, hashPassword, hashToken } from "../../_security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { token?: string; password?: string };
    const db = (env as unknown as { DB: LocalDatabase }).DB;
    const tokenHash = await hashToken(String(body.token ?? ""));
    const reset = await db.prepare("SELECT id,user_id AS userId FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>? LIMIT 1").bind(tokenHash, new Date().toISOString()).first<{ id: string; userId: string }>();
    if (!reset) throw new ApiError(400, "Tautan reset tidak valid atau telah kedaluwarsa");
    const password = await hashPassword(String(body.password ?? ""));
    await db.batch([
      db.prepare("UPDATE users SET password_hash=?,password_salt=?,password_changed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(password.hash, password.salt, reset.userId),
      db.prepare("UPDATE password_reset_tokens SET used_at=CURRENT_TIMESTAMP WHERE id=?").bind(reset.id),
      db.prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(reset.userId),
    ]);
    return Response.json({ reset: true });
  } catch (error) { return apiError(error); }
}
