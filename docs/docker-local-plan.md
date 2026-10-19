# Docker lokal dan VM

Tujuan: menjalankan SatuNilai di Docker Desktop Linux, lalu memakai konfigurasi yang sama di VM. Pengguna meminta pelaksanaan sampai aplikasi berjalan.

Desain: aplikasi vinext pada Node.js, MariaDB melalui mysql2/Drizzle, dan direktori dokumen privat pada named volume. Port default hanya localhost:3000; database tidak dipublikasikan. Init terpisah menyiapkan skema dan admin dari lingkungan; bootstrap HTTP tidak membuat akun. Data D1/R2 lama tidak dimigrasikan otomatis atau dihapus.

Rencana pelaksanaan:
1. Tambahkan tes integrasi HTTP untuk autentikasi, CRUD penilaian, bukti, laporan, finalisasi, dan kedaluwarsa sesi.
2. Migrasikan skema Drizzle ke MySQL, sediakan akses SQL berparameter dan transaksi batch, ganti env Cloudflare dengan runtime Node dan penyimpanan privat.
3. Tambahkan migrasi SQL MariaDB, init idempoten, Dockerfile, Compose, contoh konfigurasi, dan panduan backup/pemulihan.
4. Bangun dan jalankan kontainer; jalankan tes terhadap database nyata; perbaiki kegagalan dan periksa persistensi setelah recreate.

Verifikasi: lint, TypeScript, build/render test, integrasi HTTP di Docker, status health kedua layanan. Kredensial lokal dibuat acak ke berkas .env yang diabaikan Git. Tidak ada push/deploy VM dalam cakupan.

Hasil pelaksanaan:
- Migrasi SQL awal disesuaikan dengan batas 64 karakter pada identifier MariaDB. Generator menormalisasi nama panjang secara deterministik.
- Migrasi awal dapat dilanjutkan setelah DDL terputus; checksum migrasi dan langkah dicatat, proses init memakai database lock.
- Lint, pemeriksaan TypeScript, build dan 12 tes render/struktur berhasil.
- Tes HTTP pada kontainer nyata berhasil untuk login, CRUD instrumen, nilai staf, unggah/unduh bukti privat, repositori, notifikasi, review, finalisasi, laporan dan logout.
- Setelah force-recreate aplikasi dan database, login, status final dan isi dokumen tetap tersedia.
- Backup database/dokumen/config berhasil dibuat. Pemulihan backup belum diuji otomatis.
- Sesi dan token reset yang kedaluwarsa ditolak. Bootstrap HTTP ditolak meskipun header identitas dipalsukan.
- Pengujian kontainer sementara dengan trusted HTTPS host berhasil: login, cookie Secure, logout, serta penolakan origin lain.
- Review independen menandai pengaturan reverse proxy; konfigurasi dan panduannya sudah diperbaiki, tanpa temuan penting tersisa.
- Data penilaian dari tes integrasi diberi nama Docker integration dan tetap berada di database pengembangan agar hasil dapat diperiksa.
