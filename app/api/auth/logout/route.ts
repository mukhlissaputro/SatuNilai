import { env } from "../../../../server/runtime";
import { apiError, assertSameOrigin, clearSessionCookie, hashToken } from "../../_security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const token = (request.headers.get("cookie") ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith("satunilai_session="))?.slice("satunilai_session=".length);
    if (token) await (env as unknown as { DB: LocalDatabase }).DB.prepare("DELETE FROM auth_sessions WHERE token_hash=?").bind(await hashToken(token)).run();
    return Response.json({ loggedOut: true }, { headers: { "Set-Cookie": clearSessionCookie(request) } });
  } catch (error) { return apiError(error); }
}
