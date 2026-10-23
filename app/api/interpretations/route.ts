import { env } from '../../../server/runtime';
import { validateBands } from '../../../lib/score-interpretation';
import { ApiError, apiError, assertSameOrigin, audit, requireUser } from '../_security';
const db = () => (env as unknown as {DB:LocalDatabase}).DB;
type Period = {id:string;typeId:string;year:number;maximum:number;status:string;rules:string|null};
async function period(id:string) {
  const row = await db().prepare('SELECT id,assessment_type_id AS typeId,year,max_score AS maximum,status,interpretation_rules AS rules FROM assessment_periods WHERE id=?').bind(id).first<Period>();
  if (!row) throw new ApiError(404,'Periode tidak ditemukan');
  return row;
}
export async function GET(request:Request) {
  try {
    await requireUser(request,['admin']);
    const target = await period(new URL(request.url).searchParams.get('periodId') ?? '');
    const sources = await db().prepare("SELECT id,year,name,max_score AS maximum FROM assessment_periods WHERE assessment_type_id=? AND year<? AND max_score=? AND interpretation_rules IS NOT NULL AND interpretation_rules<>'[]' ORDER BY year DESC").bind(target.typeId,target.year,target.maximum).all();
    let bands: ReturnType<typeof validateBands>;
    let configurationError = '';
    try {bands=target.rules ? validateBands(JSON.parse(target.rules),Number(target.maximum)) : [];}
    catch {bands=[];configurationError='Aturan tersimpan tidak valid. Tambahkan atau salin ulang interpretasi untuk memperbaikinya.';}
    return Response.json({bands,configurationError, sources:sources.results, locked:target.status==='finalized', maximum:target.maximum},{headers:{'Cache-Control':'private, no-store'}});
  } catch(error) { return apiError(error); }
}
export async function PUT(request:Request) {
  try {
    assertSameOrigin(request);
    const user = await requireUser(request,['admin']);
    const body = await request.json() as {periodId?:string;sourcePeriodId?:string;bands?:unknown};
    const target = await period(String(body.periodId ?? ''));
    if (target.status==='finalized') throw new ApiError(409,'Interpretasi periode final tidak dapat diubah');
    let input = body.bands;
    if (body.sourcePeriodId) {
      const source = await period(body.sourcePeriodId);
      if (source.typeId!==target.typeId || Number(source.year)>=Number(target.year) || Number(source.maximum)!==Number(target.maximum)) throw new ApiError(409,'Salin hanya dari tahun sebelumnya pada jenis dan skala nilai yang sama');
      if (!source.rules || !JSON.parse(source.rules).length) throw new ApiError(409,'Periode sumber belum memiliki interpretasi');
      input = JSON.parse(source.rules);
    }
    let bands: ReturnType<typeof validateBands>;
    try {bands=validateBands(input,Number(target.maximum));} catch(error) {throw new ApiError(400,(error as Error).message);}
    const saved = await db().prepare("UPDATE assessment_periods SET interpretation_rules=?,updated_at=? WHERE id=? AND status<>'finalized'").bind(JSON.stringify(bands),new Date().toISOString(),target.id).run();
    if (!saved.meta.changes) throw new ApiError(409,'Periode telah dikunci atau tidak tersedia');
    await audit(request,user,'interpretation.updated','assessment_period',target.id,{sourcePeriodId:body.sourcePeriodId ?? null,bands});
    return Response.json({saved:true,bands});
  } catch(error) {return apiError(error);}
}
