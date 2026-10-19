import { database } from "../../../server/database";
import { access, constants } from "node:fs/promises";

export async function GET() {
  try {
    await database.prepare("SELECT 1 AS ok").first();
    await access(process.env.EVIDENCE_DIR ?? "./data/evidence", constants.R_OK | constants.W_OK);
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
