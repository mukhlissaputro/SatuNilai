"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Evidence = { name: string; size: string };
type Indicator = {
  id: string;
  scoreId?: string;
  code: string;
  name: string;
  category: string;
  subcategory: string;
  score: number;
  label: string;
  target: number;
  evidence: Evidence[];
  assessor: string;
};

type Category = { id: string; name: string; desc: string; progress: number; score: number; weight: number };

const initialCategories: Category[] = [
  { id: "cat-1", name: "Aspek 1", desc: "Kebijakan Internal Tata Kelola", progress: 92, score: 4.12, weight: 0.2 },
  { id: "cat-2", name: "Aspek 2", desc: "Tata Kelola Pemerintah Digital", progress: 78, score: 3.84, weight: 0.3 },
  { id: "cat-3", name: "Aspek 3", desc: "Manajemen Pemerintah Digital", progress: 64, score: 3.21, weight: 0.2 },
  { id: "cat-4", name: "Aspek 4", desc: "Layanan Pemerintah Digital", progress: 88, score: 4.02, weight: 0.3 },
];

const subcategories = [
  { code: "1.1", name: "Kebijakan Internal Tata Kelola SPBE", category: "Aspek 1", score: 4.28, target: 4.5, indicators: 4 },
  { code: "1.2", name: "Kebijakan Internal Manajemen SPBE", category: "Aspek 1", score: 3.96, target: 4.2, indicators: 6 },
  { code: "2.1", name: "Perencanaan Strategis SPBE", category: "Aspek 2", score: 4.10, target: 4.5, indicators: 4 },
  { code: "2.2", name: "Teknologi Informasi dan Komunikasi", category: "Aspek 2", score: 3.58, target: 4.0, indicators: 5 },
  { code: "3.1", name: "Penerapan Manajemen SPBE", category: "Aspek 3", score: 3.21, target: 4.0, indicators: 8 },
  { code: "4.1", name: "Layanan Administrasi Pemerintahan", category: "Aspek 4", score: 4.18, target: 4.5, indicators: 7 },
  { code: "4.2", name: "Layanan Publik Berbasis Elektronik", category: "Aspek 4", score: 3.86, target: 4.2, indicators: 6 },
];

const initialIndicators: Indicator[] = [
  { id: "1", code: "1.1.1", name: "Arsitektur SPBE Instansi Pusat/Pemerintah Daerah", category: "Aspek 1", subcategory: "Tata Kelola Pemerintah Digital", score: 4, label: "Sangat Baik", target: 5, evidence: [{ name: "Perbup-Arsitektur-SPBE-2025.pdf", size: "2,4 MB" }], assessor: "Rina Kusuma" },
  { id: "2", code: "1.1.2", name: "Peta Rencana SPBE Instansi", category: "Aspek 1", subcategory: "Tata Kelola Pemerintah Digital", score: 3, label: "Baik", target: 4, evidence: [{ name: "Peta-Rencana-SPBE.xlsx", size: "840 KB" }, { name: "Notulen-Evaluasi.pdf", size: "1,1 MB" }], assessor: "Budi Santoso" },
  { id: "3", code: "1.2.1", name: "Penerapan Manajemen Risiko SPBE", category: "Aspek 1", subcategory: "Manajemen Layanan Digital Pemerintah", score: 2, label: "Cukup", target: 4, evidence: [], assessor: "Siti Rahma" },
  { id: "4", code: "2.1.1", name: "Layanan Administrasi Pemerintahan Berbasis Elektronik", category: "Aspek 2", subcategory: "Layanan Pemerintah Digital", score: 5, label: "Memuaskan", target: 5, evidence: [{ name: "Laporan-Layanan-2025.pdf", size: "3,8 MB" }], assessor: "Rina Kusuma" },
];

const scoreLabels = ["Belum Dinilai", "Kurang", "Cukup", "Baik", "Sangat Baik", "Memuaskan"];

export default function Home() {
  const [active, setActive] = useState("Dashboard");
  const [year, setYear] = useState("2025");
  const [assessment, setAssessment] = useState("SPBE");
  const [indicators, setIndicators] = useState(initialIndicators);
  const [categories, setCategories] = useState(initialCategories);
  const [selectedId, setSelectedId] = useState("3");
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState("");
  const [sessionUser, setSessionUser] = useState<{ displayName: string; role: string } | null>(null);
  const [backendReady, setBackendReady] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = indicators.find((item) => item.id === selectedId) ?? indicators[0];
  const filtered = useMemo(() => indicators.filter((item) => `${item.code} ${item.name} ${item.subcategory}`.toLowerCase().includes(query.toLowerCase())), [indicators, query]);
  const progress = Math.round((indicators.filter((item) => item.score > 0).length / indicators.length) * 100);
  const totalWeight = categories.reduce((sum, category) => sum + category.weight, 0);
  const finalScore = categories.reduce((sum, category) => sum + category.score * category.weight, 0);

  const updateWeight = (index: number, value: number) => {
    const normalized = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    setCategories((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, weight: normalized } : item));
    const category = categories[index];
    if (backendReady && category) void fetch("/api/dashboard", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "weight", id: category.id, value: normalized * 100 }) }).then((response) => { if (!response.ok) throw new Error(); }).then(() => flash("Bobot tersimpan permanen")).catch(() => flash("Bobot belum dapat disimpan"));
  };

  useEffect(() => {
    let active = true;
    async function connect() {
      try {
        await fetch("/api/bootstrap", { method: "POST", headers: { "Content-Type": "application/json" } });
        const response = await fetch("/api/me", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as { user: { displayName: string; role: string } };
        if (active) { setSessionUser(data.user); setBackendReady(true); }
        const dashboardResponse = await fetch("/api/dashboard", { cache: "no-store" });
        if (dashboardResponse.ok && active) {
          const dashboard = await dashboardResponse.json() as { categories: Array<{ id: string; code: string; name: string; weight: number; score: number; total: number; completed: number }>; indicators: Array<{ id: string; score_id: string; code: string; name: string; category: string; subcategory: string; score: number | null; target: number | null; evidence_count: number; assessor_name: string | null }> };
          if (dashboard.categories.length) setCategories(dashboard.categories.map((item) => ({ id: item.id, name: `Aspek ${item.code}`, desc: item.name, weight: Number(item.weight) / 100, score: Number(item.score), progress: item.total ? Math.round((Number(item.completed) / Number(item.total)) * 100) : 0 })));
          if (dashboard.indicators.length) {
            setIndicators(dashboard.indicators.map((item) => ({ id: item.id, scoreId: item.score_id, code: item.code, name: item.name, category: item.category, subcategory: item.subcategory, score: Number(item.score ?? 0), label: scoreLabels[Number(item.score ?? 0)] ?? "Belum Dinilai", target: Number(item.target ?? 0), evidence: Array.from({ length: Number(item.evidence_count) }, (_, index) => ({ name: `Bukti dukung ${index + 1}`, size: "Tersimpan privat" })), assessor: item.assessor_name ?? "Belum direview" })));
            setSelectedId(dashboard.indicators[0].id);
          }
        }
      } catch { /* dashboard remains available while backend reconnects */ }
    }
    void connect();
    return () => { active = false; };
  }, []);

  const displayName = sessionUser?.displayName?.split("@")[0] ?? "Ahmad Rasyid";
  const displayRole = sessionUser?.role === "admin" ? "Administrator" : sessionUser?.role === "head" ? "Kepala Unit" : "Staf";

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2600);
  };

  const setScore = (score: number) => {
    setIndicators((items) => items.map((item) => item.id === selected.id ? { ...item, score, label: scoreLabels[score] } : item));
    flash("Nilai indikator berhasil diperbarui");
    if (backendReady && selected.scoreId) void fetch("/api/dashboard", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "score", id: selected.scoreId, value: score }) }).then((response) => { if (!response.ok) throw new Error(); }).then(() => flash("Nilai tersimpan permanen")).catch(() => flash("Nilai belum dapat disimpan"));
  };

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    const additions = Array.from(files).map((file) => ({ name: file.name, size: file.size > 1_000_000 ? `${(file.size / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(file.size / 1000))} KB` }));
    if (backendReady && selected.scoreId) {
      let uploaded = 0;
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("scoreId", selected.scoreId);
        form.set("title", file.name.replace(/\.[^.]+$/, ""));
        form.set("file", file);
        const response = await fetch("/api/evidence", { method: "POST", body: form });
        if (response.ok) uploaded += 1;
      }
      if (!uploaded) { flash("Bukti ditolak atau belum dapat disimpan"); return; }
      setIndicators((items) => items.map((item) => item.id === selected.id ? { ...item, evidence: [...item.evidence, ...additions.slice(0, uploaded)] } : item));
      flash(`${uploaded} bukti tersimpan secara privat`);
    } else {
      setIndicators((items) => items.map((item) => item.id === selected.id ? { ...item, evidence: [...item.evidence, ...additions] } : item));
      flash(`${additions.length} bukti ditambahkan sementara`);
    }
  };

  const scoreColor = (score: number) => score >= 5 ? "blue" : score >= 4 ? "green" : score >= 3 ? "amber" : "red";

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">S</span><div><strong>SatuNilai</strong><small>Manajemen Penilaian</small></div></div>
        <nav aria-label="Navigasi utama">
          <p className="nav-label">RUANG KERJA</p>
          {["Dashboard", "Penilaian", "Bukti Dukung", "Laporan"].map((item) => <button key={item} className={active === item ? "active" : ""} onClick={() => setActive(item)}><span>{item === "Dashboard" ? "⌂" : item === "Penilaian" ? "▣" : item === "Bukti Dukung" ? "▱" : "▥"}</span>{item}{item === "Bukti Dukung" && <em>3</em>}</button>)}
          <p className="nav-label">PENGELOLAAN</p>
          {["Tahun Penilaian", "Jenis Penilaian", "Struktur Indikator", "Pengguna & Akses"].map((item) => <button key={item} onClick={() => { setActive(item); flash(`${item} siap dikelola`); }}><span>{item === "Pengguna & Akses" ? "♙" : "◇"}</span>{item}</button>)}
        </nav>
        <div className="sidebar-help"><span>?</span><div><strong>Butuh bantuan?</strong><small>Lihat panduan penggunaan</small></div></div>
        <div className="user-card"><div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div><div><strong>{displayName}</strong><small>{displayRole}</small></div><button aria-label="Menu pengguna">•••</button></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="mobile-brand"><span className="brand-mark">S</span><strong>SatuNilai</strong></div>
          <div className="top-actions"><span className={`secure-state ${backendReady ? "ready" : "connecting"}`}><i />{backendReady ? "Penyimpanan privat aktif" : "Menghubungkan penyimpanan"}</span><button className="icon-btn" aria-label="Notifikasi">♢<i /></button><div className="header-user"><div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div><span><strong>{displayName}</strong><small>{displayRole}</small></span></div></div>
        </header>

        <div className="content">
          {active === "Dashboard" ? <>
          <div className="page-heading"><div><p className="eyebrow">RINGKASAN PENILAIAN</p><h1>Selamat pagi, {displayName.split(" ")[0]} <span>👋</span></h1><p>Pantau progres dan kelengkapan dokumen penilaian instansi Anda.</p></div><button className="primary" onClick={() => setActive("Penilaian")}>＋ Buka Penilaian</button></div>
          <div className="filterbar">
            <label>Tahun Penilaian<select value={year} onChange={(e) => setYear(e.target.value)}><option>2025</option><option>2024</option><option>2023</option></select></label>
            <label>Jenis Penilaian<select value={assessment} onChange={(e) => setAssessment(e.target.value)}><option>SPBE</option><option>Indeks SDI</option><option>EPSS</option><option>ITKP</option></select></label>
            <div className="final-score"><span>Nilai Akhir {assessment}</span><strong>{finalScore.toFixed(2).replace(".", ",")}</strong><b className="badge green">Sangat Baik</b></div>
          </div>

          <div className="metrics">
            <article><span className="metric-icon purple">▦</span><div><small>TOTAL INDIKATOR</small><strong>47</strong><p><b>4 aspek</b> · 12 sub kategori</p></div></article>
            <article><span className="metric-icon green">✓</span><div><small>SUDAH DINILAI</small><strong>38 <i>/ 47</i></strong><p><b>80,9%</b> telah selesai</p></div></article>
            <article><span className="metric-icon amber">◷</span><div><small>PERLU DILENGKAPI</small><strong>9</strong><p><b>3 bukti</b> belum diunggah</p></div></article>
            <article><span className="metric-icon blue">↗</span><div><small>TARGET NILAI</small><strong>4,20</strong><p><b>+0,48</b> dari nilai saat ini</p></div></article>
          </div>

          <div className="main-grid">
            <section className="panel progress-panel">
              <div className="panel-head"><div><h2>Progres Penilaian {assessment}</h2><p>Per kategori utama · Tahun {year}</p></div><button>⋮</button></div>
              <div className="overall"><div className="ring" style={{ "--progress": `${progress}%` } as React.CSSProperties}><span>{progress}%</span></div><div><strong>{assessment} {year}</strong><p>38 dari 47 indikator selesai dinilai</p></div><b className="badge green">Berjalan</b></div>
              <div className="category-list">
                <div className="weight-header"><span>Kategori & progres</span><span>Bobot</span><span>Nilai</span><span>Kontribusi</span></div>
                {categories.map((cat, i) => <div className="category-row weighted" key={cat.name}><span className={`cat-num c${i + 1}`}>{i + 1}</span><div className="cat-body"><div><strong>{cat.name}</strong><small>{cat.desc}</small></div><div className="progress-track"><i style={{ width: `${cat.progress}%` }} /></div></div><label className="weight-input" aria-label={`Bobot ${cat.name}`}><input type="number" min="0" max="1" step="0.05" value={cat.weight} onChange={(event) => updateWeight(i, Number(event.target.value))} /><small>{Math.round(cat.weight * 100)}%</small></label><div className="cat-score"><strong>{cat.score.toFixed(2).replace(".", ",")}</strong><small>{cat.progress}% selesai</small></div><div className="contribution"><strong>{(cat.score * cat.weight).toFixed(3).replace(".", ",")}</strong><small>{cat.score.toFixed(2).replace(".", ",")} × {cat.weight.toFixed(2).replace(".", ",")}</small></div></div>)}
                <div className={`weight-total ${Math.abs(totalWeight - 1) < 0.001 ? "valid" : "invalid"}`}><span>Total bobot</span><strong>{totalWeight.toFixed(2).replace(".", ",")} <small>({Math.round(totalWeight * 100)}%)</small></strong><span>{Math.abs(totalWeight - 1) < 0.001 ? "✓ Bobot sudah sesuai" : "! Total bobot harus 1,00"}</span></div>
              </div>
              <button className="text-button" onClick={() => setActive("Penilaian")}>Lihat seluruh penilaian <span>→</span></button>
            </section>

            <section className="panel activity-panel">
              <div className="panel-head"><div><h2>Aktivitas Terkini</h2><p>Pembaruan dari tim Anda</p></div><button>⋮</button></div>
              <div className="activity-list">
                {[{ initials: "RK", color: "pink", text: <><b>Rina Kusuma</b> memperbarui nilai indikator <strong>1.1.1</strong></>, time: "12 menit lalu" }, { initials: "BS", color: "blue", text: <><b>Budi Santoso</b> mengunggah bukti dukung pada <strong>1.1.2</strong></>, time: "45 menit lalu" }, { initials: "SR", color: "amber", text: <><b>Siti Rahma</b> menambahkan catatan pada <strong>1.2.1</strong></>, time: "2 jam lalu" }, { initials: "AR", color: "green", text: <><b>Anda</b> menyetujui penilaian <strong>Aspek 4</strong></>, time: "Kemarin, 16.20" }].map((activity, i) => <div className="activity" key={i}><div className={`avatar ${activity.color}`}>{activity.initials}</div><div><p>{activity.text}</p><small>{activity.time}</small></div></div>)}
              </div>
              <button className="text-button">Lihat semua aktivitas <span>→</span></button>
            </section>
          </div>

          <section className="panel subcategory-panel">
            <div className="panel-head"><div><h2>Nilai Subkategori</h2><p>Nilai merupakan rata-rata indikator di dalam subkategori dan menopang nilai kategori utama.</p></div><span className="formula-pill">Nilai kategori = Σ nilai subkategori</span></div>
            <div className="subcategory-grid">{subcategories.map((sub) => {
              const percent = Math.min(100, (sub.score / 5) * 100);
              return <article key={sub.code} className="subcategory-card"><div className="subcategory-top"><span className="code">{sub.code}</span><span>{sub.category}</span></div><h3>{sub.name}</h3><div className="subcategory-score"><strong>{sub.score.toFixed(2).replace(".", ",")}</strong><span>/ 5,00</span><b className={`trend ${sub.score >= sub.target ? "met" : "gap"}`}>{sub.score >= sub.target ? "Target tercapai" : `Selisih ${(sub.target - sub.score).toFixed(2).replace(".", ",")}`}</b></div><div className="score-bar"><i style={{ width: `${percent}%` }} /></div><footer><span>{sub.indicators} indikator</span><span>Target <strong>{sub.target.toFixed(2).replace(".", ",")}</strong></span></footer></article>;
            })}</div>
          </section>

          <section className="panel indicators-panel">
            <div className="panel-head indicators-head"><div><h2>Indikator yang Perlu Ditindaklanjuti</h2><p>Prioritaskan indikator dengan selisih nilai terbesar atau bukti belum lengkap.</p></div><label className="search">⌕<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari indikator..." /></label></div>
            <div className="table-wrap"><table><thead><tr><th>INDIKATOR</th><th>SUB KATEGORI</th><th>NILAI SAAT INI</th><th>TARGET</th><th>BUKTI DUKUNG</th><th>PENANGGUNG JAWAB</th><th /></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className={selectedId === item.id ? "selected-row" : ""} onClick={() => setSelectedId(item.id)}><td><span className="code">{item.code}</span><strong>{item.name}</strong></td><td><span>{item.subcategory}</span></td><td><b className={`score-dot ${scoreColor(item.score)}`}>{item.score}</b><span>{item.label}</span></td><td><strong>{item.target}</strong><small>{scoreLabels[item.target]}</small></td><td>{item.evidence.length ? <span className="evidence-ok">✓ {item.evidence.length} file</span> : <span className="evidence-missing">! Belum ada</span>}</td><td><span>{item.assessor}</span></td><td><button aria-label={`Edit ${item.code}`}>›</button></td></tr>)}</tbody></table></div>
          </section>

          <section className="editor panel">
            <div className="editor-title"><div><span className="code">{selected.code}</span><div><h2>{selected.name}</h2><p>{selected.category} / {selected.subcategory}</p></div></div><button onClick={() => flash("Perubahan disimpan sebagai draf")}>Simpan Draf</button></div>
            <div className="editor-grid">
              <div><label className="field-label">Nilai Kematangan</label><div className="score-choices">{[1, 2, 3, 4, 5].map((score) => <button key={score} className={selected.score === score ? "chosen" : ""} onClick={() => setScore(score)}><strong>{score}</strong><span>{scoreLabels[score]}</span></button>)}</div><div className="target-note"><span>◎</span><p><strong>Target penilaian: Level {selected.target} — {scoreLabels[selected.target]}</strong><br />Pastikan dokumen membuktikan pemenuhan seluruh kriteria pada level target.</p></div></div>
              <div><label className="field-label">Bukti Dukung <span>({selected.evidence.length})</span></label><input ref={fileRef} type="file" hidden multiple accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png" onChange={(e) => void upload(e.target.files)} /><button className="upload-box" onClick={() => fileRef.current?.click()}><span>⇧</span><strong>Unggah bukti pendukung</strong><small>PDF, Word, Excel, JPG · Maks. 10 MB</small></button>{selected.evidence.map((file, i) => <div className="file-row" key={`${file.name}-${i}`}><span>▤</span><div><strong>{file.name}</strong><small>{file.size}</small></div><button aria-label="Hapus file" onClick={() => setIndicators((items) => items.map((item) => item.id === selected.id ? { ...item, evidence: item.evidence.filter((_, index) => index !== i) } : item))}>×</button></div>)}</div>
            </div>
          </section>
          </> : <ModulePage active={active} indicators={indicators} categories={categories} onOpenIndicator={(id) => { setSelectedId(id); setActive("Penilaian"); }} flash={flash} />}
        </div>
      </section>
      {toast && <div className="toast"><span>✓</span>{toast}</div>}
    </main>
  );
}

function ModulePage({ active, indicators, categories, onOpenIndicator, flash }: { active: string; indicators: Indicator[]; categories: Category[]; onOpenIndicator: (id: string) => void; flash: (message: string) => void }) {
  const configs: Record<string, { eyebrow: string; title: string; desc: string; action: string }> = {
    "Penilaian": { eyebrow: "RUANG KERJA", title: "Penilaian SPBE 2025", desc: "Isi, kirim, dan pantau status penilaian setiap indikator.", action: "Kirim Penilaian" },
    "Bukti Dukung": { eyebrow: "DOKUMEN PRIVAT", title: "Bukti Dukung", desc: "Kelola dokumen, tautan, versi, keterkaitan indikator, dan catatan pemeriksa.", action: "Tambah Bukti" },
    "Laporan": { eyebrow: "PELAPORAN", title: "Laporan Penilaian", desc: "Rekap nilai, analisis kesenjangan, serta matriks indikator dan bukti.", action: "Buat Laporan" },
    "Tahun Penilaian": { eyebrow: "PENGELOLAAN", title: "Tahun & Periode Penilaian", desc: "Atur jadwal, tenggat waktu, status, dan penguncian periode penilaian.", action: "Tambah Periode" },
    "Jenis Penilaian": { eyebrow: "PENGELOLAAN", title: "Jenis Penilaian", desc: "Kelola SPBE, Indeks SDI, EPSS, ITKP, dan instrumen lainnya.", action: "Tambah Jenis" },
    "Struktur Indikator": { eyebrow: "INSTRUMEN BERVERSI", title: "Struktur Indikator", desc: "Kelola kategori, subkategori, indikator, bobot, dan skala nilai.", action: "Tambah Struktur" },
    "Pengguna & Akses": { eyebrow: "ADMINISTRASI", title: "Pengguna & Hak Akses", desc: "Kelola unit kerja, administrator, staf, kepala unit, dan penugasan indikator.", action: "Tambah Pengguna" },
  };
  const config = configs[active] ?? configs.Penilaian;
  return <div className="module-page">
    <div className="page-heading"><div><p className="eyebrow">{config.eyebrow}</p><h1>{config.title}</h1><p>{config.desc}</p></div><button className="primary" onClick={() => flash(`${config.action} siap digunakan`)}>＋ {config.action}</button></div>
    {active === "Penilaian" && <><div className="module-stats"><article><small>INDIKATOR</small><strong>{indicators.length}</strong><span>Ditugaskan</span></article><article><small>SUDAH DINILAI</small><strong>{indicators.filter((i) => i.score > 0).length}</strong><span>Nilai internal</span></article><article><small>BUKTI TERKAIT</small><strong>{indicators.reduce((sum, i) => sum + i.evidence.length, 0)}</strong><span>Dokumen privat</span></article><article><small>MENUNGGU REVIEW</small><strong>2</strong><span>Oleh administrator</span></article></div><section className="panel module-table"><div className="panel-head"><div><h2>Daftar Indikator</h2><p>Klik indikator untuk membuka formulir pengisian.</p></div><span className="badge green">Periode berjalan</span></div><div className="table-wrap"><table><thead><tr><th>KODE</th><th>INDIKATOR</th><th>SUBKATEGORI</th><th>INTERNAL</th><th>TARGET</th><th>BUKTI</th><th>STATUS</th></tr></thead><tbody>{indicators.map((item) => <tr key={item.id} onClick={() => onOpenIndicator(item.id)}><td><span className="code">{item.code}</span></td><td><strong>{item.name}</strong></td><td>{item.subcategory}</td><td>{item.score} · {item.label}</td><td>{item.target}</td><td>{item.evidence.length} file</td><td><span className="evidence-ok">Draf</span></td></tr>)}</tbody></table></div></section></>}
    {active === "Bukti Dukung" && <section className="panel module-table"><div className="panel-head"><div><h2>Repositori Bukti</h2><p>Satu dokumen dapat digunakan pada beberapa indikator.</p></div><label className="search">⌕<input placeholder="Cari dokumen..." /></label></div><div className="evidence-cards">{indicators.flatMap((i) => i.evidence.map((e, index) => ({ ...e, code: i.code, index }))).map((e, i) => <article key={`${e.code}-${i}`}><span className="doc-icon">▤</span><div><strong>{e.name}</strong><small>{e.size} · Indikator {e.code}</small></div><b>Versi 1</b><button>•••</button></article>)}</div></section>}
    {active === "Laporan" && <div className="report-grid"><section className="panel report-preview"><div className="report-cover"><span>SATUNILAI</span><h2>Laporan Penilaian SPBE</h2><p>Tahun 2025 · Dinas Komunikasi dan Informatika</p><strong>{categories.reduce((sum, c) => sum + c.score * c.weight, 0).toFixed(2).replace(".", ",")}</strong><small>NILAI AKHIR</small></div></section><section className="panel report-options"><h2>Isi laporan</h2>{["Rekap nilai akhir", "Analisis kesenjangan target", "Perbandingan nilai asesor", "Matriks indikator dan bukti", "Catatan pemeriksa"].map((item) => <label key={item}><input type="checkbox" defaultChecked /> {item}</label>)}<button className="primary" onClick={() => flash("Laporan PDF sedang disiapkan")}>Unduh PDF</button><button className="outline" onClick={() => flash("Laporan Excel sedang disiapkan")}>Unduh Excel</button></section></div>}
    {active === "Tahun Penilaian" && <section className="panel module-table"><div className="panel-head"><div><h2>Daftar Periode</h2><p>Periode lama tetap tersimpan dan tidak berubah.</p></div></div><div className="period-cards"><article><div className="year-box">2025</div><div><strong>Penilaian SPBE 2025</strong><small>1 Januari–31 Desember 2025</small></div><span className="badge green">Berjalan</span><b>81% selesai</b><button>Kelola</button></article><article><div className="year-box muted">2024</div><div><strong>Penilaian SPBE 2024</strong><small>Instrumen versi 2024</small></div><span className="badge">Dikunci</span><b>100% selesai</b><button>Lihat</button></article></div></section>}
    {active === "Jenis Penilaian" && <div className="type-grid">{[{ code: "SPBE", name: "Sistem Pemerintahan Berbasis Elektronik", count: 47, color: "purple" }, { code: "SDI", name: "Indeks Satu Data Indonesia", count: 32, color: "blue" }, { code: "EPSS", name: "Evaluasi Penyelenggaraan Statistik Sektoral", count: 38, color: "green" }, { code: "ITKP", name: "Indeks Tata Kelola Pengadaan", count: 25, color: "amber" }].map((type) => <article className="panel type-card" key={type.code}><span className={`metric-icon ${type.color}`}>{type.code.slice(0, 1)}</span><h2>{type.code}</h2><p>{type.name}</p><div><span>{type.count} indikator</span><span>1 versi aktif</span></div><button>Kelola Instrumen →</button></article>)}</div>}
    {active === "Struktur Indikator" && <section className="panel structure-panel"><div className="structure-toolbar"><select><option>SPBE · Instrumen 2025 v1</option></select><span className="badge green">Dipublikasikan</span><button onClick={() => flash("Versi baru dibuat sebagai draf")}>Duplikasi versi</button></div>{categories.map((cat, index) => <details key={cat.id} open={index === 0}><summary><span className={`cat-num c${index + 1}`}>{index + 1}</span><div><strong>{cat.name}</strong><small>{cat.desc}</small></div><b>Bobot {Math.round(cat.weight * 100)}%</b><button>•••</button></summary>{index === 0 && <div className="tree-items"><div><span>1.1</span><strong>Tata Kelola Pemerintah Digital</strong><small>2 indikator</small></div><div><span>1.2</span><strong>Manajemen Layanan Digital Pemerintah</strong><small>1 indikator</small></div></div>}</details>)}</section>}
    {active === "Pengguna & Akses" && <><div className="module-stats"><article><small>TOTAL PENGGUNA</small><strong>24</strong><span>Aktif</span></article><article><small>ADMIN</small><strong>3</strong><span>Akses penuh</span></article><article><small>STAF</small><strong>17</strong><span>Pengelola indikator</span></article><article><small>KEPALA UNIT</small><strong>4</strong><span>Pemantau</span></article></div><section className="panel module-table"><div className="panel-head"><div><h2>Daftar Pengguna</h2><p>Hak akses selalu diverifikasi oleh server.</p></div></div><div className="user-list">{[{ n: "Ahmad Rasyid", e: "ahmad@instansi.go.id", r: "Administrator", u: "Sekretariat" }, { n: "Rina Kusuma", e: "rina@instansi.go.id", r: "Staf", u: "Diskominfo" }, { n: "Budi Santoso", e: "budi@instansi.go.id", r: "Kepala Unit", u: "Bappeda" }].map((u) => <article key={u.e}><div className="avatar">{u.n.split(" ").map((n) => n[0]).join("")}</div><div><strong>{u.n}</strong><small>{u.e}</small></div><span>{u.u}</span><b>{u.r}</b><button>Kelola</button></article>)}</div></section></>}
  </div>;
}
