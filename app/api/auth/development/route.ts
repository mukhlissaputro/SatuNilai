import { database } from "../../../../server/database";
import { ApiError, apiError, assertSameOrigin, audit, createSession, sessionCookie, type CurrentUser } from "../../_security";

function requireDevelopment(request: Request) {
  if (process.env.NODE_ENV !== "development" || process.env.DEV_QUICK_LOGIN !== "1" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)) throw new ApiError(404, "Halaman tidak ditemukan");
  assertSameOrigin(request);
}

function choices() {
  return [
    { key: "admin", email: process.env.ADMIN_EMAIL ?? "admin@localhost", role: "admin", label: "Administrator" },
    { key: "staff", email: "staff@localhost", role: "staff", label: "Staf" },
    { key: "head", email: "kepala.unit@localhost", role: "head", label: "Kepala Unit" },
  ];
}

export async function GET(request: Request) {
  try {
    requireDevelopment(request);
    const accounts = [];
    for (const choice of choices()) {
      const account = await database.prepare("SELECT display_name AS displayName FROM users WHERE email=? AND role=? AND active=1 LIMIT 1").bind(choice.email, choice.role).first<{ displayName: string }>();
      if (account) accounts.push({ ...choice, displayName: account.displayName });
    }
    return Response.json({ accounts }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    requireDevelopment(request);
    if (!request.headers.get("origin")) throw new ApiError(403, "Asal permintaan wajib disertakan");
    const body = await request.json() as { account?: string };
    const choice = choices().find((choice) => choice.key === body.account);
    if (!choice) throw new ApiError(400, "Akun development tidak valid");
    const user = await database.prepare("SELECT id,email,display_name AS displayName,role,unit_id AS unitId FROM users WHERE email=? AND role=? AND active=1 LIMIT 1").bind(choice.email, choice.role).first<CurrentUser>();
    if (!user) throw new ApiError(403, "Akun tidak tersedia atau telah dinonaktifkan");
    await audit(request, user, "auth.development_login", "user", user.id);
    const token = await createSession(user.id);
    return Response.json({ user }, { headers: { "Set-Cookie": sessionCookie(token, request), "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
