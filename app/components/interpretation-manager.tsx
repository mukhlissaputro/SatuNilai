'use client';
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { validateBands, type InterpretationBand } from '../../lib/score-interpretation';

type EditorHandle = {openAdd:()=>void};
type Props = {types:Array<Record<string,unknown>>;periods:Array<Record<string,unknown>>;flash:(message:string)=>void};
export const InterpretationManager = forwardRef<EditorHandle,Props>(function InterpretationManager({types,periods,flash},ref) {
  const [typeId,setTypeId]=useState('');
  const [periodId,setPeriodId]=useState('');
  const editor=useRef<EditorHandle>(null);
  useImperativeHandle(ref,()=>({openAdd:()=>editor.current ? editor.current.openAdd() : flash('Pilih jenis dan tahun penilaian terlebih dahulu')}),[flash]);
  const available=periods.filter(period=>String(period.typeId)===typeId);
  return <section className="panel structure-panel nested-structure">
    <div className="structure-toolbar">
      <div><strong>Interpretasi Nilai</strong><small>Aturan tersimpan terpisah untuk setiap periode penilaian</small></div>
      <label>Jenis Penilaian<select value={typeId} onChange={event=>{setTypeId(event.target.value);setPeriodId('');}}><option value="">Pilih jenis penilaian</option>{types.map(type=><option key={String(type.id)} value={String(type.id)}>{String(type.code)}</option>)}</select></label>
      <label>Tahun Penilaian<select value={periodId} disabled={!typeId} onChange={event=>setPeriodId(event.target.value)}><option value="">Pilih tahun penilaian</option>{available.map(period=><option key={String(period.id)} value={String(period.id)}>{String(period.year)} · {String(period.name)}</option>)}</select></label>
    </div>
    {!periodId ? <div className="empty-structure">Pilih jenis dan tahun penilaian untuk mengelola interpretasi nilai.</div> : <PeriodEditor key={periodId} ref={editor} periodId={periodId} flash={flash}/>}
  </section>;
});
const PeriodEditor=forwardRef<EditorHandle,{periodId:string;flash:(message:string)=>void}>(function PeriodEditor({periodId,flash},ref){
  const notify=useRef(flash).current;
  const [bands,setBands]=useState<InterpretationBand[]>([]);
  const [sources,setSources]=useState<Array<{id:string;year:number}>>([]);
  const [source,setSource]=useState('');
  const [locked,setLocked]=useState(true);
  const [loading,setLoading]=useState(true);
  const [maximum,setMaximum]=useState(100);
  const [busy,setBusy]=useState(false);
  const [modal,setModal]=useState<{index:number|null;minimum:string;predicate:string;interpretation:string}|null>(null);
  useEffect(()=>{
    let active=true;
    fetch(`/api/interpretations?periodId=${encodeURIComponent(periodId)}`,{cache:'no-store'}).then(async response=>{
      const result=await response.json();if(!response.ok)throw new Error(result.error??'Aturan belum dapat dimuat');
      if(active){setBands(result.bands);setSources(result.sources);setLocked(result.locked);setMaximum(Number(result.maximum));if(result.configurationError)notify(result.configurationError);}
    }).catch(error=>{if(active)notify(error.message);}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[periodId,notify]);
  const openAdd=()=>{
    if(loading||busy)return;
    if(locked){notify('Interpretasi periode final tidak dapat diubah.');return;}
    setModal({index:null,minimum:bands.length?'':'0',predicate:'',interpretation:''});
  };
  useImperativeHandle(ref,()=>({openAdd}));
  const persist=async(next:InterpretationBand[]|null)=>{
    setBusy(true);
    try {
      const body=next===null?{periodId,sourcePeriodId:source}:{periodId,bands:validateBands(next,maximum)};
      const response=await fetch('/api/interpretations',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      const result=await response.json();if(!response.ok)throw new Error(result.error??'Interpretasi gagal disimpan');
      setBands(result.bands);setModal(null);notify(next===null?'Interpretasi berhasil disalin.':'Interpretasi berhasil disimpan.');
    }catch(error){notify((error as Error).message);}finally{setBusy(false);}
  };
  const submit=(event:React.FormEvent)=>{
    event.preventDefault();if(!modal||busy)return;
    const row={minimum:Number(modal.minimum),predicate:modal.predicate,interpretation:modal.interpretation};
    const next=modal.index===null?[...bands,row]:bands.map((band,index)=>index===modal.index?row:band);
    void persist(next);
  };
  return <div className="interpretation-list">
    {loading?<p>Memuat interpretasi…</p>:<>
      <div className="interpretation-list-head"><div><strong>{bands.length} rentang interpretasi</strong><p>Batas bawah termasuk rentang; batas atas mengikuti rentang berikutnya. Nilai maksimal {maximum}.</p></div><span className={`badge ${locked?'':'green'}`}>{locked?'Final · terkunci':'Dapat diubah'}</span></div>
      {locked&&<p className="finalize-warning">Periode sudah final. Aturan interpretasi terkunci agar riwayat nilai tetap konsisten.</p>}
      {!locked&&<div className="interpretation-actions"><label>Salin dari tahun sebelumnya<select value={source} disabled={busy||!sources.length} onChange={event=>setSource(event.target.value)}><option value="">{sources.length?'Pilih tahun sumber':'Belum ada tahun sumber yang sesuai'}</option>{sources.map(row=><option key={row.id} value={row.id}>{row.year}</option>)}</select></label><button type="button" className="secondary" disabled={busy||!source} onClick={()=>{if(!bands.length||window.confirm('Ganti interpretasi periode ini dengan salinan tahun sumber?'))void persist(null);}}>{busy?'Memproses…':'Salin Interpretasi'}</button></div>}
      {!bands.length?<div className="empty-structure"><span>Belum ada interpretasi untuk periode ini.</span><button type="button" className="secondary" disabled={locked||busy} onClick={openAdd}>＋ Tambah Interpretasi</button></div>:<div className="interpretation-cards">{bands.map((band,index)=><article className="interpretation-card" key={band.minimum}><span className="badge">{band.predicate}</span><div><strong>{band.interpretation}</strong><small>{number(band.minimum)} ≤ Nilai {index+1<bands.length?`< ${number(bands[index+1].minimum)}`:`≤ ${number(maximum)}`}</small></div><div className="interpretation-card-actions"><button type="button" disabled={locked||busy} onClick={()=>{setModal({index,minimum:String(band.minimum),predicate:band.predicate,interpretation:band.interpretation});}}>Edit</button><button type="button" className="danger" disabled={locked||busy} onClick={()=>{if(window.confirm(`Hapus interpretasi ${band.predicate}?`))void persist(bands.filter((_,i)=>i!==index));}}>Hapus</button></div></article>)}</div>}
    </>}
    {modal&&<div className="modal-backdrop"><form className="admin-modal interpretation-modal" role="dialog" aria-modal="true" aria-labelledby="interpretation-dialog-title" onSubmit={submit}>
      <div className="modal-head"><h2 id="interpretation-dialog-title">{modal.index===null?'Tambah Interpretasi':'Edit Interpretasi'}</h2><button type="button" className="icon-button" aria-label="Tutup formulir interpretasi" disabled={busy} onClick={()=>setModal(null)}>×</button></div>
      <label>Batas bawah<input type="number" min="0" max={maximum} step="any" required disabled={busy} value={modal.minimum} onChange={event=>setModal({...modal,minimum:event.target.value})}/></label>
      <label>Predikat<input required maxLength={30} disabled={busy} value={modal.predicate} onChange={event=>setModal({...modal,predicate:event.target.value})}/></label>
      <label>Interpretasi<textarea rows={4} required maxLength={300} disabled={busy} value={modal.interpretation} onChange={event=>setModal({...modal,interpretation:event.target.value})}/></label>
      <p className="field-help">Batas pertama harus 0. Batas atas mengikuti rentang berikutnya; rentang terakhir sampai {maximum}.</p>
      <div className="form-actions"><button type="button" className="secondary" disabled={busy} onClick={()=>setModal(null)}>Batal</button><button className="primary" type="submit" disabled={busy}>{busy?'Menyimpan…':'Simpan Interpretasi'}</button></div>
    </form></div>}
  </div>;
});
function number(value:number){return value.toLocaleString('id-ID',{maximumFractionDigits:6});}
