import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { evidence, evidenceVersions } from "../../../../../db/schema";
import { ApiError, apiError, audit, getEvidenceBucket, requireUser } from "../../../_security";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser(request);
    const { id } = await context.params;
    const [row] = await getDb().select({ id: evidence.id, unitId: evidence.unitId, status: evidence.status, objectKey: evidenceVersions.objectKey, filename: evidenceVersions.originalFilename, contentType: evidenceVersions.contentType }).from(evidence).innerJoin(evidenceVersions, and(eq(evidenceVersions.evidenceId, evidence.id), eq(evidenceVersions.id, evidence.currentVersionId))).where(eq(evidence.id, id)).limit(1);
    if (!row || row.status === "deleted" || !row.objectKey) throw new ApiError(404, "Berkas tidak ditemukan");
    if (user.role === "staff" && user.unitId !== row.unitId) throw new ApiError(403, "Anda tidak memiliki akses ke berkas ini");
    const object = await getEvidenceBucket().get(row.objectKey);
    if (!object) throw new ApiError(404, "Berkas tidak ditemukan");
    await audit(request, user, "evidence.downloaded", "evidence", row.id);
    return new Response(object.body, { headers: { "Content-Type": row.contentType ?? "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.filename ?? "document")}`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch (error) { return apiError(error); }
}
