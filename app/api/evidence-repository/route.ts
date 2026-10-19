import { env } from "../../../server/runtime";
import { ApiError, apiError, assertSameOrigin, audit, getEvidenceBucket, requireUser } from "../_security";

type Runtime = { DB: LocalDatabase };
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]);
const safeFilename = (name: string) => name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
const safeUrl = (value: string) => { try { const url = new URL(value); return url.protocol === "https:" && !["localhost", "127.0.0.1", "::1"].includes(url.hostname); } catch { return false; } };
const validMagic = (type: string, bytes: Uint8Array) => type === "application/pdf" ? bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 : type === "image/png" ? bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 : type === "image/jpeg" ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff : bytes[0] === 0x50 && bytes[1] === 0x4b;

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const db = (env as unknown as Runtime).DB;
    const url = new URL(request.url);
    const typeId = url.searchParams.get("typeId") ?? "";
    const periodId = url.searchParams.get("periodId") ?? "";
    const accessJoin = user.role === "admin" ? "" : "JOIN user_assessment_types uat ON uat.assessment_type_id=t.id AND uat.user_id=?";
    const accessValues = user.role === "admin" ? [] : [user.id];
    const [types, periods] = await Promise.all([
      db.prepare(`SELECT DISTINCT t.id,t.code,t.name FROM assessment_types t ${accessJoin} WHERE t.active=1 ORDER BY t.code`).bind(...accessValues).all(),
      db.prepare(`SELECT DISTINCT p.id,p.assessment_type_id AS typeId,p.year,p.name FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id ${accessJoin} ORDER BY p.year DESC,t.code`).bind(...accessValues).all(),
    ]);
    const conditions = ["e.status='active'"];
    const values: string[] = [];
    if (user.role === "staff") {
      if (user.unitId) { conditions.push("e.unit_id=?"); values.push(String(user.unitId)); }
      else { conditions.push("e.created_by=?"); values.push(user.id); }
    }
    if (user.role !== "admin") { conditions.push("(p.id IS NULL OR EXISTS(SELECT 1 FROM user_assessment_types ax WHERE ax.user_id=? AND ax.assessment_type_id=p.assessment_type_id))"); values.push(user.id); }
    if (typeId) { conditions.push("p.assessment_type_id=?"); values.push(typeId); }
    if (periodId) { conditions.push("p.id=?"); values.push(periodId); }
    const rows = await db.prepare(`SELECT e.id,e.title,e.source_type AS sourceType,e.rejected_at AS rejectedAt,e.created_at AS createdAt,ev.original_filename AS filename,ev.external_url AS externalUrl,ev.size_bytes AS sizeBytes,COUNT(DISTINCT el.id) AS linkCount,GROUP_CONCAT(DISTINCT i.code) AS indicatorCodes,GROUP_CONCAT(DISTINCT t.code) AS typeCodes,GROUP_CONCAT(DISTINCT p.year) AS years FROM evidence e JOIN evidence_versions ev ON ev.id=e.current_version_id LEFT JOIN evidence_links el ON el.evidence_id=e.id LEFT JOIN indicator_scores s ON s.id=el.score_id LEFT JOIN indicators i ON i.id=s.indicator_id LEFT JOIN assessment_periods p ON p.id=s.period_id LEFT JOIN assessment_types t ON t.id=p.assessment_type_id WHERE ${conditions.join(" AND ")} GROUP BY e.id ORDER BY e.created_at DESC`).bind(...values).all();
    return Response.json({ types: types.results, periods: periods.results, evidence: rows.results, user: { role: user.role } }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, ["admin", "staff"]);
    const form = await request.formData();
    const title = String(form.get("title") ?? "").trim().slice(0, 180);
    const externalUrl = String(form.get("url") ?? "").trim();
    const file = form.get("file");
    if (!title || (file instanceof File) === Boolean(externalUrl)) throw new ApiError(400, "Isi judul dan pilih tepat satu berkas atau tautan HTTPS");
    const db = (env as unknown as Runtime).DB;
    let unitId = user.unitId ?? String((await db.prepare("SELECT id FROM units WHERE active=1 ORDER BY created_at LIMIT 1").first<{ id: string }>())?.id ?? "");
    if (!unitId) {
      unitId = `repository-${user.id}`;
      await db.prepare("INSERT IGNORE INTO units(id,code,name,active) VALUES(?,?,?,1)").bind(unitId, `REPO-${user.id.slice(0, 12)}`, `Repositori ${user.displayName}`).run();
    }
    const evidenceId = crypto.randomUUID(); const versionId = crypto.randomUUID();
    let objectKey: string | null = null; let filename: string | null = null; let contentType: string | null = null; let sizeBytes: number | null = null; let sha256: string | null = null;
    if (file instanceof File) {
      if (!ALLOWED_TYPES.has(file.type) || file.size <= 0 || file.size > MAX_FILE_SIZE) throw new ApiError(415, "Jenis atau ukuran berkas tidak diizinkan");
      const buffer = await file.arrayBuffer(); if (!validMagic(file.type, new Uint8Array(buffer).slice(0, 8))) throw new ApiError(415, "Isi berkas tidak sesuai jenisnya");
      sha256 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", buffer))).map((value) => value.toString(16).padStart(2, "0")).join("");
      filename = safeFilename(file.name); contentType = file.type; sizeBytes = file.size; objectKey = `${unitId}/${new Date().getUTCFullYear()}/${evidenceId}/${versionId}`;
      await getEvidenceBucket().put(objectKey, buffer, { httpMetadata: { contentType }, customMetadata: { sha256, originalFilename: filename } });
    } else if (!safeUrl(externalUrl)) throw new ApiError(400, "Tautan harus menggunakan HTTPS dan bukan alamat lokal");
    await db.batch([
      db.prepare("INSERT INTO evidence(id,unit_id,title,source_type,current_version_id,status,created_by) VALUES(?,?,?,?,?,'active',?)").bind(evidenceId, unitId, title, file instanceof File ? "file" : "link", versionId, user.id),
      db.prepare("INSERT INTO evidence_versions(id,evidence_id,version,object_key,external_url,original_filename,content_type,size_bytes,sha256,uploaded_by) VALUES(?,?,1,?,?,?,?,?,?,?)").bind(versionId, evidenceId, objectKey, externalUrl || null, filename, contentType, sizeBytes, sha256, user.id),
    ]);
    await audit(request, user, "evidence.repository_created", "evidence", evidenceId, { sourceType: file instanceof File ? "file" : "link" });
    return Response.json({ id: evidenceId, saved: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, ["admin"]);
    const id = String((await request.json() as { id?: string }).id ?? "");
    const db = (env as unknown as Runtime).DB;
    const usage = await db.prepare("SELECT COUNT(*) AS total,GROUP_CONCAT(DISTINCT i.code) AS indicators FROM evidence_links el JOIN indicator_scores s ON s.id=el.score_id JOIN indicators i ON i.id=s.indicator_id WHERE el.evidence_id=?").bind(id).first<{ total: number; indicators: string | null }>();
    if (Number(usage?.total ?? 0)) throw new ApiError(409, `Dokumen masih digunakan pada indikator ${usage?.indicators ?? "terkait"} dan tidak dapat dihapus`);
    const result = await db.prepare("UPDATE evidence SET status='deleted',updated_at=CURRENT_TIMESTAMP WHERE id=? AND status='active'").bind(id).run();
    if (!result.meta.changes) throw new ApiError(404, "Dokumen tidak ditemukan");
    await audit(request, user, "evidence.repository_deleted", "evidence", id);
    return Response.json({ deleted: true });
  } catch (error) { return apiError(error); }
}
