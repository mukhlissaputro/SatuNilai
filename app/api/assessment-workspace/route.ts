import { env } from "../../../server/runtime";
import { readAssessment } from "../../../server/assessment-scoring";
import { indicatorMaximum, scoringMode, validateScore } from "../../../lib/assessment-scoring";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  audit,
  requireUser,
} from "../_security";

type WorkspaceEnv = { DB: LocalDatabase };

async function assertTypeAccess(
  db: LocalDatabase,
  user: Awaited<ReturnType<typeof requireUser>>,
  typeId: string,
) {
  if (user.role === "admin") return;
  const access = await db
    .prepare(
      "SELECT 1 ok FROM user_assessment_types WHERE user_id=? AND assessment_type_id=? LIMIT 1",
    )
    .bind(user.id, typeId)
    .first();
  if (!access)
    throw new ApiError(403, "Anda tidak memiliki akses ke jenis penilaian ini");
}

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const db = (env as unknown as WorkspaceEnv).DB;
    const typeSql =
      user.role !== "admin"
        ? "SELECT t.id,t.code,t.name FROM assessment_types t JOIN user_assessment_types uat ON uat.assessment_type_id=t.id WHERE uat.user_id=? AND t.active=1 ORDER BY t.code"
        : "SELECT id,code,name FROM assessment_types WHERE active=1 ORDER BY code";
    const typeResult = await db
      .prepare(typeSql)
      .bind(...(user.role !== "admin" ? [user.id] : []))
      .all();
    const allowedTypeIds = typeResult.results.map((row) => String(row.id));
    if (!allowedTypeIds.length)
      return Response.json({
        types: [],
        periods: [],
        subcategories: [],
        indicators: [],
        user: { role: user.role },
      });

    const requestedPeriodId = new URL(request.url).searchParams.get("periodId");
    const placeholders = allowedTypeIds.map(() => "?").join(",");
    const periods = await db
      .prepare(
        `SELECT p.id,p.assessment_type_id AS typeId,p.instrument_version_id AS instrumentVersionId,p.year,p.name,p.max_score AS maxScore,p.scoring_mode AS scoringMode,p.status,p.due_at AS dueAt,t.code AS typeCode FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id WHERE p.assessment_type_id IN (${placeholders}) ORDER BY p.year DESC,t.code`,
      )
      .bind(...allowedTypeIds)
      .all();
    const selected =
      periods.results.find((row) => String(row.id) === requestedPeriodId) ??
      (allowedTypeIds.length === 1 ? periods.results[0] : undefined);
    if (!selected)
      return Response.json({
        types: typeResult.results,
        periods: periods.results,
        subcategories: [],
        indicators: [],
        user: { role: user.role },
      });
    await assertTypeAccess(db, user, String(selected.typeId));

    const unit = user.role !== "admin" && user.unitId
      ? { id: user.unitId }
      : await db
          .prepare(
            "SELECT id FROM units WHERE active=1 ORDER BY EXISTS(SELECT 1 FROM indicator_scores s WHERE s.period_id=? AND s.unit_id=units.id) DESC,created_at LIMIT 1",
          )
          .bind(selected.id)
          .first<{ id: string }>();
    if (!unit)
      throw new ApiError(
        409,
        "Unit internal untuk penyimpanan penilaian belum tersedia",
      );
    const subcategoryResult = await db
      .prepare(
        `SELECT sc.id,sc.code,sc.name,sc.weight_percent AS weight,sc.final_value AS finalValue,c.id AS categoryId,c.code AS categoryCode,c.name AS categoryName,c.weight_percent AS categoryWeight,COUNT(i.id) AS indicatorCount,COALESCE(AVG(s.internal_value),0) AS score,COALESCE(sc.target_value,0) AS target,SUM(CASE WHEN s.internal_value IS NOT NULL THEN 1 ELSE 0 END) AS completed,SUM(CASE WHEN EXISTS (SELECT 1 FROM evidence_links el WHERE el.score_id=s.id) THEN 1 ELSE 0 END) AS evidenceCount FROM subcategories sc JOIN categories c ON c.id=sc.category_id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=? AND s.unit_id=? WHERE c.instrument_version_id=? GROUP BY sc.id ORDER BY c.sort_order,sc.sort_order`,
      )
      .bind(selected.id, unit.id, selected.instrumentVersionId)
      .all();
    const indicatorResult = await db
      .prepare(
        `SELECT i.id,i.code,i.name,i.description,i.weight_percent AS weight,i.subcategory_id AS subcategoryId,sc.name AS subcategoryName,c.name AS categoryName,s.id AS scoreId,COALESCE(sc.target_value,0) AS targetValue,s.internal_value AS internalValue,s.assessor_value AS assessorValue,s.status,s.staff_note AS staffNote,s.reviewer_note AS reviewerNote,EXISTS(SELECT 1 FROM audit_logs al WHERE al.entity_type='indicator_score' AND al.entity_id=s.id AND al.action='score.rejected') AS hadRejection,COUNT(DISTINCT el.evidence_id) AS evidenceCount FROM indicators i JOIN subcategories sc ON sc.id=i.subcategory_id JOIN categories c ON c.id=sc.category_id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=? AND s.unit_id=? LEFT JOIN evidence_links el ON el.score_id=s.id WHERE c.instrument_version_id=? GROUP BY i.id ORDER BY c.sort_order,sc.sort_order,i.sort_order`,
      )
      .bind(selected.id, unit.id, selected.instrumentVersionId)
      .all();
    const summary = await readAssessment(String(selected.id), user.role === 'admin' && selected.scoringMode === 'direct_points' ? null : unit.id);
    const indicatorRows = indicatorResult.results.map(row => ({ ...row, maxValue: summary.rows.find(item => item.indicatorId === row.id)?.maxValue ?? null }));
    const subcategoryRows = subcategoryResult.results.map(row => {
      const totals = summary.subcategories.find(item => item.id === row.id);
      return { ...row, ...(selected.scoringMode === 'direct_points' ? { score: totals?.internal ?? 0, verifiedScore: totals?.verified ?? 0, accepted: totals?.accepted ?? 0, rejected: totals?.rejected ?? 0, completed: totals?.completed ?? 0, indicatorCount: totals?.total ?? 0, finalValue: totals?.final ?? null } : {}), maxValue: totals?.maximum ?? selected.maxScore };
    });
    return Response.json(
      {
        types: typeResult.results,
        periods: periods.results,
        selectedPeriod: selected,
        subcategories: subcategoryRows,
        indicators: indicatorRows,
        user: { role: user.role },
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, ["staff"]);
    const body = (await request.json()) as {
      periodId?: string;
      indicatorId?: string;
      value?: number;
      note?: string;
    };
    const periodId = String(body.periodId ?? "");
    const indicatorId = String(body.indicatorId ?? "");
    const value = Number(body.value);
    if (body.value == null || String(body.value).trim() === '') throw new ApiError(400, 'Nilai wajib diisi');
    if (!periodId || !indicatorId || !Number.isFinite(value) || value < 0)
      throw new ApiError(400, "Nilai harus berupa angka nol atau lebih");
    const db = (env as unknown as WorkspaceEnv).DB;
    const relation = await db
      .prepare(
        `SELECT p.assessment_type_id AS typeId,p.status AS periodStatus,p.max_score AS maxScore,p.scoring_mode AS scoringMode,i.max_value AS indicatorMax,COALESCE(sc.target_value,0) AS targetValue FROM assessment_periods p JOIN categories c ON c.instrument_version_id=p.instrument_version_id JOIN subcategories sc ON sc.category_id=c.id JOIN indicators i ON i.subcategory_id=sc.id WHERE p.id=? AND i.id=? LIMIT 1`,
      )
      .bind(periodId, indicatorId)
      .first<{
        typeId: string;
        periodStatus: string;
        maxScore: number;
        scoringMode: string;
        indicatorMax: number | null;
        targetValue: number;
      }>();
    if (!relation)
      throw new ApiError(
        404,
        "Indikator tidak termasuk dalam periode tersebut",
      );
    try { validateScore(body.value, indicatorMaximum(scoringMode(relation.scoringMode), relation.indicatorMax, relation.maxScore)); }
    catch (error) { throw new ApiError(400, (error as Error).message); }
    await assertTypeAccess(db, user, relation.typeId);
    if (relation.periodStatus === "finalized")
      throw new ApiError(409, "Penilaian telah difinalisasi dan dikunci");
    const unit = user.unitId
      ? { id: user.unitId }
      : await db
          .prepare(
            "SELECT id FROM units WHERE active=1 ORDER BY created_at LIMIT 1",
          )
          .first<{ id: string }>();
    if (!unit) throw new ApiError(409, "Unit internal belum tersedia");
    const existing = await db
      .prepare(
        "SELECT id,status FROM indicator_scores WHERE period_id=? AND indicator_id=? AND unit_id=? LIMIT 1",
      )
      .bind(periodId, indicatorId, unit.id)
      .first<{ id: string; status: string }>();
    if (existing?.status === "locked" || existing?.status === "approved")
      throw new ApiError(409, "Penilaian telah dikunci");
    const scoreId = existing?.id ?? crypto.randomUUID();
    if (existing)
      await db
        .prepare(
          "UPDATE indicator_scores SET internal_value=?,target_value=?,staff_note=?,status=CASE WHEN status='rejected' THEN 'rejected' WHEN EXISTS(SELECT 1 FROM evidence_links WHERE score_id=indicator_scores.id) THEN 'submitted' ELSE 'draft' END,updated_at=CURRENT_TIMESTAMP WHERE id=?",
        )
        .bind(
          value,
          relation.targetValue,
          String(body.note ?? "").slice(0, 2000),
          scoreId,
        )
        .run();
    else
      await db
        .prepare(
          "INSERT INTO indicator_scores(id,period_id,indicator_id,unit_id,target_value,internal_value,status,staff_note) VALUES(?,?,?,?,?,?,'draft',?)",
        )
        .bind(
          scoreId,
          periodId,
          indicatorId,
          unit.id,
          relation.targetValue,
          value,
          String(body.note ?? "").slice(0, 2000),
        )
        .run();
    await audit(request, user, "score.updated", "indicator_score", scoreId, {
      periodId,
      indicatorId,
      value,
    });
    return Response.json({ saved: true, scoreId });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, ["admin"]);
    const body = await request.json() as { action?: string; scoreId?: string; decision?: string; note?: string; periodId?: string; finalValues?: Record<string, number> };
    const db = (env as unknown as WorkspaceEnv).DB;
    if (body.action === "review") {
      const scoreId = String(body.scoreId ?? "");
      const decision = String(body.decision ?? "");
      const note = String(body.note ?? "").trim().slice(0, 2000);
      if (!scoreId || !["approved", "rejected"].includes(decision)) throw new ApiError(400, "Keputusan verifikasi tidak valid");
      if (decision === "rejected" && !note) throw new ApiError(400, "Alasan penolakan wajib diisi");
      const score = await db.prepare("SELECT s.id,s.status,p.status AS periodStatus,COUNT(el.id) AS evidenceCount FROM indicator_scores s JOIN assessment_periods p ON p.id=s.period_id LEFT JOIN evidence_links el ON el.score_id=s.id WHERE s.id=? GROUP BY s.id LIMIT 1").bind(scoreId).first<{ id: string; status: string; periodStatus: string; evidenceCount: number }>();
      if (!score) throw new ApiError(404, "Penilaian indikator tidak ditemukan");
      if (score.periodStatus === "finalized") throw new ApiError(409, "Periode sudah final dan dikunci");
      if (!Number(score.evidenceCount)) throw new ApiError(409, "Indikator belum memiliki bukti dukung");
      if (!["submitted", "draft"].includes(score.status)) throw new ApiError(409, "Hanya bukti yang menunggu verifikasi yang dapat diperiksa");
      await db.prepare("UPDATE indicator_scores SET status=?,reviewer_note=?,reviewed_at=CURRENT_TIMESTAMP,reviewed_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(decision, note, user.id, scoreId).run();
      if (decision === "rejected") await db.prepare("UPDATE evidence SET rejected_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE id IN (SELECT evidence_id FROM evidence_links WHERE score_id=?)").bind(scoreId).run();
      await audit(request, user, `score.${decision}`, "indicator_score", scoreId, { note });
      return Response.json({ saved: true });
    }
    if (body.action === "finalize") {
      const periodId = String(body.periodId ?? "");
      const finalValues = body.finalValues ?? {};
      const period = await db.prepare("SELECT id,instrument_version_id AS versionId,max_score AS maxScore,scoring_mode AS scoringMode,status FROM assessment_periods WHERE id=? LIMIT 1").bind(periodId).first<{ id: string; versionId: string; maxScore: number; scoringMode: string; status: string }>();
      if (!period) throw new ApiError(404, "Periode penilaian tidak ditemukan");
      if (period.status === "finalized") throw new ApiError(409, "Periode sudah difinalisasi");
      const readiness = await db.prepare("SELECT COUNT(DISTINCT i.id) AS total,COUNT(DISTINCT CASE WHEN s.status='approved' AND EXISTS(SELECT 1 FROM evidence_links el WHERE el.score_id=s.id) THEN i.id END) AS approved FROM categories c JOIN subcategories sc ON sc.category_id=c.id JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=? WHERE c.instrument_version_id=?").bind(periodId, period.versionId).first<{ total: number; approved: number }>();
      if (!readiness || Number(readiness.total) === 0 || Number(readiness.approved) !== Number(readiness.total)) throw new ApiError(409, "Seluruh indikator harus memiliki bukti yang diterima admin sebelum finalisasi");
      const subcategories = await db.prepare("SELECT sc.id FROM subcategories sc JOIN categories c ON c.id=sc.category_id WHERE c.instrument_version_id=? ORDER BY sc.sort_order").bind(period.versionId).all();
      const updates: PreparedStatement[] = [];
      const summary = await readAssessment(periodId);
      if (period.scoringMode === 'direct_points' && Math.abs(summary.maximum - period.maxScore) > 0.000001) throw new ApiError(409, 'Jumlah nilai maksimal indikator harus sama dengan nilai maksimal periode');
      if (period.scoringMode === 'direct_points') {
        const invalid = await db.prepare('SELECT COUNT(*) AS total FROM indicator_scores s JOIN indicators i ON i.id=s.indicator_id WHERE s.period_id=? AND (s.internal_value IS NULL OR s.internal_value<0 OR i.max_value IS NULL OR s.internal_value>i.max_value OR s.status<>?)').bind(periodId, 'approved').first<{total:number}>();
        if (Number(invalid?.total ?? 0)) throw new ApiError(409, 'Seluruh nilai indikator harus valid dan diterima sebelum finalisasi');
        updates.push(db.prepare('UPDATE indicator_scores SET assessor_value=internal_value WHERE period_id=?').bind(periodId));
      }
      for (const row of subcategories.results) {
        const value = period.scoringMode === 'direct_points' ? Number(summary.subcategories.find(item => item.id === row.id)?.internal ?? 0) : Number(finalValues[String(row.id)]);
        if (!Number.isFinite(value) || value < 0 || value > period.maxScore) throw new ApiError(400, `Nilai final setiap subkategori wajib diisi antara 0 dan ${period.maxScore}`);
        updates.push(db.prepare("UPDATE subcategories SET final_value=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(value, String(row.id)));
      }
      updates.push(db.prepare("UPDATE indicator_scores SET status='locked',updated_at=CURRENT_TIMESTAMP WHERE period_id=?").bind(periodId));
      updates.push(db.prepare("UPDATE assessment_periods SET status='finalized',finalized_at=CURRENT_TIMESTAMP,finalized_by=?,updated_at=CURRENT_TIMESTAMP WHERE id=?").bind(user.id, periodId));
      await db.batch(updates);
      await audit(request, user, "period.finalized", "assessment_period", periodId, { subcategories: subcategories.results.length });
      return Response.json({ finalized: true });
    }
    throw new ApiError(400, "Tindakan tidak dikenali");
  } catch (error) { return apiError(error); }
}
