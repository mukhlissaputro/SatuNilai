import { database } from './database';
import { aggregateAssessment, scoringMode, type ScoreRow } from '../lib/assessment-scoring';

type DatabaseScoreRow = ScoreRow & { indicatorMaximum: number | null; categoryCode: string; categoryName: string; subcategoryCode: string; subcategoryName: string; indicatorCode: string | null; indicatorName: string | null; evidenceCount: number; scoreStatus: string | null };

export async function readAssessment(periodId: string, unitId?: string | null) {
  const period = await database.prepare('SELECT id,instrument_version_id AS versionId,max_score AS maxScore,scoring_mode AS scoringMode,status FROM assessment_periods WHERE id=?').bind(periodId).first<{id:string;versionId:string;maxScore:number;scoringMode:string;status:string}>();
  if (!period) throw new Error('Periode penilaian tidak ditemukan');
  // Evidence is counted in a correlated subquery, never joined to the score rows.
  const rows = await database.prepare(`SELECT c.id AS categoryId,c.code AS categoryCode,c.name AS categoryName,c.weight_percent AS categoryWeight,sc.id AS subcategoryId,sc.code AS subcategoryCode,sc.name AS subcategoryName,sc.weight_percent AS subcategoryWeight,sc.target_value AS targetValue,sc.final_value AS finalValue,i.id AS indicatorId,i.code AS indicatorCode,i.name AS indicatorName,i.max_value AS indicatorMaximum,AVG(s.internal_value) AS internalValue,AVG(s.assessor_value) AS assessorValue,MAX(s.status) AS scoreStatus,COALESCE(SUM((SELECT COUNT(*) FROM evidence_links el JOIN evidence e ON e.id=el.evidence_id AND e.status='active' WHERE el.score_id=s.id)),0) AS evidenceCount FROM categories c JOIN subcategories sc ON sc.category_id=c.id LEFT JOIN indicators i ON i.subcategory_id=sc.id LEFT JOIN indicator_scores s ON s.indicator_id=i.id AND s.period_id=? ${unitId ? 'AND s.unit_id=?' : ''} WHERE c.instrument_version_id=? GROUP BY c.id,sc.id,i.id ORDER BY c.sort_order,sc.sort_order,i.sort_order`).bind(periodId, ...(unitId ? [unitId] : []), period.versionId).all<DatabaseScoreRow>();
  const normalized = rows.results.map(row => ({...row, maxValue: row.indicatorMaximum == null ? null : Number(row.indicatorMaximum)}));
  return { period, rows:normalized, ...aggregateAssessment(normalized, scoringMode(period.scoringMode), Number(period.maxScore)) };
}
