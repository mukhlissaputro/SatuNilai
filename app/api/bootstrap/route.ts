import { sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { users } from "../../../db/schema";
import { ApiError, apiError, assertSameOrigin, audit } from "../_security";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const id = request.headers.get("oai-authenticated-user-id");
    const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
    if (!id || !email) throw new ApiError(401, "Autentikasi diperlukan");
    const db = getDb();
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(users);
    if (Number(count) === 0) {
      const encodedName = request.headers.get("oai-authenticated-user-full-name");
      let displayName = email;
      if (encodedName && request.headers.get("oai-authenticated-user-full-name-encoding") === "percent-encoded-utf-8") {
        try { displayName = decodeURIComponent(encodedName); } catch { /* use email */ }
      }
      const current = { id, email, displayName, role: "admin" as const, unitId: null };
      await db.insert(users).values({ id, email, displayName, role: "admin" });
      await audit(request, current, "system.bootstrap", "user", id, { role: "admin" });
      return Response.json({ initialized: true, user: current }, { status: 201 });
    }
    return Response.json({ initialized: false });
  } catch (error) { return apiError(error); }
}
