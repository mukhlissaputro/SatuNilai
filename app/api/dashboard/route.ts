import { env } from "../../../server/runtime";
import { readAssessment } from "../../../server/assessment-scoring";
import { indicatorMaximum, scoringMode } from "../../../lib/assessment-scoring";
import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentPeriods, categories, indicatorScores } from "../../../db/schema";
import { ApiError, apiError, assertSameOrigin, audit, requireAssignment, requireUser } from "../_security";

type DashboardEnv = { DB: LocalDatabase };

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const periodId = new URL(request.url).searchParams.get("periodId") ?? "";
    const binding = (env as unknown as DashboardEnv).DB;
    const accessJoin = user.role === "admin" ? "" : "JOIN user_assessment_types uat ON uat.assessment_type_id=t.id AND uat.user_id=?";
    const accessArgs = user.role === "admin" ? [] : [user.id];
    const [typeRows, periodRows] = await Promise.all([
      binding.prepare(`SELECT DISTINCT t.id,t.code,t.name FROM assessment_types t ${accessJoin} WHERE t.active=1 ORDER BY t.code`).bind(...accessArgs).all(),
      binding.prepare(`SELECT DISTINCT p.id,p.assessment_type_id AS typeId,p.year,p.name,p.status,p.max_score AS maxScore FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id ${accessJoin} ORDER BY p.year DESC,t.code`).bind(...accessArgs).all(),
    ]);
    if (!periodId) return Response.json({ types: typeRows.results, periods: periodRows.results, period: null, categories: [], indicators: [], metrics: null, history: [] }, { headers: { "Cache-Control": "private, no-store" } });
    const period = await binding.prepare(`SELECT p.id,p.assessment_type_id AS typeId,p.instrument_version_id AS versionId,p.name,p.year,p.max_score AS maxScore,p.starts_at AS startsAt,p.due_at AS dueAt,p.status,t.code AS assessmentCode,t.name AS assessmentName FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id ${user.role === "admin" ? "" : "JOIN user_assessment_types uat ON uat.assessment_type_id=t.id AND uat.user_id=?"} WHERE p.id=? LIMIT 1`).bind(...(user.role === "admin" ? [periodId] : [user.id, periodId])).first<Record<string, unknown>>();
    if (!period) throw new ApiError(403, "Periode penilaian tidak termasuk dalam akses Anda");
    const scoreUnitFilter = user.role === "staff" && user.unitId ? "AND s.unit_id=?" : "";
    const scoreArgs = user.role === "staff" && user.unitId ? [periodId, user.unitId] : [periodId];
    const categoryResult = await binding.prepare(`SELECT c.id,c.code,c.name,c.weight_percent AS weight,COALESCE(AVG(s.internal_value),0) AS score,COUNT(DISTINCT i.id) AS total,COUNT(DISTINCT CASE WHEN s.internal_value IS NOT NULL THEN i.id END) AS completed,COUNT(DISTINCT CASE WHEN el.id IS NOT NULL THEN i.id END) AS withEvidence FROM categories c LEFT JOIN subcategories sc ON sc.category_id=c.id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=? ${scoreUnitFilter} LEFT JOIN evidence_links el ON el.score_id=s.id WHERE c.instrument_version_id=? GROUP BY c.id ORDER BY c.sort_order`).bind(...scoreArgs, String(period.versionId)).all();
    const metrics = await binding.prepare(`SELECT COUNT(DISTINCT i.id) AS totalIndicators,COUNT(DISTINCT CASE WHEN s.internal_value IS NOT NULL THEN i.id END) AS assessedIndicators,COUNT(DISTINCT CASE WHEN el.id IS NOT NULL THEN i.id END) AS indicatorsWithEvidence,COUNT(DISTINCT c.id) AS totalCategories,COUNT(DISTINCT sc.id) AS totalSubcategories,COALESCE(AVG(DISTINCT sc.target_value),0) AS targetValue,COALESCE(AVG(s.internal_value),0) AS currentValue FROM categories c LEFT JOIN subcategories sc ON sc.category_id=c.id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=? ${scoreUnitFilter} LEFT JOIN evidence_links el ON el.score_id=s.id WHERE c.instrument_version_id=?`).bind(...scoreArgs, String(period.versionId)).first();
    const history = await binding.prepare(`SELECT p.year,COALESCE(SUM(categoryScore.score*categoryScore.weight)/NULLIF(SUM(categoryScore.weight),0),0) AS value FROM assessment_periods p LEFT JOIN (SELECT p2.id AS periodId,c.id,c.weight_percent AS weight,COALESCE(AVG(s.internal_value),0) AS score FROM assessment_periods p2 JOIN categories c ON c.instrument_version_id=p2.instrument_version_id LEFT JOIN subcategories sc ON sc.category_id=c.id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=p2.id ${user.role === "staff" && user.unitId ? "AND s.unit_id=?" : ""} GROUP BY p2.id,c.id) categoryScore ON categoryScore.periodId=p.id WHERE p.assessment_type_id=? AND p.year<=? GROUP BY p.id ORDER BY p.year`).bind(...(user.role === "staff" && user.unitId ? [user.unitId, String(period.typeId), Number(period.year)] : [String(period.typeId), Number(period.year)])).all();
    const summary = await readAssessment(periodId, user.role === 'staff' ? user.unitId : null);
    period.scoringMode = summary.period.scoringMode;
    if (summary.period.scoringMode === 'direct_points') {
      for (const row of categoryResult.results) {
        const total = summary.categories.find(item => item.id === row.id);
        row.internalScore = total?.internal ?? 0;
        row.score = total?.verified ?? 0;
        row.completed = total?.accepted ?? 0;
        row.maximum = total?.maximum ?? 0;
      }
      if (metrics) { metrics.internalValue = summary.internal ?? 0; metrics.currentValue = summary.verified ?? 0; metrics.acceptedIndicators = summary.accepted; metrics.rejectedIndicators = summary.rejected; metrics.targetValue = summary.target ?? 0; }
    }
    const pastPeriods = await binding.prepare('SELECT id,year,scoring_mode AS mode FROM assessment_periods WHERE assessment_type_id=? AND year<=?').bind(period.typeId, period.year).all();
    for (const past of pastPeriods.results.filter(item => item.mode === 'direct_points')) {
      const totals = await readAssessment(String(past.id), user.role === 'staff' ? user.unitId : null);
      const point = history.results.find(item => Number(item.year) === Number(past.year));
      if (point) point.value = totals.verified ?? 0;
    }
    return Response.json({ types: typeRows.results, periods: periodRows.results, period, categories: categoryResult.results, indicators: [], metrics, history: history.results }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request, ["admin", "staff"]);
    const payload = await request.json() as { action?: string; id?: string; value?: number; note?: string };
    if (!payload.id || !Number.isFinite(payload.value)) throw new ApiError(400, "Data perubahan tidak lengkap");
    const db = getDb();
    if (payload.action === "weight") {
      if (user.role !== "admin") throw new ApiError(403, "Hanya admin yang dapat mengubah bobot");
      const configuration = await (env as unknown as DashboardEnv).DB.prepare("SELECT p.status,p.scoring_mode AS mode FROM categories c JOIN assessment_periods p ON p.instrument_version_id=c.instrument_version_id WHERE c.id=?").bind(payload.id).all();
      if (configuration.results.some(row => row.status === 'finalized' || row.mode === 'direct_points')) throw new ApiError(409, 'Bobot periode final atau poin langsung tidak diubah melalui dashboard');
      if (payload.value! < 0 || payload.value! > 100) throw new ApiError(400, "Bobot harus antara 0 dan 100 persen");
      await db.update(categories).set({ weightPercent: payload.value, updatedAt: new Date().toISOString() }).where(eq(categories.id, payload.id));
      await audit(request, user, "category.weight_updated", "category", payload.id, { weightPercent: payload.value });
      return Response.json({ saved: true });
    }
    if (payload.action === "score") {
      if (user.role !== "staff") throw new ApiError(403, "Hanya staf yang dapat mengubah nilai mandiri");
      const [score] = await db.select().from(indicatorScores).innerJoin(assessmentPeriods, eq(assessmentPeriods.id, indicatorScores.periodId)).where(eq(indicatorScores.id, payload.id)).limit(1);
      if (!score) throw new ApiError(404, "Penilaian tidak ditemukan");
      await requireAssignment(user, score.indicator_scores.periodId, score.indicator_scores.indicatorId);
      if (score.indicator_scores.status === "locked" || score.assessment_periods.status === "finalized") throw new ApiError(409, "Penilaian telah dikunci");
      if (score.indicator_scores.status === 'approved') throw new ApiError(409, 'Penilaian telah disetujui');
      if (user.unitId !== score.indicator_scores.unitId) throw new ApiError(403, 'Penilaian bukan milik unit Anda');
      const indicator = await (env as unknown as DashboardEnv).DB.prepare('SELECT max_value AS indicatorMaximum FROM indicators WHERE id=?').bind(score.indicator_scores.indicatorId).first<{indicatorMaximum:number|null}>();
      let maximum;
      try { maximum = indicatorMaximum(scoringMode(score.assessment_periods.scoringMode), indicator?.indicatorMaximum, score.assessment_periods.maxScore); }
      catch (error) { throw new ApiError(400, (error as Error).message); }
      if (payload.value! < 0 || payload.value! > maximum) throw new ApiError(400, `Nilai harus berada antara 0 dan ${maximum}`);
      await db.update(indicatorScores).set({ internalValue: payload.value, staffNote: String(payload.note ?? "").slice(0, 2000), status: "draft", updatedAt: new Date().toISOString() }).where(eq(indicatorScores.id, payload.id));
      await audit(request, user, "score.updated", "indicator_score", payload.id, { value: payload.value });
      return Response.json({ saved: true });
    }
    throw new ApiError(400, "Tindakan tidak dikenali");
  } catch (error) { return apiError(error); }
}
