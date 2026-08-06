import { env } from "cloudflare:workers";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { assessmentPeriods, auditLogs, categories, indicatorScores } from "../../../db/schema";
import { ApiError, apiError, assertSameOrigin, audit, requireAssignment, requireUser } from "../_security";

type DashboardEnv = { DB: D1Database };

export async function GET(request: Request) {
  try {
    const user = await requireUser(request);
    const periodId = new URL(request.url).searchParams.get("periodId") ?? "period-spbe-2025";
    const binding = (env as unknown as DashboardEnv).DB;
    const categoryResult = await binding.prepare(`SELECT c.id, c.code, c.name, c.weight_percent AS weight, COALESCE(AVG(s.internal_value), 0) AS score, COUNT(s.id) AS total, SUM(CASE WHEN s.internal_value IS NOT NULL THEN 1 ELSE 0 END) AS completed FROM categories c LEFT JOIN subcategories sc ON sc.category_id = c.id LEFT JOIN indicators i ON i.subcategory_id = sc.id LEFT JOIN indicator_scores s ON s.indicator_id = i.id AND s.period_id = ? GROUP BY c.id ORDER BY c.sort_order`).bind(periodId).all();
    const indicatorResult = await binding.prepare(`SELECT i.id, s.id AS score_id, i.code, i.name, c.name AS category, sc.name AS subcategory, s.internal_value AS score, s.target_value AS target, s.assessor_value AS assessor, s.status, s.reviewer_note, u.display_name AS assessor_name, COUNT(DISTINCT el.evidence_id) AS evidence_count FROM indicator_scores s JOIN indicators i ON i.id = s.indicator_id JOIN subcategories sc ON sc.id = i.subcategory_id JOIN categories c ON c.id = sc.category_id LEFT JOIN users u ON u.id = s.reviewed_by LEFT JOIN evidence_links el ON el.score_id = s.id WHERE s.period_id = ? ${user.role === "staff" ? "AND s.unit_id = ?" : ""} GROUP BY s.id ORDER BY c.sort_order, sc.sort_order, i.sort_order`).bind(...(user.role === "staff" ? [periodId, user.unitId] : [periodId])).all();
    const period = await binding.prepare(`SELECT p.id, p.name, p.year, p.starts_at AS startsAt, p.due_at AS dueAt, p.status, t.code AS assessmentCode, t.name AS assessmentName FROM assessment_periods p JOIN assessment_types t ON t.id = p.assessment_type_id WHERE p.id = ?`).bind(periodId).first();
    return Response.json({ period, categories: categoryResult.results, indicators: indicatorResult.results }, { headers: { "Cache-Control": "private, no-store" } });
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
      if (payload.value! < 0 || payload.value! > 100) throw new ApiError(400, "Bobot harus antara 0 dan 100 persen");
      await db.update(categories).set({ weightPercent: payload.value, updatedAt: new Date().toISOString() }).where(eq(categories.id, payload.id));
      await audit(request, user, "category.weight_updated", "category", payload.id, { weightPercent: payload.value });
      return Response.json({ saved: true });
    }
    if (payload.action === "score") {
      const [score] = await db.select().from(indicatorScores).innerJoin(assessmentPeriods, eq(assessmentPeriods.id, indicatorScores.periodId)).where(eq(indicatorScores.id, payload.id)).limit(1);
      if (!score) throw new ApiError(404, "Penilaian tidak ditemukan");
      await requireAssignment(user, score.indicator_scores.periodId, score.indicator_scores.indicatorId);
      if (score.indicator_scores.status === "locked" || score.assessment_periods.status === "finalized") throw new ApiError(409, "Penilaian telah dikunci");
      if (payload.value! < 0 || payload.value! > 5) throw new ApiError(400, "Nilai tidak valid");
      await db.update(indicatorScores).set({ internalValue: payload.value, staffNote: String(payload.note ?? "").slice(0, 2000), status: "draft", updatedAt: new Date().toISOString() }).where(eq(indicatorScores.id, payload.id));
      await audit(request, user, "score.updated", "indicator_score", payload.id, { value: payload.value });
      return Response.json({ saved: true });
    }
    throw new ApiError(400, "Tindakan tidak dikenali");
  } catch (error) { return apiError(error); }
}
