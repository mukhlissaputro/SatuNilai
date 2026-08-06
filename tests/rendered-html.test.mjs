import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    {
      ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server merender aplikasi SatuNilai", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /SatuNilai/);
  assert.match(html, /Memuat SatuNilai/);
});

test("login, password, sesi, dan reset password tersedia", async () => {
  const [page, security, login, forgot, reset] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/_security.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/login/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/forgot-password/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/reset-password/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Masuk ke SatuNilai/);
  assert.match(page, /Lupa password/);
  assert.match(page, /Akun uji lokal/);
  assert.match(page, /staff@localhost/);
  assert.match(page, /kepala\.unit@localhost/);
  assert.match(page, /Password baru \(opsional\)/);
  assert.match(security, /PBKDF2/);
  assert.match(security, /HttpOnly; SameSite=Strict/);
  assert.match(login, /verifyPassword/);
  assert.match(forgot, /password_reset_tokens/);
  assert.match(reset, /DELETE FROM auth_sessions/);
});

test("dashboard adaptif memakai akses, periode, bukti, dan tren database", async () => {
  const [page, dashboard] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/dashboard/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Satu Dashboard untuk Penilaian yang Tertib dan Terkendali/);
  assert.match(page, /logo-komnas-ham\.png/);
  assert.match(page, /Pilih jenis dan tahun penilaian/);
  assert.match(page, /Tren Nilai/);
  assert.match(page, /indicatorsWithEvidence/);
  assert.match(dashboard, /user_assessment_types/);
  assert.match(dashboard, /COUNT\(DISTINCT i\.id\) AS totalIndicators/);
  assert.match(dashboard, /evidence_links/);
  assert.match(dashboard, /categoryScore/);
});

test("pengelolaan admin menyediakan operasi CRUD", async () => {
  const [page, route] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /export async function GET/);
  assert.match(route, /export async function POST/);
  assert.match(route, /export async function PATCH/);
  assert.match(route, /export async function DELETE/);
  assert.match(page, /method: editingId \? "PATCH" : "POST"/);
  assert.match(page, /method: "DELETE"/);
  assert.match(page, /Edit/);
  assert.match(page, /Hapus/);
  assert.match(page, /function StructureManager/);
  assert.match(page, /"subcategory"/);
  assert.match(page, /"indicator"/);
  assert.match(
    page,
    /Setiap jenis dan tahun memakai versi instrumen tersendiri/,
  );
  assert.match(page, /"Kategori Indikator"/);
  assert.match(
    page,
    /Setiap jenis dan tahun memakai versi instrumen tersendiri/,
  );
  assert.match(route, /Instrumen \$\{type\.code\} \$\{year\}/);
  assert.match(route, /DELETE FROM instrument_versions/);
});

test("akses multi-penilaian dan workspace penilaian tersedia", async () => {
  const [page, workspace, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/assessment-workspace/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../database.sql", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /CREATE TABLE `user_assessment_types`/);
  assert.match(page, /Akses Jenis Penilaian/);
  assert.match(page, /Administrator otomatis memiliki akses/);
  assert.match(page, /disabled=\{isAdmin\}/s);
  assert.match(page, /function AssessmentWorkspace/);
  assert.match(page, /Nilai Subkategori/);
  assert.match(page, /Tautan Google Drive \/ website/);
  assert.match(workspace, /assertTypeAccess/);
  assert.match(workspace, /user\.role !== "admin"/);
  assert.match(workspace, /export async function POST/);
  assert.match(workspace, /INSERT INTO indicator_scores/);
});

test("target penilaian hanya berada pada subkategori dan mendukung skala fleksibel", async () => {
  const [page, workspace, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/assessment-workspace/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../database.sql", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /`target_value` real/);
  assert.match(page, /Target Nilai/);
  assert.match(page, /modal\.resource === "subcategory"/);
  assert.match(page, /Target Subkategori/);
  assert.match(
    page,
    /type="number"[\s\S]{0,120}min="0"[\s\S]{0,120}step="0\.01"/,
  );
  assert.doesNotMatch(page, /setTarget/);
  assert.doesNotMatch(workspace, /body\.target/);
  assert.match(workspace, /COALESCE\(sc\.target_value,0\)/);
  assert.doesNotMatch(workspace, /value > 5/);
  assert.match(workspace, /relation\.targetValue/);
});

test("nilai maksimal periode membatasi target dan nilai mandiri", async () => {
  const [page, admin, workspace, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/admin/route.ts", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/assessment-workspace/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../database.sql", import.meta.url), "utf8"),
  ]);
  assert.match(schema, /`max_score` real DEFAULT 5 NOT NULL/);
  assert.match(page, /Nilai maksimal/);
  assert.match(page, /max=\{periodMaxScore\}/);
  assert.match(admin, /targetValue > period\.maxScore/);
  assert.match(admin, /Nilai maksimal tidak boleh lebih kecil/);
  assert.match(workspace, /value > relation\.maxScore/);
});

test("pilihan multi-penilaian dimulai kosong dan input langsung dibatasi", async () => {
  const [page, workspace, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/assessment-workspace/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/crud.css", import.meta.url), "utf8"),
  ]);
  assert.match(workspace, /allowedTypeIds\.length === 1/);
  assert.match(
    page,
    /Pilih jenis penilaian untuk menampilkan nilai subkategori/,
  );
  assert.match(page, /Math\.min\(\s*periodMaxScore/);
  assert.match(css, /\.access-checks\{[^}]*text-align:left/);
});

test("judul adaptif, status bukti, dan tampilan kepala unit tersedia", async () => {
  const [page, workspace, download, css] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/api/assessment-workspace/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../app/api/evidence/[id]/download/route.ts", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/crud.css", import.meta.url), "utf8"),
  ]);
  assert.match(page, /onContextChange/);
  assert.match(page, /Penilaian \$\{String\(selectedType/);
  assert.match(page, /Daftar Bukti Dukung/);
  assert.match(page, /target="_blank"/);
  assert.match(page, /canEdit && selectedStatus !== "approved"/);
  assert.doesNotMatch(page, /Ditentukan admin pada subkategori/);
  assert.match(workspace, /AS evidenceCount/);
  assert.match(download, /disposition/);
  assert.match(css, /\.has-evidence/);
});

test("verifikasi admin, finalisasi asesor, dan laporan adaptif tersedia", async () => {
  const [page, workspace, evidence, pdf, excel] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/assessment-workspace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/evidence/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reports/pdf/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reports/excel/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Finalisasi & Nilai Asesor/);
  assert.match(page, /Menunggu verifikasi admin/);
  assert.match(page, /Tolak Bukti Dukung/);
  assert.match(page, /Lanjutkan Penolakan/);
  assert.match(page, /const rejectingIndicator = rejectingId/);
  assert.match(page, /\["submitted", "draft"\]\.includes\(status\)/);
  assert.match(page, /weightedFinalScore/);
  assert.match(page, /dikalikan bobot kategori utama/);
  assert.match(page, /Bobot subkategori dalam kategori/);
  assert.match(page, /status-row-/);
  assert.match(page, /Bukti pernah ditolak/);
  assert.match(page, /function ReportsWorkspace/);
  assert.match(workspace, /action === "review"/);
  assert.match(workspace, /\["submitted", "draft"\]\.includes\(score\.status\)/);
  assert.match(workspace, /requireUser\(request, \["staff"\]\)/);
  assert.match(workspace, /action === "finalize"/);
  assert.match(workspace, /Seluruh indikator harus memiliki bukti yang diterima admin/);
  assert.match(evidence, /status: "submitted"/);
  assert.match(evidence, /score\.status === "approved"/);
  assert.match(evidence, /export async function DELETE/);
  assert.match(evidence, /Hanya bukti yang menunggu verifikasi yang dapat dihapus/);
  assert.match(pdf, /searchParams\.get\("periodId"\)/);
  assert.match(excel, /searchParams\.get\("periodId"\)/);
});

test("notifikasi verifikasi persisten dan tampilan admin hanya-baca tersedia", async () => {
  const [page, workspace, notifications, schema] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/assessment-workspace/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/notifications/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /isStaff\s*&&\s*!\["approved", "locked"\]\.includes\(selectedStatus\)/);
  assert.match(page, /\["submitted", "draft"\]\.includes\(status\)/);
  assert.match(page, /notification-popover/);
  assert.match(page, /unreadNotificationCount/);
  assert.match(page, /sessionUser\.role === "admin"[\s\S]*?PENGELOLAAN/);
  assert.match(page, /setPeriodId\(""\)/);
  assert.match(page, /Pilih tahun penilaian/);
  assert.match(workspace, /\["submitted", "draft"\]\.includes\(score\.status\)/);
  assert.match(notifications, /notification_reads/);
  assert.match(notifications, /INSERT OR IGNORE/);
  assert.match(notifications, /s\.status IN \('submitted','draft'\)/);
  assert.match(notifications, /s\.status IN \('approved','rejected','locked'\)/);
  assert.match(schema, /notificationReads/);
});

test("repositori bukti dan laporan visual tersedia", async () => {
  const [page, repository, evidence, pdf, excel] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/evidence-repository/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/evidence/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reports/pdf/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/reports/excel/route.ts", import.meta.url), "utf8"),
  ]);
  assert.match(page, /function EvidenceRepository|const EvidenceRepository/);
  assert.match(page, /Salin link/);
  assert.match(page, /row\.rejectedAt/);
  assert.match(page, /!\["approved", "locked"\]\.includes\(selectedStatus\)/);
  assert.match(repository, /Dokumen masih digunakan pada indikator/);
  assert.match(repository, /requireUser\(request, \["admin"\]\)/);
  assert.match(evidence, /rejectedAt: evidence\.rejectedAt/);
  assert.match(pdf, /Nilai per Kategori/);
  assert.match(pdf, /Detail Nilai per Subkategori/);
  assert.match(pdf, /scoreColor/);
  assert.match(excel, /Nilai Subkategori/);
  assert.match(excel, /Matriks Indikator/);
});
