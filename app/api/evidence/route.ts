import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentPeriods, evidence, evidenceLinks, evidenceVersions, indicatorScores } from "../../../db/schema";
import { ApiError, apiError, assertSameOrigin, audit, getEvidenceBucket, requireAssignment, requireUser } from "../_security";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);

function safeFilename(name: string) { return name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120); }
function isSafeUrl(value: string) { try { const url = new URL(value); return url.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname); } catch { return false; } }
function validMagic(type: string, bytes: Uint8Array) {
  if (type === "application/pdf") return bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
  if (type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return bytes[0] === 0x50 && bytes[1] === 0x4b;
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, ["admin", "staff"]);
    const form = await request.formData();
    const scoreId = String(form.get("scoreId") ?? "");
    const title = String(form.get("title") ?? "").trim().slice(0, 180);
    const externalUrl = String(form.get("url") ?? "").trim();
    const file = form.get("file");
    if (!scoreId || !title) throw new ApiError(400, "Judul dan penilaian indikator wajib diisi");
    if ((file instanceof File) === Boolean(externalUrl)) throw new ApiError(400, "Pilih tepat satu sumber: berkas atau tautan");

    const db = getDb();
    const [score] = await db.select({ id: indicatorScores.id, periodId: indicatorScores.periodId, indicatorId: indicatorScores.indicatorId, unitId: indicatorScores.unitId, status: indicatorScores.status, periodStatus: assessmentPeriods.status }).from(indicatorScores).innerJoin(assessmentPeriods, eq(assessmentPeriods.id, indicatorScores.periodId)).where(eq(indicatorScores.id, scoreId)).limit(1);
    if (!score) throw new ApiError(404, "Penilaian indikator tidak ditemukan");
    await requireAssignment(user, score.periodId, score.indicatorId);
    if (user.role === "staff" && user.unitId !== score.unitId) throw new ApiError(403, "Bukti bukan milik unit Anda");
    if (score.status === "locked" || score.periodStatus === "finalized") throw new ApiError(409, "Penilaian telah dikunci");

    const evidenceId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    let objectKey: string | null = null;
    let filename: string | null = null;
    let contentType: string | null = null;
    let sizeBytes: number | null = null;
    let sha256: string | null = null;

    if (file instanceof File) {
      if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE) throw new ApiError(415, "Jenis atau ukuran berkas tidak diizinkan");
      const buffer = await file.arrayBuffer();
      if (!validMagic(file.type, new Uint8Array(buffer).slice(0, 8))) throw new ApiError(415, "Isi berkas tidak sesuai dengan jenisnya");
      const digest = await crypto.subtle.digest("SHA-256", buffer);
      sha256 = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
      filename = safeFilename(file.name);
      contentType = file.type;
      sizeBytes = file.size;
      objectKey = `${score.unitId}/${new Date().getUTCFullYear()}/${evidenceId}/${versionId}`;
      await getEvidenceBucket().put(objectKey, buffer, { httpMetadata: { contentType }, customMetadata: { sha256, originalFilename: filename } });
    } else if (!isSafeUrl(externalUrl)) throw new ApiError(400, "Tautan harus menggunakan HTTPS dan bukan alamat lokal");

    await db.batch([
      db.insert(evidence).values({ id: evidenceId, unitId: score.unitId, title, sourceType: file instanceof File ? "file" : "link", currentVersionId: versionId, createdBy: user.id }),
      db.insert(evidenceVersions).values({ id: versionId, evidenceId, version: 1, objectKey, externalUrl: externalUrl || null, originalFilename: filename, contentType, sizeBytes, sha256, uploadedBy: user.id }),
      db.insert(evidenceLinks).values({ id: crypto.randomUUID(), evidenceId, scoreId }),
    ]);
    await audit(request, user, "evidence.created", "evidence", evidenceId, { scoreId, sourceType: file instanceof File ? "file" : "link", sha256 });
    return Response.json({ evidence: { id: evidenceId, title, sourceType: file instanceof File ? "file" : "link", filename } }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const scoreId = new URL(request.url).searchParams.get("scoreId") ?? "";
    if (!scoreId) throw new ApiError(400, "scoreId wajib diisi");
    const rows = await getDb().select({ id: evidence.id, title: evidence.title, sourceType: evidence.sourceType, status: evidence.status, versionId: evidence.currentVersionId, filename: evidenceVersions.originalFilename, externalUrl: evidenceVersions.externalUrl, sizeBytes: evidenceVersions.sizeBytes, createdAt: evidence.createdAt }).from(evidenceLinks).innerJoin(evidence, eq(evidence.id, evidenceLinks.evidenceId)).leftJoin(evidenceVersions, and(eq(evidenceVersions.evidenceId, evidence.id), eq(evidenceVersions.id, evidence.currentVersionId))).where(eq(evidenceLinks.scoreId, scoreId));
    return Response.json({ evidence: rows, viewerRole: user.role }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
