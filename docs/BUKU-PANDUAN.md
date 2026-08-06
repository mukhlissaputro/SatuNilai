# Buku Panduan SatuNilai

## Tentang aplikasi

SatuNilai adalah aplikasi pengelolaan penilaian pemerintahan untuk SPBE, Indeks Satu Data Indonesia, EPSS, ITKP, dan instrumen lain. Sistem mendukung banyak unit kerja, instrumen berversi, penilaian internal, nilai asesor, bukti privat, persetujuan admin, serta pelaporan.

## Peran pengguna

- **Administrator** mengelola periode, jenis penilaian, instrumen, pengguna, penugasan, target, review, finalisasi, dan laporan.
- **Staf** mengisi indikator yang ditugaskan kepada unitnya, mengunggah bukti, dan mengirim penilaian.
- **Kepala unit** memantau seluruh progres dan hasil tanpa hak mengubah atau menyetujui.

## Memulai

1. Masuk melalui halaman privat aplikasi.
2. Pengguna pertama menjadi administrator awal.
3. Buka **Pengguna & Akses** untuk menambahkan unit dan pengguna.
4. Buka **Jenis Penilaian** untuk memilih atau membuat instrumen.
5. Buka **Tahun Penilaian** untuk menentukan jadwal dan tenggat.
6. Tugaskan indikator kepada unit kerja sebelum staf mulai mengisi.

## Mengelola instrumen

Pada **Struktur Indikator**, administrator dapat mengatur kategori, subkategori, indikator, bobot opsional, dan pilihan skala nilai. Instrumen yang sudah digunakan tidak diedit langsung. Buat versi baru agar data periode sebelumnya tetap utuh.

## Mengisi penilaian

1. Buka **Penilaian** dan pilih indikator.
2. Pilih nilai internal sesuai skala indikator.
3. Tambahkan catatan dan satu atau beberapa bukti.
4. Simpan draf atau kirim kepada administrator.
5. Administrator menyetujui atau menolak dengan catatan.

Penilaian yang ditolak dikembalikan kepada staf. Setelah finalisasi, data dikunci.

## Bukti dukung

Bukti dapat berupa PDF, DOCX, XLSX, JPG, PNG, atau tautan HTTPS. Maksimum berkas 10 MB. Sistem menyimpan dokumen secara privat, mencatat hash, versi, pengunggah, waktu, dan indikator terkait. Satu bukti dapat digunakan pada beberapa indikator.

## Laporan

Halaman **Laporan** menyiapkan rekap nilai akhir, analisis kesenjangan target, perbandingan nilai asesor, matriks indikator–bukti, dan catatan pemeriksa dalam PDF dan Excel.

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
