import { env } from '../../../server/runtime';
import { readAssessment } from '../../../server/assessment-scoring';

type PeriodRow = {id:string;typeId:string;typeCode:string;typeName:string;description:string;year:number;name:string;status:string;maxScore:number;scoringMode:string};
export async function GET() {
  const db=(env as unknown as {DB:LocalDatabase}).DB;
  const result=await db.prepare("SELECT p.id,p.assessment_type_id AS typeId,t.code AS typeCode,t.name AS typeName,t.description,p.year,p.name,p.status,p.max_score AS maxScore,p.scoring_mode AS scoringMode FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id WHERE t.active=1 AND t.is_public=1 AND p.status='finalized' ORDER BY t.code,p.year DESC").all<PeriodRow>();
  const summaries=await Promise.all(result.results.map(async period=>{
    const summary=await readAssessment(period.id);
    return {
      id:period.id,year:Number(period.year),name:period.name,status:period.status,
      maxScore:Number(period.maxScore),scoringMode:period.scoringMode,score:summary.final,scoreKind:'final',
      interpretation:summary.comparison.finalInterpretation,
      totalIndicators:summary.total,evidencedIndicators:summary.rows.filter(row=>Number(row.evidenceCount)>0).length,
      categories:summary.categories.map(category=>({id:category.id,weight:category.weight,maximum:category.maximum,final:category.final,code:summary.rows.find(row=>row.categoryId===category.id)?.categoryCode,name:summary.rows.find(row=>row.categoryId===category.id)?.categoryName})),
    };
  }));
  const assessments=[...new Set(result.results.map(period=>period.typeId))].map(typeId=>{
    const periods=result.results.filter(period=>period.typeId===typeId);
    const latest=periods[0];
    const history=periods.map(period=>summaries.find(summary=>summary.id===period.id)!);
    return {id:typeId,code:latest.typeCode,name:latest.typeName,description:latest.description,latest:history[0],history};
  });
  return Response.json({assessments,updatedAt:new Date().toISOString()},{headers:{'Cache-Control':'public, max-age=60, stale-while-revalidate=300'}});
}
