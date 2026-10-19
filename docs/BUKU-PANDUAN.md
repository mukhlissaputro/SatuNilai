# Buku Panduan SatuNilai

## Tentang aplikasi

SatuNilai adalah aplikasi pengelolaan penilaian pemerintahan untuk SPBE, Indeks Satu Data Indonesia, EPSS, ITKP, dan instrumen lain. Sistem mendukung banyak unit kerja, instrumen berversi, penilaian internal, nilai asesor, bukti privat, persetujuan admin, serta pelaporan.

## Peran pengguna

- **Administrator** mengelola periode, jenis penilaian, instrumen, pengguna, penugasan, target, review, finalisasi, dan laporan.
- **Staf** mengisi indikator yang ditugaskan kepada unitnya, mengunggah bukti, dan mengirim penilaian.
- **Kepala unit** memantau seluruh progres dan hasil tanpa hak mengubah atau menyetujui.

## Memulai

1. Masuk menggunakan email dan password yang diberikan administrator.
2. Pada Docker, gunakan ADMIN_EMAIL dan ADMIN_PASSWORD pada berkas .env server; akun demo lama tidak dibuat.
3. Buka **Pengguna & Akses** untuk menambahkan pengguna, peran, password awal, dan akses jenis penilaian.
4. Buka **Jenis Penilaian** untuk memilih atau membuat instrumen.
5. Buka **Tahun Penilaian** untuk menentukan jadwal dan tenggat.
6. Tugaskan indikator kepada unit kerja sebelum staf mulai mengisi.

## Mengelola instrumen

Pada **Kategori Indikator**, administrator memilih jenis dan tahun penilaian, kemudian mengatur kategori, subkategori, indikator, bobot opsional, dan pilihan skala nilai. Instrumen yang sudah digunakan tidak diedit langsung. Buat versi baru agar data periode sebelumnya tetap utuh.

## Login dan lupa password

- Login memverifikasi email, password, status aktif, serta peran pengguna di server.
- Pilih **Lupa password?**, masukkan email, lalu buka tautan yang dikirim. Tautan berlaku 30 menit dan hanya dapat digunakan sekali.
- Demi keamanan, aplikasi selalu menampilkan respons yang sama baik email terdaftar maupun tidak.
- Administrator dapat menetapkan password baru melalui menu **Pengguna & Akses**. Tindakan ini otomatis mengakhiri sesi lama pengguna.

## Mengisi penilaian

1. Buka **Penilaian**, lalu pilih jenis dan tahun penilaian yang dapat diakses.
2. Pilih subkategori dan isi nilai mandiri sesuai batas maksimum periode.
3. Tambahkan catatan dan satu atau beberapa bukti pada indikator terkait.
4. Bukti yang baru diunggah berstatus **Menunggu verifikasi admin**.
5. Administrator memeriksa bukti pada tabel indikator, lalu memilih **Terima** atau **Tolak**. Penolakan wajib disertai alasan perbaikan.
6. Kepala unit dapat memantau status: belum ada bukti, menunggu verifikasi, telah terverifikasi, atau belum sesuai, tanpa mengubah data.

Jika seluruh indikator telah mempunyai bukti yang diterima, administrator dapat membuka **Finalisasi & Nilai Asesor**, mengisi nilai final asesor untuk setiap subkategori, lalu memfinalisasi periode. Setelah finalisasi, nilai target, nilai mandiri, nilai asesor, dan bukti dikunci agar tidak dapat diubah.

## Bukti dukung

Bukti dapat berupa PDF, DOCX, XLSX, JPG, PNG, atau tautan HTTPS. Maksimum berkas 10 MB. Sistem menyimpan dokumen secara privat, mencatat hash, versi, pengunggah, waktu, dan indikator terkait. Satu bukti dapat digunakan pada beberapa indikator.

## Laporan

Halaman **Laporan** dimulai tanpa pilihan aktif. Pilih jenis dan tahun penilaian sesuai hak akses untuk menampilkan ringkasan adaptif, lalu unduh rekap target, nilai mandiri, nilai asesor, status verifikasi, matriks indikator–bukti, dan catatan pemeriksa dalam PDF atau Excel.

## Keamanan operasional

- Gunakan SSO dan MFA organisasi pada produksi.
- Terapkan pemindaian malware sebelum dokumen dinyatakan aktif.
- Terapkan prinsip least privilege dan tinjau audit log berkala.
- Siapkan backup terenkripsi dan uji pemulihan.
- Jalankan SAST, DAST, dependency scanning, dan penetration test sebelum go-live.
- Jangan menyimpan rahasia atau kredensial di repository.

## Instalasi pengembangan

Persyaratan: Node.js 22 atau lebih baru.

```bash
npm install
npm run dev
```

Build produksi:

```bash
npm run build
```

Skema basis data tersedia di `database.sql`, sedangkan migrasi sumber berada pada folder `drizzle/`.
