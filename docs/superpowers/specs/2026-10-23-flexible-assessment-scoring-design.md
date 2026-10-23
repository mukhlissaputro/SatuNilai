# Penilaian fleksibel dan poin ITKP

## Tujuan
ITKP mengikuti matriks Excel pengguna: maksimum indikator 5; 2,5; 2,5; 10; 2,5; 2,5; 5; 15; 9; 6; 30; 10. Jumlah maksimum 100. Kontribusi tidak dikalikan bobot dua kali.

## Pendekatan yang direkomendasikan
Tambahkan mode penilaian per periode: `weighted_average` (default untuk data lama) dan `direct_points` (ITKP yang dipetakan). Tambahkan maksimum indikator yang dapat diatur admin. Pada mode poin, subtotal subkategori/kategori dan total adalah penjumlahan nilai indikator, bukan rata-rata. Nilai kosong tetap ditandai belum diisi, dan tidak meningkatkan nilai indikator lain melalui normalisasi ulang.

Alternatif: menormalkan semua nilai ke skala 100 kemudian membobotkannya. Tidak direkomendasikan untuk ITKP ini karena pengguna memasukkan poin langsung. Mengganti semua penilaian menjadi poin juga tidak direkomendasikan karena dapat mengubah penilaian lain.

## Perilaku dan cakupan
- Pertahankan tampilan dan alur kerja saat ini; tambah pengaturan mode dan maksimum indikator pada pengelolaan.
- Batas nilai divalidasi di server dan UI. Maksimum Renaksi 6, kematangan 30.
- Satukan perhitungan workspace, dashboard internal/publik, riwayat, PDF, dan Excel.
- Mode poin menggunakan subtotal final indikator; finalisasi tidak boleh memungkinkan total bebas yang melewati maksimum atau menyimpang dari indikator yang diverifikasi.
- Periode final dan nilai asesor lama tidak diubah diam-diam.
- Mode lama mempertahankan kompatibilitas. Maksimum indikator kosong menggunakan maksimum periode pada mode lama.
- Pada ITKP, label bobot menjelaskan kontribusi maksimal dalam poin: kategori 30/30/30/10; subkategori subtotal anak; indikator sesuai matriks. Bobot tersebut tidak dikalikan ulang pada mode poin.

## Pembaruan database
1. Jalankan database lokal dan inventarisasi jenis, versi instrumen, periode, struktur indikator, nilai, target, dan status finalisasi.
2. Buat dump privat dan verifikasi dump sebelum migrasi/perubahan data; simpan ringkasan struktur sebelum/sesudah tanpa kredensial.
3. Tambahkan kolom melalui migrasi baru, tanpa mengubah migrasi historis.
4. Petakan indikator ITKP ke matriks secara eksplisit; hentikan jika ada nama ambigu, komponen hilang, atau instrumen dipakai penilaian lain.
5. Perbarui maksimum dan bobot hanya pada struktur ITKP yang cocok. Total maksimum kategori 30/30/30/10 dan indikator 100.
6. Jangan mengubah nilai capaian/target/final lama menjadi skala baru secara otomatis. Laporkan konflik atau minta keputusan konversi jika ditemukan.
7. Perubahan data harus dalam transaksi, idempotent, dan memverifikasi jumlah baris serta total sebelum commit.

## Verifikasi
- Uji batas Renaksi: 6 diterima, 6,01 ditolak; kematangan: 30 diterima, 30,01 ditolak; nilai negatif/NaN ditolak.
- Semua indikator maksimum menghasilkan total 100; Renaksi 4 dan kematangan 21 menyumbang 25, tanpa bobot ulang.
- Indikator kosong tidak menormalkan ulang capaian menjadi penuh.
- Tambahan evidence tidak menggandakan nilai dalam agregasi.
- Mode lama tetap menghasilkan nilai yang sama; angka internal/publik/laporan konsisten untuk sumber nilai yang sama.
- Jalankan typecheck, lint, build, tes perhitungan serta integrasi pada database terpisah. Laporkan kegagalan tes lama `database.sql` secara terpisah.

## Keputusan yang masih membutuhkan persetujuan
Persetujuan pendekatan dua mode. Jika inventaris menemukan nilai lama ITKP, keputusan konversi hanya diminta jika skala asalnya tidak dapat ditentukan dari bukti.

## Hasil inventaris lokal
- ITKP 2025: 12 indikator dan 6 nilai terisi, maksimum periode lama 5. Dua indikator maksimum baru 2,5 sudah memiliki nilai lama 4; mengubah maksimum tanpa konversi menyebabkan data tidak valid.
- Nilai lama berurutan: Pengumuman RUP 4; Nilai RUP Penyedia 4; Nilai RUP e-tendering/e-purchasing 4; Realisasi E-Tendering/E-Purchasing 4; Penugasan 3; Renaksi 5. Nilai asesor kosong, seluruh periode masih draft.
- ITKP 2026: periode ada, tanpa nilai dan tanpa struktur indikator yang terhubung. Perlu menyalin struktur ITKP 2025 ke versi instrumen 2026, menggunakan ID baru dan tanpa menyalin nilai/evidence.
- Usulan konversi, hanya jika pengguna mengonfirmasi skala lama 0–5 bersifat proporsional: nilai lama / 5 * maksimum indikator. Hasil 4; 2; 2; 8; 5,4; 6. Jika tidak proporsional, simpan arsip privat dan minta pengisian ulang; jangan menebak capaian.
- Bobot subkategori Keterisian Formasi saat ini 14, sedangkan matriks menetapkan 15; perlu koreksi menjadi 15.

## Persetujuan dan keputusan pelaksanaan
Pengguna menyetujui perubahan dan mengizinkan penghapusan data lama jika diperlukan untuk ITKP 2026. Tidak perlu menghapus atau mengonversi 2025: versi 2026 berdiri sendiri dan masih kosong. Instrumen baru ditanam secara eksplisit sesuai matriks; 2025 dipertahankan. Kontribusi maksimum mode poin diturunkan otomatis dari maksimum indikator; nilai final berasal dari indikator yang telah disetujui admin. Target awal 2026 diatur sebesar maksimum poin (target kerja dapat diedit).
