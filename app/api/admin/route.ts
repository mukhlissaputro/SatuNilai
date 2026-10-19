import { env } from "../../../server/runtime";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentPeriods, assessmentTypes, categories, indicators, instrumentVersions, subcategories, units, users } from "../../../db/schema";
import { ApiError, apiError, assertSameOrigin, audit, hashPassword, requireUser } from "../_security";

type AdminEnv = { DB: LocalDatabase };
const allowedRoles = new Set(["admin", "staff", "head"]);
const allowedStatuses = new Set(["draft", "open", "review", "finalized"]);

export async function GET(request: Request) {
  try {
    await requireUser(request, ["admin"]);
    const db = (env as unknown as AdminEnv).DB;
    const [unitRows, userRows, typeRows, periodRows, structureRows] = await Promise.all([
      db.prepare("SELECT id, code, name, active FROM units ORDER BY name").all(),
      db.prepare("SELECT u.id, u.email, u.display_name AS displayName, u.role, u.active, GROUP_CONCAT(uat.assessment_type_id) AS assessmentTypeIds FROM users u LEFT JOIN user_assessment_types uat ON uat.user_id=u.id GROUP BY u.id ORDER BY u.display_name").all(),
      db.prepare("SELECT t.id, t.code, t.name, t.description, t.is_public AS isPublic, t.active, COUNT(v.id) AS versions FROM assessment_types t LEFT JOIN instrument_versions v ON v.assessment_type_id = t.id GROUP BY t.id ORDER BY t.code").all(),
      db.prepare("SELECT p.id, p.assessment_type_id AS typeId, p.instrument_version_id AS instrumentVersionId, p.name, p.year, p.max_score AS maxScore, p.starts_at AS startsAt, p.due_at AS dueAt, p.status, t.code AS typeCode, t.name AS typeName, v.version AS versionNumber, v.name AS versionName, v.status AS versionStatus FROM assessment_periods p JOIN assessment_types t ON t.id = p.assessment_type_id JOIN instrument_versions v ON v.id = p.instrument_version_id ORDER BY t.code, p.year DESC").all(),
      db.prepare("SELECT c.id AS categoryId, c.instrument_version_id AS instrumentVersionId, c.code AS categoryCode, c.name AS categoryName, c.weight_percent AS categoryWeight, c.target_value AS categoryTarget, c.sort_order AS categorySortOrder, sc.id AS subcategoryId, sc.code AS subcategoryCode, sc.name AS subcategoryName, sc.weight_percent AS subcategoryWeight, sc.target_value AS subcategoryTarget, sc.sort_order AS subcategorySortOrder, i.id AS indicatorId, i.code AS indicatorCode, i.name AS indicatorName, i.description AS indicatorDescription, i.weight_percent AS indicatorWeight, i.target_value AS indicatorTarget, i.sort_order AS indicatorSortOrder FROM categories c LEFT JOIN subcategories sc ON sc.category_id = c.id LEFT JOIN indicators i ON i.subcategory_id = sc.id ORDER BY c.sort_order, sc.sort_order, i.sort_order").all(),
    ]);
    return Response.json({ units: unitRows.results, users: userRows.results, types: typeRows.results, periods: periodRows.results, structure: structureRows.results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, ["admin"]);
    const body = await request.json() as Record<string, unknown>;
    const resource = String(body.resource ?? "");
    const db = getDb();
    const id = crypto.randomUUID();
    if (resource === "unit") {
      const code = String(body.code ?? "").trim().toUpperCase().slice(0, 30);
      const name = String(body.name ?? "").trim().slice(0, 160);
      if (!code || !name) throw new ApiError(400, "Kode dan nama unit wajib diisi");
      await db.insert(units).values({ id, code, name });
    } else if (resource === "user") {
      const email = String(body.email ?? "").trim().toLowerCase().slice(0, 180);
      const displayName = String(body.name ?? "").trim().slice(0, 160);
      const role = String(body.role ?? "staff");
      const password = await hashPassword(String(body.password ?? ""));
      if (!email.includes("@") || !displayName || !allowedRoles.has(role)) throw new ApiError(400, "Data pengguna tidak valid");
      const binding = (env as unknown as AdminEnv).DB;
      const defaultUnit = await binding.prepare("SELECT id FROM units WHERE active=1 ORDER BY created_at LIMIT 1").first<{ id: string }>();
      if (!defaultUnit) throw new ApiError(409, "Unit internal belum tersedia");
      const requestedTypeIds = Array.isArray(body.assessmentTypeIds) ? body.assessmentTypeIds.map(String).filter(Boolean) : [];
      const allTypeRows = role === "admin" ? await binding.prepare("SELECT id FROM assessment_types").all() : null;
      const typeIds = role === "admin" ? (allTypeRows?.results ?? []).map((row) => String(row.id)) : requestedTypeIds;
      await db.insert(users).values({ id, email, displayName, role: role as "admin" | "staff" | "head", unitId: defaultUnit.id, passwordHash: password.hash, passwordSalt: password.salt, passwordChangedAt: new Date().toISOString() });
      if (typeIds.length) await binding.batch(typeIds.map((typeId) => binding.prepare("INSERT IGNORE INTO user_assessment_types(user_id,assessment_type_id) VALUES(?,?)").bind(id, typeId)));
    } else if (resource === "type") {
      const code = String(body.code ?? "").trim().toUpperCase().slice(0, 30);
      const name = String(body.name ?? "").trim().slice(0, 180);
      if (!code || !name) throw new ApiError(400, "Kode dan nama jenis wajib diisi");
      const isPublic = body.isPublic === true || body.isPublic === 1 || body.isPublic === "1" || body.isPublic === "true";
      await db.insert(assessmentTypes).values({ id, code, name, description: String(body.description ?? "").slice(0, 1000), isPublic });
    } else if (resource === "period") {
      const typeId = String(body.typeId ?? "");
      const year = Number(body.year);
      const maxScore = Number(body.maxScore);
      const name = String(body.name ?? "").trim().slice(0, 180);
      const startsAt = String(body.startsAt ?? "");
      const dueAt = String(body.dueAt ?? "");
      if (!typeId || !Number.isInteger(year) || !name || !Number.isFinite(maxScore) || maxScore <= 0) throw new ApiError(400, "Jenis, tahun, nama periode, dan nilai maksimal wajib diisi dengan benar");
      if (!/^\d{4}-\d{2}-\d{2}/.test(startsAt) || !/^\d{4}-\d{2}-\d{2}/.test(dueAt)) throw new ApiError(400, "Tanggal mulai dan tenggat wajib diisi");
      if (startsAt > dueAt) throw new ApiError(400, "Tanggal mulai tidak boleh melewati tenggat");
      const binding = (env as unknown as AdminEnv).DB;
      const duplicate = await binding.prepare("SELECT id FROM assessment_periods WHERE assessment_type_id = ? AND year = ? LIMIT 1").bind(typeId, year).first();
      if (duplicate) throw new ApiError(409, "Jenis penilaian pada tahun tersebut sudah tersedia");
      const type = await binding.prepare("SELECT code FROM assessment_types WHERE id = ? LIMIT 1").bind(typeId).first<{ code: string }>();
      if (!type) throw new ApiError(404, "Jenis penilaian tidak ditemukan");
      const next = await binding.prepare("SELECT COALESCE(MAX(version), 0) + 1 AS number FROM instrument_versions WHERE assessment_type_id = ?").bind(typeId).first<{ number: number }>();
      const versionId = crypto.randomUUID();
      await db.batch([
        db.insert(instrumentVersions).values({ id: versionId, assessmentTypeId: typeId, version: Number(next?.number ?? 1), name: `Instrumen ${type.code} ${year}`, status: "draft" }),
        db.insert(assessmentPeriods).values({ id, assessmentTypeId: typeId, instrumentVersionId: versionId, year, name, maxScore, startsAt, dueAt, status: "draft" }),
      ]);
    } else if (resource === "structureDuplicate") {
      const binding = (env as unknown as AdminEnv).DB;
      const targetPeriodId = String(body.targetPeriodId ?? "");
      const sourcePeriodId = String(body.sourcePeriodId ?? "");
      if (!targetPeriodId || !sourcePeriodId || targetPeriodId === sourcePeriodId) throw new ApiError(400, "Periode sumber dan tujuan duplikasi tidak valid");
      const pair = await binding.prepare("SELECT target.assessment_type_id AS targetTypeId, target.instrument_version_id AS targetVersionId, target.year AS targetYear, target.max_score AS targetMaxScore, target.status AS targetStatus, source.assessment_type_id AS sourceTypeId, source.instrument_version_id AS sourceVersionId, source.year AS sourceYear FROM assessment_periods target JOIN assessment_periods source ON source.id=? WHERE target.id=? LIMIT 1").bind(sourcePeriodId, targetPeriodId).first<{ targetTypeId: string; targetVersionId: string; targetYear: number; targetMaxScore: number; targetStatus: string; sourceTypeId: string; sourceVersionId: string; sourceYear: number }>();
      if (!pair) throw new ApiError(404, "Periode sumber atau tujuan tidak ditemukan");
      if (pair.targetTypeId !== pair.sourceTypeId || Number(pair.sourceYear) >= Number(pair.targetYear)) throw new ApiError(409, "Instrumen hanya dapat diduplikasi dari tahun sebelumnya pada jenis penilaian yang sama");
      if (pair.targetStatus === "finalized") throw new ApiError(409, "Kategori indikator pada periode final tidak dapat diubah");
      const [targetCount, sourceCount, sourceTarget] = await Promise.all([
        binding.prepare("SELECT COUNT(*) AS count FROM categories WHERE instrument_version_id=?").bind(pair.targetVersionId).first<{ count: number }>(),
        binding.prepare("SELECT COUNT(*) AS count FROM categories WHERE instrument_version_id=?").bind(pair.sourceVersionId).first<{ count: number }>(),
        binding.prepare("SELECT MAX(COALESCE(sc.target_value,0)) AS maxTarget, MAX(COALESCE(so.value,0)) AS maxOption FROM subcategories sc JOIN categories c ON c.id=sc.category_id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN score_options so ON so.indicator_id=i.id WHERE c.instrument_version_id=?").bind(pair.sourceVersionId).first<{ maxTarget: number; maxOption: number }>(),
      ]);
      if (Number(targetCount?.count ?? 0) > 0) throw new ApiError(409, "Periode tujuan sudah memiliki kategori indikator");
      if (Number(sourceCount?.count ?? 0) === 0) throw new ApiError(409, "Tahun sebelumnya belum memiliki kategori indikator untuk diduplikasi");
      if (Math.max(Number(sourceTarget?.maxTarget ?? 0), Number(sourceTarget?.maxOption ?? 0)) > Number(pair.targetMaxScore)) throw new ApiError(409, `Target atau opsi nilai pada instrumen tahun ${pair.sourceYear} melebihi nilai maksimal periode tujuan (${pair.targetMaxScore})`);
      const prefix = `${pair.targetVersionId}:copy`;
      await binding.batch([
        binding.prepare("INSERT INTO categories(id,instrument_version_id,code,name,weight_percent,target_value,sort_order) SELECT CONCAT('copy-category:', MD5(CONCAT(?, ':', c.id))), ?, c.code, c.name, c.weight_percent, NULL, c.sort_order FROM categories c WHERE c.instrument_version_id=?").bind(prefix, pair.targetVersionId, pair.sourceVersionId),
        binding.prepare("INSERT INTO subcategories(id,category_id,code,name,weight_percent,target_value,final_value,sort_order) SELECT CONCAT('copy-subcategory:', MD5(CONCAT(?, ':', sc.id))), CONCAT('copy-category:', MD5(CONCAT(?, ':', sc.category_id))), sc.code, sc.name, sc.weight_percent, sc.target_value, NULL, sc.sort_order FROM subcategories sc JOIN categories c ON c.id=sc.category_id WHERE c.instrument_version_id=?").bind(prefix, prefix, pair.sourceVersionId),
        binding.prepare("INSERT INTO indicators(id,subcategory_id,code,name,description,weight_percent,target_value,sort_order) SELECT CONCAT('copy-indicator:', MD5(CONCAT(?, ':', i.id))), CONCAT('copy-subcategory:', MD5(CONCAT(?, ':', i.subcategory_id))), i.code, i.name, i.description, i.weight_percent, NULL, i.sort_order FROM indicators i JOIN subcategories sc ON sc.id=i.subcategory_id JOIN categories c ON c.id=sc.category_id WHERE c.instrument_version_id=?").bind(prefix, prefix, pair.sourceVersionId),
        binding.prepare("INSERT INTO score_options(id,indicator_id,value,label,description,sort_order) SELECT CONCAT('copy-option:', MD5(CONCAT(?, ':', so.id))), CONCAT('copy-indicator:', MD5(CONCAT(?, ':', so.indicator_id))), so.value, so.label, so.description, so.sort_order FROM score_options so JOIN indicators i ON i.id=so.indicator_id JOIN subcategories sc ON sc.id=i.subcategory_id JOIN categories c ON c.id=sc.category_id WHERE c.instrument_version_id=?").bind(prefix, prefix, pair.sourceVersionId),
      ]);
      await audit(request, user, "structure.duplicated", "assessment_period", targetPeriodId, { sourcePeriodId, sourceYear: pair.sourceYear });
      return Response.json({ saved: true, sourceYear: pair.sourceYear }, { status: 201 });
    } else if (resource === "category") {
      const versionId = String(body.versionId ?? "instrument-spbe-2025-v1");
      await db.insert(categories).values({ id, instrumentVersionId: versionId, code: String(body.code ?? "").slice(0, 30), name: String(body.name ?? "").slice(0, 180), weightPercent: Number(body.weight ?? 0), targetValue: null, sortOrder: Number(body.sortOrder ?? 99) });
    } else if (resource === "subcategory") {
      const targetValue = Number(body.target); if (!Number.isFinite(targetValue) || targetValue < 0) throw new ApiError(400, "Target nilai harus berupa angka nol atau lebih");
      const binding = (env as unknown as AdminEnv).DB;
      const period = await binding.prepare("SELECT p.max_score AS maxScore FROM categories c JOIN assessment_periods p ON p.instrument_version_id=c.instrument_version_id WHERE c.id=? LIMIT 1").bind(String(body.parentId ?? "")).first<{ maxScore: number }>();
      if (!period) throw new ApiError(404, "Periode kategori tidak ditemukan");
      if (targetValue > period.maxScore) throw new ApiError(400, `Target tidak boleh melebihi nilai maksimal periode (${period.maxScore})`);
      await db.insert(subcategories).values({ id, categoryId: String(body.parentId ?? ""), code: String(body.code ?? "").slice(0, 30), name: String(body.name ?? "").slice(0, 180), weightPercent: Number(body.weight ?? 0), targetValue, sortOrder: Number(body.sortOrder ?? 99) });
    } else if (resource === "indicator") {
      await db.insert(indicators).values({ id, subcategoryId: String(body.parentId ?? ""), code: String(body.code ?? "").slice(0, 30), name: String(body.name ?? "").slice(0, 240), weightPercent: Number(body.weight ?? 0), targetValue: null, sortOrder: Number(body.sortOrder ?? 99) });
    } else throw new ApiError(400, "Jenis data tidak dikenali");
    await audit(request, user, `${resource}.created`, resource, id);
    return Response.json({ id, saved: true }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireUser(request, ["admin"]);
    const body = await request.json() as Record<string, unknown>;
    if (!body.id) throw new ApiError(400, "ID wajib diisi");
    const db = getDb();
    const id = String(body.id);
    const now = new Date().toISOString();
    if (body.resource === "type") {
      const code = String(body.code ?? "").trim().toUpperCase().slice(0, 30);
      const name = String(body.name ?? "").trim().slice(0, 180);
      if (!code || !name) throw new ApiError(400, "Kode dan nama jenis wajib diisi");
      const isPublic = body.isPublic === true || body.isPublic === 1 || body.isPublic === "1" || body.isPublic === "true";
      await db.update(assessmentTypes).set({ code, name, description: String(body.description ?? "").slice(0, 1000), isPublic, active: body.active === undefined ? undefined : Boolean(body.active), updatedAt: now }).where(eq(assessmentTypes.id, id));
    } else if (body.resource === "user") {
      const displayName = String(body.name ?? "").trim().slice(0, 160);
      const email = String(body.email ?? "").trim().toLowerCase().slice(0, 180);
      const role = String(body.role ?? "staff");
      if (!displayName || !email.includes("@") || !allowedRoles.has(role)) throw new ApiError(400, "Data pengguna tidak valid");
      await db.update(users).set({ displayName, email, role: role as "admin" | "staff" | "head", active: body.active === undefined ? undefined : Boolean(body.active), updatedAt: now }).where(eq(users.id, id));
      if (String(body.password ?? "")) {
        const password = await hashPassword(String(body.password));
        await db.update(users).set({ passwordHash: password.hash, passwordSalt: password.salt, passwordChangedAt: now, updatedAt: now }).where(eq(users.id, id));
        await (env as unknown as AdminEnv).DB.prepare("DELETE FROM auth_sessions WHERE user_id=?").bind(id).run();
      }
      const binding = (env as unknown as AdminEnv).DB;
      const requestedTypeIds = Array.isArray(body.assessmentTypeIds) ? body.assessmentTypeIds.map(String).filter(Boolean) : [];
      const allTypeRows = role === "admin" ? await binding.prepare("SELECT id FROM assessment_types").all() : null;
      const typeIds = role === "admin" ? (allTypeRows?.results ?? []).map((row) => String(row.id)) : requestedTypeIds;
      await binding.batch([
        binding.prepare("DELETE FROM user_assessment_types WHERE user_id=?").bind(id),
        ...typeIds.map((typeId) => binding.prepare("INSERT IGNORE INTO user_assessment_types(user_id,assessment_type_id) VALUES(?,?)").bind(id, typeId)),
      ]);
    } else if (body.resource === "unit") {
      const code = String(body.code ?? "").trim().toUpperCase().slice(0, 30);
      const name = String(body.name ?? "").trim().slice(0, 160);
      if (!code || !name) throw new ApiError(400, "Kode dan nama unit wajib diisi");
      await db.update(units).set({ code, name, active: body.active === undefined ? undefined : Boolean(body.active), updatedAt: now }).where(eq(units.id, id));
    } else if (body.resource === "period") {
      const year = Number(body.year);
      const maxScore = Number(body.maxScore);
      const status = String(body.status ?? "draft");
      const name = String(body.name ?? "").trim().slice(0, 180);
      const startsAt = String(body.startsAt ?? "");
      const dueAt = String(body.dueAt ?? "");
      if (!Number.isInteger(year) || !Number.isFinite(maxScore) || maxScore <= 0 || !name || !allowedStatuses.has(status) || !/^\d{4}-\d{2}-\d{2}/.test(startsAt) || !/^\d{4}-\d{2}-\d{2}/.test(dueAt) || startsAt > dueAt) throw new ApiError(400, "Data periode, nilai maksimal, dan rentang tanggal tidak valid");
      const binding = (env as unknown as AdminEnv).DB;
      const current = await binding.prepare("SELECT p.assessment_type_id AS typeId, p.instrument_version_id AS versionId, t.code FROM assessment_periods p JOIN assessment_types t ON t.id = p.assessment_type_id WHERE p.id = ? LIMIT 1").bind(id).first<{ typeId: string; versionId: string; code: string }>();
      if (!current) throw new ApiError(404, "Tahun penilaian tidak ditemukan");
      const duplicate = await binding.prepare("SELECT id FROM assessment_periods WHERE assessment_type_id = ? AND year = ? AND id <> ? LIMIT 1").bind(current.typeId, year, id).first();
      if (duplicate) throw new ApiError(409, "Jenis penilaian pada tahun tersebut sudah tersedia");
      const exceeding = await binding.prepare("SELECT MAX(COALESCE(sc.target_value,0)) AS targetMax, MAX(COALESCE(s.internal_value,0)) AS scoreMax FROM assessment_periods p LEFT JOIN categories c ON c.instrument_version_id=p.instrument_version_id LEFT JOIN subcategories sc ON sc.category_id=c.id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=p.id WHERE p.id=?").bind(id).first<{ targetMax: number; scoreMax: number }>();
      if (Number(exceeding?.targetMax ?? 0) > maxScore || Number(exceeding?.scoreMax ?? 0) > maxScore) throw new ApiError(409, "Nilai maksimal tidak boleh lebih kecil dari target atau nilai mandiri yang sudah tersimpan");
      await db.batch([
        db.update(assessmentPeriods).set({ year, name, maxScore, startsAt, dueAt, status: status as "draft" | "open" | "review" | "finalized", updatedAt: now }).where(eq(assessmentPeriods.id, id)),
        db.update(instrumentVersions).set({ name: `Instrumen ${current.code} ${year}`, updatedAt: now }).where(eq(instrumentVersions.id, current.versionId)),
      ]);
    } else if (body.resource === "category") {
      await db.update(categories).set({ code: String(body.code ?? "").trim().slice(0, 30), name: String(body.name ?? "").trim().slice(0, 180), weightPercent: Number(body.weight ?? 0), targetValue: null, sortOrder: Number(body.sortOrder ?? 0), updatedAt: now }).where(eq(categories.id, id));
    } else if (body.resource === "subcategory") {
      const targetValue = Number(body.target); if (!Number.isFinite(targetValue) || targetValue < 0) throw new ApiError(400, "Target nilai harus berupa angka nol atau lebih");
      const binding = (env as unknown as AdminEnv).DB;
      const period = await binding.prepare("SELECT p.max_score AS maxScore FROM subcategories sc JOIN categories c ON c.id=sc.category_id JOIN assessment_periods p ON p.instrument_version_id=c.instrument_version_id WHERE sc.id=? LIMIT 1").bind(id).first<{ maxScore: number }>();
      if (!period) throw new ApiError(404, "Periode subkategori tidak ditemukan");
      if (targetValue > period.maxScore) throw new ApiError(400, `Target tidak boleh melebihi nilai maksimal periode (${period.maxScore})`);
      await db.update(subcategories).set({ code: String(body.code ?? "").trim().slice(0, 30), name: String(body.name ?? "").trim().slice(0, 180), weightPercent: Number(body.weight ?? 0), targetValue, sortOrder: Number(body.sortOrder ?? 0), updatedAt: now }).where(eq(subcategories.id, id));
    } else if (body.resource === "indicator") {
      await db.update(indicators).set({ code: String(body.code ?? "").trim().slice(0, 30), name: String(body.name ?? "").trim().slice(0, 240), description: String(body.description ?? "").slice(0, 1000), weightPercent: Number(body.weight ?? 0), targetValue: null, sortOrder: Number(body.sortOrder ?? 0), updatedAt: now }).where(eq(indicators.id, id));
    }
    else throw new ApiError(400, "Perubahan tidak valid");
    await audit(request, actor, `${body.resource}.updated`, String(body.resource), id);
    return Response.json({ saved: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    const actor = await requireUser(request, ["admin"]);
    const body = await request.json() as { resource?: string; id?: string };
    const resource = String(body.resource ?? "");
    const id = String(body.id ?? "");
    if (!id) throw new ApiError(400, "ID wajib diisi");
    if (resource === "user" && id === actor.id) throw new ApiError(409, "Administrator yang sedang digunakan tidak dapat dihapus");
    const db = getDb();
    if (resource === "type") await db.delete(assessmentTypes).where(eq(assessmentTypes.id, id));
    else if (resource === "user") {
      const binding = (env as unknown as AdminEnv).DB;
      await binding.batch([binding.prepare("DELETE FROM user_assessment_types WHERE user_id=?").bind(id), binding.prepare("DELETE FROM users WHERE id=?").bind(id)]);
    }
    else if (resource === "unit") await db.delete(units).where(eq(units.id, id));
    else if (resource === "period") {
      const binding = (env as unknown as AdminEnv).DB;
      const period = await binding.prepare("SELECT instrument_version_id AS versionId, status FROM assessment_periods WHERE id = ? LIMIT 1").bind(id).first<{ versionId: string; status: string }>();
      if (!period) throw new ApiError(404, "Tahun penilaian tidak ditemukan");
      if (period.status === "finalized") throw new ApiError(409, "Tahun penilaian yang sudah final tidak dapat dihapus");
      await binding.batch([
        binding.prepare("DELETE FROM evidence_links WHERE score_id IN (SELECT id FROM indicator_scores WHERE period_id = ?)").bind(id),
        binding.prepare("DELETE FROM indicator_scores WHERE period_id = ?").bind(id),
        binding.prepare("DELETE FROM assignments WHERE period_id = ?").bind(id),
        binding.prepare("DELETE FROM score_options WHERE indicator_id IN (SELECT i.id FROM indicators i JOIN subcategories sc ON sc.id = i.subcategory_id JOIN categories c ON c.id = sc.category_id WHERE c.instrument_version_id = ?)").bind(period.versionId),
        binding.prepare("DELETE FROM indicators WHERE subcategory_id IN (SELECT sc.id FROM subcategories sc JOIN categories c ON c.id = sc.category_id WHERE c.instrument_version_id = ?)").bind(period.versionId),
        binding.prepare("DELETE FROM subcategories WHERE category_id IN (SELECT id FROM categories WHERE instrument_version_id = ?)").bind(period.versionId),
        binding.prepare("DELETE FROM categories WHERE instrument_version_id = ?").bind(period.versionId),
        binding.prepare("DELETE FROM assessment_periods WHERE id = ?").bind(id),
        binding.prepare("DELETE FROM instrument_versions WHERE id = ? AND NOT EXISTS (SELECT 1 FROM assessment_periods WHERE instrument_version_id = ?)").bind(period.versionId, period.versionId),
      ]);
    }
    else if (resource === "category") {
      const binding = (env as unknown as AdminEnv).DB;
      await binding.batch([
        binding.prepare("DELETE FROM evidence_links WHERE score_id IN (SELECT s.id FROM indicator_scores s JOIN indicators i ON i.id=s.indicator_id JOIN subcategories sc ON sc.id=i.subcategory_id WHERE sc.category_id=?)").bind(id),
        binding.prepare("DELETE FROM indicator_scores WHERE indicator_id IN (SELECT i.id FROM indicators i JOIN subcategories sc ON sc.id=i.subcategory_id WHERE sc.category_id=?)").bind(id),
        binding.prepare("DELETE FROM assignments WHERE indicator_id IN (SELECT i.id FROM indicators i JOIN subcategories sc ON sc.id=i.subcategory_id WHERE sc.category_id=?)").bind(id),
        binding.prepare("DELETE FROM score_options WHERE indicator_id IN (SELECT i.id FROM indicators i JOIN subcategories sc ON sc.id=i.subcategory_id WHERE sc.category_id=?)").bind(id),
        binding.prepare("DELETE FROM indicators WHERE subcategory_id IN (SELECT id FROM subcategories WHERE category_id=?)").bind(id),
        binding.prepare("DELETE FROM subcategories WHERE category_id=?").bind(id),
        binding.prepare("DELETE FROM categories WHERE id=?").bind(id),
      ]);
    }
    else if (resource === "subcategory") {
      const binding = (env as unknown as AdminEnv).DB;
      await binding.batch([
        binding.prepare("DELETE FROM evidence_links WHERE score_id IN (SELECT s.id FROM indicator_scores s JOIN indicators i ON i.id=s.indicator_id WHERE i.subcategory_id=?)").bind(id),
        binding.prepare("DELETE FROM indicator_scores WHERE indicator_id IN (SELECT id FROM indicators WHERE subcategory_id=?)").bind(id),
        binding.prepare("DELETE FROM assignments WHERE indicator_id IN (SELECT id FROM indicators WHERE subcategory_id=?)").bind(id),
        binding.prepare("DELETE FROM score_options WHERE indicator_id IN (SELECT id FROM indicators WHERE subcategory_id=?)").bind(id),
        binding.prepare("DELETE FROM indicators WHERE subcategory_id=?").bind(id),
        binding.prepare("DELETE FROM subcategories WHERE id=?").bind(id),
      ]);
    }
    else if (resource === "indicator") {
      const binding = (env as unknown as AdminEnv).DB;
      await binding.batch([
        binding.prepare("DELETE FROM evidence_links WHERE score_id IN (SELECT id FROM indicator_scores WHERE indicator_id=?)").bind(id),
        binding.prepare("DELETE FROM indicator_scores WHERE indicator_id=?").bind(id),
        binding.prepare("DELETE FROM assignments WHERE indicator_id=?").bind(id),
        binding.prepare("DELETE FROM score_options WHERE indicator_id=?").bind(id),
        binding.prepare("DELETE FROM indicators WHERE id=?").bind(id),
      ]);
    }
    else throw new ApiError(400, "Jenis data tidak dikenali");
    await audit(request, actor, `${resource}.deleted`, resource, id);
    return Response.json({ deleted: true });
  } catch (error) {
    if (error instanceof Error && /FOREIGN KEY constraint failed/i.test(error.message)) return Response.json({ error: "Data masih digunakan dan belum dapat dihapus" }, { status: 409 });
    return apiError(error);
  }
}
