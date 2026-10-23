'use client';
import { interpretScore, type InterpretationBand } from '../../lib/score-interpretation';
export type ScoreComparison = { scope?:'unit'|'period'; interpretationError?:boolean; internal:number|null; final:number|null; finalized:boolean; completed:number; total:number; internalInterpretation:InterpretationBand|null; finalInterpretation:InterpretationBand|null; bands:InterpretationBand[]; maximum:number };
export function InterpretationText({band}:{band?:InterpretationBand|null}) {
  return <span className="interpretation-text">{band ? `${band.predicate} · ${band.interpretation}` : 'Interpretasi belum diatur'}</span>;
}
const number = (value:number|null) => value == null ? '—' : value.toLocaleString('id-ID',{minimumFractionDigits:2,maximumFractionDigits:2});
export function ScoreSummary({data}:{data?:ScoreComparison}) {
  if (!data) return null;
  const gap = data.internal != null && data.final != null ? data.internal-data.final : null;
  return <section className="panel score-comparison" aria-label="Ringkasan dan interpretasi nilai">
    {data.interpretationError && <p role="alert">Interpretasi periode tidak valid. Admin perlu memperbaiki aturan.</p>}
    <div><span>Penilaian mandiri{data.scope==='unit' ? ' unit Anda' : ''}{data.finalized ? ' saat finalisasi' : ' · sementara'}</span><strong>{number(data.internal)}</strong>{data.internal == null ? <small>Nilai belum tersedia</small> : <InterpretationText band={data.internalInterpretation}/>}<small>{data.scope==='unit' ? 'Unit Anda' : 'Total seluruh unit'} · {data.completed} dari {data.total} indikator diisi</small></div>
    {data.finalized && <><div><span>Nilai akhir verifikasi{data.scope==='unit' ? ' seluruh unit' : ''}</span><strong>{number(data.final)}</strong><InterpretationText band={data.finalInterpretation}/></div>{data.scope!=='unit' && <div><span>Selisih mandiri − verifikasi</span><strong>{gap == null ? '—' : `${gap>0?'+':''}${number(gap)}`}</strong><small>{gap == null ? 'Nilai belum tersedia' : gap>0 ? 'Penilaian mandiri lebih tinggi' : gap<0 ? 'Nilai verifikasi lebih tinggi' : 'Nilai mandiri dan verifikasi sama'}</small></div>}</>}
  </section>;
}
export function FinalInterpretation({value,data}:{value:number|null;data?:ScoreComparison}) {
  if (value == null || !data) return null;
  return <InterpretationText band={interpretScore(value,data.bands,data.maximum)}/>;
}
