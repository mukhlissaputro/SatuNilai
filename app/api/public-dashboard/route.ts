import { env } from "../../../server/runtime";
import { readAssessment } from "../../../server/assessment-scoring";

type Runtime = { DB: LocalDatabase };
type PeriodRow = { id: string; typeId: string; typeCode: string; typeName: string; description: string; year: number; name: string; status: string; maxScore: number; scoringMode: string };
type ScoreRow = { periodId: string; categoryId: string; categoryCode: string; categoryName: string; categoryWeight: number; subcategoryId: string; subcategoryWeight: number; finalValue: number | null; targetValue: number | null; internalValue: number | null; assessorValue: number | null; indicatorId: string | null; scoreStatus: string | null; evidenceCount: number };

function weighted(items: Array<{ value: number; weight: number }>) {
  const valid = items.filter((item) => Number.isFinite(item.value));
  const totalWeight = valid.reduce((sum, item) => sum + Math.max(0, item.weight), 0);
  if (!valid.length) return null;
  return totalWeight > 0 ? valid.reduce((sum, item) => sum + item.value * Math.max(0, item.weight), 0) / totalWeight : valid.reduce((sum, item) => sum + item.value, 0) / valid.length;
}

export async function GET() {
  const db = (env as unknown as Runtime).DB;
  const [periodResult, scoreResult] = await Promise.all([
    db.prepare("SELECT p.id,p.assessment_type_id AS typeId,t.code AS typeCode,t.name AS typeName,t.description,p.year,p.name,p.status,p.max_score AS maxScore,p.scoring_mode AS scoringMode FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id WHERE t.active=1 AND t.is_public=1 AND p.status='finalized' ORDER BY t.code,p.year DESC").all<PeriodRow>(),
    db.prepare("SELECT p.id AS periodId,c.id AS categoryId,c.code AS categoryCode,c.name AS categoryName,COALESCE(c.weight_percent,0) AS categoryWeight,sc.id AS subcategoryId,COALESCE(sc.weight_percent,0) AS subcategoryWeight,sc.final_value AS finalValue,sc.target_value AS targetValue,AVG(s.internal_value) AS internalValue,AVG(s.assessor_value) AS assessorValue,i.id AS indicatorId,MAX(s.status) AS scoreStatus,COUNT(DISTINCT el.evidence_id) AS evidenceCount FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id JOIN categories c ON c.instrument_version_id=p.instrument_version_id JOIN subcategories sc ON sc.category_id=c.id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.period_id=p.id AND s.indicator_id=i.id LEFT JOIN evidence_links el ON el.score_id=s.id LEFT JOIN evidence e ON e.id=el.evidence_id AND e.status='active' WHERE t.active=1 AND t.is_public=1 AND p.status='finalized' GROUP BY p.id,p.year,c.id,c.code,c.name,c.weight_percent,c.sort_order,sc.id,sc.weight_percent,sc.final_value,sc.target_value,sc.sort_order,i.id,i.sort_order ORDER BY p.year DESC,c.sort_order,sc.sort_order,i.sort_order").all<ScoreRow>(),
  ]);
  const periods = periodResult.results ?? [];
  const scoreRows = scoreResult.results ?? [];
  const typeIds = [...new Set(periods.map((period) => period.typeId))];
  const direct = new Map();
  for (const period of periods.filter(item => item.scoringMode === 'direct_points')) {
    const summary = await readAssessment(period.id);
    direct.set(period.id, { id: period.id, year: Number(period.year), name: period.name, status: period.status, maxScore: Number(period.maxScore), scoringMode: period.scoringMode, score: summary.final, scoreKind: 'final', totalIndicators: summary.total, evidencedIndicators: summary.rows.filter(row => Number(row.evidenceCount) > 0).length, categories: summary.categories.map(category => ({ ...category, code: summary.rows.find(row => row.categoryId === category.id)?.categoryCode, name: summary.rows.find(row => row.categoryId === category.id)?.categoryName })) });
  }
  const assessments = typeIds.map((typeId) => {
    const typePeriods = periods.filter((period) => period.typeId === typeId);
    const latest = typePeriods[0];
    const history = typePeriods.map((period) => direct.get(period.id) ?? summarize(period, scoreRows.filter((row) => row.periodId === period.id)));
    return { id: typeId, code: latest.typeCode, name: latest.typeName, description: latest.description, latest: history[0], history };
  });
  return Response.json({ assessments, updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } });
}

function summarize(period: PeriodRow, rows: ScoreRow[]) {
  const categoryIds = [...new Set(rows.map((row) => row.categoryId))];
  const categories = categoryIds.map((categoryId) => {
    const categoryRows = rows.filter((row) => row.categoryId === categoryId);
    const subcategoryIds = [...new Set(categoryRows.map((row) => row.subcategoryId))];
    const subcategories = subcategoryIds.map((subcategoryId) => {
      const subRows = categoryRows.filter((row) => row.subcategoryId === subcategoryId);
      const first = subRows[0];
      const final = first.finalValue == null ? weighted(subRows.filter((row) => row.assessorValue != null).map((row) => ({ value: Number(row.assessorValue), weight: 1 }))) : Number(first.finalValue);
      const internal = weighted(subRows.filter((row) => row.internalValue != null).map((row) => ({ value: Number(row.internalValue), weight: 1 })));
      return { id: subcategoryId, weight: Number(first.subcategoryWeight), final, internal, target: first.targetValue == null ? null : Number(first.targetValue) };
    });
    const final = weighted(subcategories.filter((item) => item.final != null).map((item) => ({ value: Number(item.final), weight: item.weight })));
    const internal = weighted(subcategories.filter((item) => item.internal != null).map((item) => ({ value: Number(item.internal), weight: item.weight })));
    return { id: categoryId, code: categoryRows[0].categoryCode, name: categoryRows[0].categoryName, weight: Number(categoryRows[0].categoryWeight), final, internal };
  });
  const totalIndicators = new Set(rows.map((row) => row.indicatorId).filter(Boolean)).size;
  const evidencedIndicators = new Set(rows.filter((row) => Number(row.evidenceCount) > 0).map((row) => row.indicatorId).filter(Boolean)).size;
  const finalScore = weighted(categories.filter((item) => item.final != null).map((item) => ({ value: Number(item.final), weight: item.weight })));
  return { id: period.id, year: Number(period.year), name: period.name, status: period.status, maxScore: Number(period.maxScore), score: finalScore, scoreKind: "final", totalIndicators, evidencedIndicators, categories };
}
