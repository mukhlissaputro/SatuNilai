# Menggabungkan perubahan Mac dengan Docker dan MariaDB

Branch `codex/integrasi-mac-mariadb` menggabungkan `origin/main` pada commit `aadc729` dengan `codex/mariadb-docker` pada `407e6a6`. Fitur dashboard publik, visibilitas jenis penilaian, duplikasi kategori, pencarian/nama bukti, dan favorit dipertahankan. Pilihan akun lokal development tetap tersedia dari halaman Login.

Konflik halaman diselesaikan dengan mempertahankan dashboard publik dan tampilan reset password, tanpa menjalankan bootstrap database melalui HTTP. Skema memakai MySQL/MariaDB, termasuk `is_public` dan tabel `evidence_favorites`. Migrasi 0002 menambahkan fitur tersebut tanpa menulis ulang migrasi yang sudah diterapkan. API baru menggunakan runtime Node dan sintaks MariaDB. Duplikasi struktur memakai ID deterministik dengan panjang terbatas agar relasi hasil salinan tetap valid.

## Mengambil hasil penggabungan di Mac

Untuk kondisi merge gagal yang dimulai dari working tree bersih pada branch `integrasi-mariadb-docker`:

```sh
git merge --abort
git fetch origin
git merge --ff-only origin/codex/integrasi-mac-mariadb
git status
```

Perintah pertama membatalkan percobaan merge yang berkonflik. Perintah ketiga mengambil hasil penggabungan yang sudah diselesaikan. Jika fast-forward ditolak, periksa posisi branch dan perubahan lokal sebelum melanjutkan. Database lokal, `.env`, `.wrangler`, dan berkas bukti tidak dibagikan melalui Git.

## Sumber data migrasi

Data terbaru dari Mac tetap menjadi sumber migrasi. Jangan menyalin database MariaDB dari Windows sebagai penggantinya. Hasil migrasi Windows 19 tabel/48 baris yang tercatat di dokumen lama hanya berlaku untuk pengujian terdahulu di Windows.

Sebelum memulai aplikasi Docker di Mac, cadangkan database lokal beserta berkas buktinya dan identifikasi database SQLite aplikasi yang benar. Ekspor konsisten dapat dibuat dengan Node 22.13 atau lebih baru:

```sh
npm ci
node scripts/export-legacy.mjs /path/absolut/database-aplikasi.sqlite
```

Exporter menyertakan `is_public` dan tabel favorit bila tersedia, serta masih menerima database lama sebelum fitur tersebut. Importer mempertahankan data target yang sudah ada dan berhenti pada konflik; ini bukan proses penggantian database target. Kebijakan penggabungan admin tetap mempertahankan kredensial Docker jika email admin bertabrakan, sesuai pilihan sebelumnya.

Importer saat ini menolak bukti berkas dengan `object_key` karena transfer berkas dari penyimpanan lama harus diverifikasi terlebih dahulu. Nilai yang melebihi kapasitas kolom dan konflik akun lain juga menghentikan impor. Karena itu, pemilihan sumber, pemeriksaan data dan berkas Mac, serta penyiapan target perlu diselesaikan sebelum menjalankan `npm run db:import:legacy`. Mengambil branch ini belum berarti data Mac sudah dipindahkan.

## Verifikasi integrasi

Build production, 15 tes aplikasi, pemeriksaan TypeScript/lint, dan empat tes unit lolos. Pengujian Docker pada proyek dan volume terpisah memverifikasi instalasi 20 tabel/31 foreign key, autentikasi, duplikasi struktur, finalisasi, dashboard publik, favorit, unduhan privat, laporan, dan penonaktifan login cepat pada production. Uji impor MariaDB memverifikasi transaksi dry-run, data publik/favorit, pemeriksaan ulang, dan impor berulang tanpa duplikasi. Seluruh pengujian memakai data sintetis, bukan database Mac.
