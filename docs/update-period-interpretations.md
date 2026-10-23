# Memperbarui fitur interpretasi di production

Perubahan aplikasi ini mencakup nilai final asesor yang dapat diisi sebelum finalisasi, interpretasi per periode/tahun, perbandingan nilai mandiri dan nilai akhir, menu Interpretasi Nilai terpisah, serta formulir dan notifikasi aplikasi.

## Database

Migrasi 0004 menambahkan kolom `assessment_periods.interpretation_rules`. Migrasi 0004/0005 mengisi tabel interpretasi ITKP 2026 pada periode berskala100 yang kolomnya masih NULL, termasuk periode yang sudah final. Aturan yang sudah terisi tidak ditimpa. Migrasi tidak mengganti angka penilaian, bukti dukung, atau akun.

Dockerfile production menjalankan `node scripts/init-db.mjs` sebelum server. Setelah image terbaru dibangun dan container aplikasi dibuat ulang, migrasi diterapkan otomatis pada database production yang terhubung. `git pull` saja tidak membangun ulang image atau menjalankan migrasi.

Tidak perlu mengekspor database lokal lalu menimpanya ke production untuk fitur ini. Aturan tambahan yang diinput manual di lokal tidak ikut melalui Git; masukkan melalui menu Interpretasi Nilai di production atau gunakan transfer aturan terpilih yang direncanakan terpisah. Fungsi Salin Interpretasi menyalin antarperiode dalam database yang sama, bukan antarserver.

## Instalasi Compose standar

Jalankan dari folder repository production yang memiliki `compose.yaml`, pada branch main. Buat dan periksa backup production sebelum memperbarui:

```sh
npm run docker:backup
git pull --ff-only origin main
docker compose up -d --build --wait app
docker compose logs --tail=100 app
```

Perintah backup standar memakai proyek Compose dan `.env` standar. Jika instalasi memakai `-p`, `--env-file`, atau berkas Compose lain, pertahankan parameter instalasi tersebut untuk backup dan pembaruan; jangan menjalankan perintah standar pada proyek berbeda. Jangan menyalin `.env` lokal ke production, mengimpor dump lokal ke database production, atau menghapus volume.

Periksa hasil login, menu Interpretasi Nilai ITKP2026, predikat nilai yang sudah final, dashboard publik bila aktif, serta log migrasi. Pesan migrasi berhasil dan status sehat adalah pemeriksaan awal; pastikan angka dan bukti aktual production tetap sesuai.
