import { env } from "cloudflare:workers";
import { ApiError, apiError, assertSameOrigin, audit, createSession, sessionCookie, verifyPassword } from "../../_security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const body = await request.json() as { email?: string; password?: string };
    const email = String(body.email ?? "").trim().toLowerCase().slice(0, 180);
    const password = String(body.password ?? "");
    const db = (env as unknown as { DB: D1Database }).DB;
    const user = await db.prepare("SELECT id,email,display_name AS displayName,role,unit_id AS unitId,password_hash AS passwordHash,password_salt AS passwordSalt FROM users WHERE email=? AND active=1 LIMIT 1").bind(email).first<Record<string, string | null>>();
    const valid = user?.passwordHash && user?.passwordSalt ? await verifyPassword(password, user.passwordSalt, user.passwordHash) : false;
    if (!user || !valid) throw new ApiError(401, "Email atau password tidak sesuai");
    const token = await createSession(String(user.id));
    const current = { id: String(user.id), email: String(user.email), displayName: String(user.displayName), role: user.role as "admin" | "staff" | "head", unitId: user.unitId ? String(user.unitId) : null };
    await audit(request, current, "auth.login", "user", current.id);
    return Response.json({ user: current }, { headers: { "Set-Cookie": sessionCookie(token, request), "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
