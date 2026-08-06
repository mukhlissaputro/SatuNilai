import { and, eq } from "drizzle-orm";
import { env } from "cloudflare:workers";
import { getDb } from "../../../../../db";
import { evidence, evidenceVersions } from "../../../../../db/schema";
import {
  ApiError,
  apiError,
  audit,
  getEvidenceBucket,
  requireUser,
} from "../../../_security";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const [row] = await getDb()
      .select({
        id: evidence.id,
        unitId: evidence.unitId,
        status: evidence.status,
        objectKey: evidenceVersions.objectKey,
        filename: evidenceVersions.originalFilename,
        contentType: evidenceVersions.contentType,
      })
      .from(evidence)
      .innerJoin(
        evidenceVersions,
        and(
          eq(evidenceVersions.evidenceId, evidence.id),
          eq(evidenceVersions.id, evidence.currentVersionId),
        ),
      )
      .where(eq(evidence.id, id))
      .limit(1);
    if (!row || row.status === "deleted" || !row.objectKey)
      throw new ApiError(404, "Berkas tidak ditemukan");
    if (user.role === "staff" && user.unitId !== row.unitId)
      throw new ApiError(403, "Anda tidak memiliki akses ke berkas ini");
    if (user.role !== "admin") {
      const access = await (env as unknown as { DB: D1Database }).DB.prepare("SELECT 1 ok FROM evidence_links el JOIN indicator_scores s ON s.id=el.score_id JOIN assessment_periods p ON p.id=s.period_id JOIN user_assessment_types uat ON uat.assessment_type_id=p.assessment_type_id AND uat.user_id=? WHERE el.evidence_id=? LIMIT 1").bind(user.id, id).first();
      if (!access) throw new ApiError(403, "Bukti tidak termasuk dalam akses penilaian Anda");
    }
    const object = await getEvidenceBucket().get(row.objectKey);
    if (!object) throw new ApiError(404, "Berkas tidak ditemukan");
    await audit(request, user, "evidence.downloaded", "evidence", row.id);
    const disposition =
      new URL(request.url).searchParams.get("view") === "1"
        ? "inline"
        : "attachment";
    return new Response(object.body, {
      headers: {
        "Content-Type": row.contentType ?? "application/octet-stream",
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(row.filename ?? "document")}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
