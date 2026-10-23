import mysql from 'mysql2/promise';
import { createHash } from 'node:crypto';

// Only configuration is seeded. Existing scores, users and evidence are never deleted or copied.
export const matrix = [
  ['1','Pemanfaatan Sistem',30,[
    ['1.1','Rencana Pengadaan',10,[['1.1.1','Pengumuman RUP',5],['1.1.2','Nilai RUP Penyedia',2.5],['1.1.3','Nilai RUP e-tendering + e-purchasing',2.5]]],
    ['1.2','Realisasi Pengadaan',20,[['1.2.1','Realisasi E-Tendering dan E-Purchasing',10],['1.2.2','Realisasi Pengadaan Langsung Transaksional',2.5],['1.2.3','Realisasi Penunjukan Langsung Transaksional',2.5],['1.2.4','Realisasi Digitalisasi PBJ',5]]],
  ]],
  ['2','Kualifikasi dan Kompetensi SDM PBJ',30,[
    ['2.1','Keterisian Formasi JF PPBJ/Personel Lainnya',15,[['2.1.1','Bukti Keterisian Formasi JF PPBJ/Personel Lainnya',15]]],
    ['2.2','Penugasan JF PPBJ/Personel Lainnya',9,[['2.2.1','Bukti Penugasan JF PPBJ/Personel Lainnya',9]]],
    ['2.3','Penyusunan Renaksi pemenuhan JF PPBJ dan PPK Bersertifikat Kompetensi',6,[['2.3.1','Pemenuhan UK1–UK4 Sirenaksi JF PPBJ dan UK1–UK2 Sirenaksi PPK Bersertifikasi',6]]],
  ]],
  ['3','Tingkat Kematangan UKPBJ',30,[['3.1','Tingkat Kematangan UKPBJ',30,[['3.1.1','Tingkat kematangan proaktif pada 9 variabel serta penerapan tujuan pengadaan',30]]]]],
  ['4','Integritas PBJ',10,[['4.1','Integritas PBJ',10,[['4.1.1','Hasil Survei Penilaian Integritas (SPI) KPK',10]]]]],
];

async function main() {
  if (!process.argv.includes('--apply')) throw new Error('Buat backup terverifikasi, kemudian jalankan dengan --apply. Target: hanya ITKP 2026.');
  const db = await mysql.createConnection({host:process.env.DB_HOST ?? '127.0.0.1',port:Number(process.env.DB_PORT ?? 3306),user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME});
  const state = async () => {
    const [rows] = await db.query('SELECT s.* FROM indicator_scores s JOIN assessment_periods p ON p.id=s.period_id JOIN assessment_types t ON t.id=p.assessment_type_id WHERE NOT(t.code=? AND p.year=?) ORDER BY s.id',['ITKP',2026]);
    return createHash('sha256').update(JSON.stringify(rows)).digest('hex');
  };
  try {
    const [[lock]] = await db.query("SELECT GET_LOCK('satunilai_itkp_2026_setup',30) AS acquired");
    if (Number(lock.acquired)!==1) throw new Error('Konfigurasi ITKP sedang diperbarui proses lain');
    await db.beginTransaction();
    const before = await state();
    const [periods] = await db.query('SELECT p.* FROM assessment_periods p JOIN assessment_types t ON t.id=p.assessment_type_id WHERE t.code=? AND p.year=? FOR UPDATE',['ITKP',2026]);
    if (periods.length!==1) throw new Error('Harus ada tepat satu periode ITKP 2026');
    const period=periods[0];
    if (period.status==='finalized') throw new Error('Periode final tidak dapat diubah');
    const [[sharing]] = await db.query('SELECT COUNT(*) AS total FROM assessment_periods WHERE instrument_version_id=? AND id<>?',[period.instrument_version_id,period.id]);
    if (Number(sharing.total)) throw new Error('Instrumen dipakai periode lain; perlu versi terpisah');
    const [[count]] = await db.query('SELECT COUNT(*) AS total FROM categories WHERE instrument_version_id=?',[period.instrument_version_id]);
    const [[scores]] = await db.query('SELECT COUNT(*) AS total FROM indicator_scores WHERE period_id=?',[period.id]);
    const categoryId = code => `itkp-2026:category:${code}`;
    const subId = code => `itkp-2026:sub:${code}`;
    const indicatorId = code => `itkp-2026:indicator:${code}`;
    if (Number(count.total)) {
      // Repeated runs are read-only and must match the exact previously seeded structure.
      const [actual] = await db.query('SELECT i.id,i.max_value,i.weight_percent,sc.id AS subId,sc.weight_percent AS subWeight,c.id AS categoryId,c.weight_percent AS categoryWeight FROM indicators i JOIN subcategories sc ON sc.id=i.subcategory_id JOIN categories c ON c.id=sc.category_id WHERE c.instrument_version_id=? ORDER BY i.id',[period.instrument_version_id]);
      const expected=matrix.flatMap(([code,,weight,subs])=>subs.flatMap(([sub,,subWeight,items])=>items.map(([indicator,,maximum])=>({id:indicatorId(indicator),max_value:maximum,weight_percent:maximum,subId:subId(sub),subWeight,categoryId:categoryId(code),categoryWeight:weight})))).sort((a,b)=>a.id.localeCompare(b.id));
      if (Number(count.total)!==4 || JSON.stringify(actual)!==JSON.stringify(expected) || period.scoring_mode!=='direct_points' || period.max_score!==100) throw new Error('Instrumen 2026 sudah berisi konfigurasi lain; tidak ditimpa');
      console.log(JSON.stringify({unchanged:true,periodId:period.id,indicators:actual.length,scores:Number(scores.total)}));
      await db.rollback(); return;
    }
    if (Number(scores.total)) throw new Error('Periode sudah memiliki nilai; tidak direset');
    let subCount=0,indicatorCount=0;
    for (const [code,name,weight,subs] of matrix) {
      await db.execute('INSERT INTO categories(id,instrument_version_id,code,name,weight_percent,sort_order) VALUES(?,?,?,?,?,?)',[categoryId(code),period.instrument_version_id,code,name,weight,Number(code)]);
      for (const [sub,name,maximum,items] of subs) {
        subCount++;
        await db.execute('INSERT INTO subcategories(id,category_id,code,name,weight_percent,target_value,sort_order) VALUES(?,?,?,?,?,?,?)',[subId(sub),categoryId(code),sub,name,maximum,maximum,subCount]);
        for (const [indicator,name,maximum] of items) {
          indicatorCount++;
          await db.execute('INSERT INTO indicators(id,subcategory_id,code,name,weight_percent,max_value,sort_order) VALUES(?,?,?,?,?,?,?)',[indicatorId(indicator),subId(sub),indicator,name,maximum,maximum,indicatorCount]);
        }
      }
    }
    await db.execute('UPDATE assessment_periods SET max_score=100,scoring_mode=?,updated_at=CURRENT_TIMESTAMP WHERE id=?',['direct_points',period.id]);
    const [[totals]]=await db.query('SELECT COUNT(*) AS total,SUM(i.max_value) AS maximum FROM indicators i JOIN subcategories sc ON sc.id=i.subcategory_id JOIN categories c ON c.id=sc.category_id WHERE c.instrument_version_id=?',[period.instrument_version_id]);
    if (Number(totals.total)!==12 || Number(totals.maximum)!==100 || subCount!==7 || before!==await state()) throw new Error('Verifikasi konfigurasi atau nilai lama gagal; transaksi dibatalkan');
    await db.commit();
    console.log(JSON.stringify({configured:true,periodId:period.id,categories:4,subcategories:subCount,indicators:indicatorCount,maximum:100,scores:0,oldScoresUnchanged:true}));
  } catch(error) { await db.rollback(); throw error; }
  finally { await db.query("SELECT RELEASE_LOCK('satunilai_itkp_2026_setup')").catch(()=>{}); await db.end(); }
}
if (process.argv[1] && import.meta.url === new URL(process.argv[1], 'file:').href) await main();
