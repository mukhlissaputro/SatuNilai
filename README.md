# SatuNilai

Aplikasi manajemen penilaian SPBE, Indeks SDI, EPSS, ITKP, dan instrumen pemerintahan lainnya. Mendukung instrumen berversi, hak akses, penilaian mandiri, verifikasi, bukti privat, finalisasi, notifikasi, dan laporan.

## Menjalankan dengan Docker Desktop

Aktifkan Docker Desktop dengan Linux containers, kemudian jalankan dari direktori proyek:

```powershell
npm run docker:setup
docker compose up -d --build
```

Buka http://localhost:3000. Email admin awal berada pada `ADMIN_EMAIL` dan password pada `ADMIN_PASSWORD` dalam `.env`. Password dibuat acak; tidak ada akun demo atau password bawaan tetap. Berkas `.env` tidak masuk Git atau image Docker.

Instalasi baru berisi satu unit internal dan administrator. Buat jenis penilaian, tahun, kategori/subkategori/indikator, serta akun staf melalui menu pengelolaan. Data D1 lokal yang tersedia telah dimigrasikan pada instalasi ini. Untuk instalasi baru lain, pemindahan data lama dilakukan melalui prosedur migrasi di bawah.

```powershell
docker compose ps
docker compose logs --tail 100 app
docker compose stop
docker compose up -d
```

Database dan dokumen tersimpan dalam named volume `database` dan `evidence`. Menghentikan atau membuat ulang kontainer mempertahankan data. `docker compose down -v` menghapus seluruh volume beserta datanya: jangan gunakan untuk pembaruan biasa.

## Arsitektur lokal

- React 19, TypeScript, vinext/Vite, server Node.js 22.
- MariaDB 11.4 dengan Drizzle/mysql2; database tidak membuka port ke host.
- Dokumen pada `/data/evidence`, di luar direktori publik. Unduhan diperiksa melalui sesi dan hak akses.
- Aplikasi berjalan sebagai pengguna non-root.
- Compose menunggu database sehat sebelum menjalankan migrasi dan server.
- Endpoint `/api/health` memeriksa koneksi database dan akses direktori dokumen.
- Bootstrap melalui HTTP dinonaktifkan; admin awal hanya dibuat saat tabel pengguna kosong oleh proses server.

Migrasi MariaDB berada di `drizzle-mysql/`. `database.sql`, `drizzle/`, `examples/d1/`, `worker/`, dan `.openai/` merupakan arsip konfigurasi Cloudflare sebelumnya, bukan sumber instalasi Docker. Jangan menerapkan SQL SQLite tersebut ke MariaDB.


## Development dan production memakai MariaDB

Development dengan hot reload:

```powershell
npm run dev:docker
# Atau foreground dengan log: npm run dev
```

Compose development memakai `compose.dev.yaml`, source code yang terpasang ke kontainer, dan volume dependensi Linux tersendiri. Perubahan source muncul tanpa rebuild image. Jika package.json/package-lock.json berubah, perbarui volume dependensi dengan `docker compose -f compose.yaml -f compose.dev.yaml exec app npm ci`, lalu restart app.

Mode production:

```powershell
docker compose up -d --build --wait
```

Keduanya memakai MariaDB 11.4 serta volume database/bukti yang sama pada komputer ini. Image development dan production memiliki tag berbeda agar mode tidak tertukar. Server production tidak memasang source host. Pada VM gunakan konfigurasi .env privat dan volume VM sendiri; data development tidak disalin otomatis ke production.

Database hanya dipublikasikan saat mode development, di `127.0.0.1:3307`, untuk klien database lokal. Mode production tidak membuka port database. Konfigurasi DB_HOST/DB_PORT dalam .env untuk klien host menggunakan 127.0.0.1:3307; kontainer selalu memakai db:3306. Tidak ada fallback SQLite pada aplikasi.

## Masuk cepat pada development

Halaman login development menyediakan **Masuk cepat — Development** untuk Administrator, Staf, dan Kepala Unit. Klik akun untuk langsung masuk dengan sesi dan hak akses peran tersebut. Akun staf/kepala unit dibuat jika belum tersedia, dengan password acak yang tidak ditampilkan; kredensial admin dan akun yang sudah ada tidak ditimpa. Akun nonaktif tidak dapat dipilih.

Fitur ini memerlukan NODE_ENV=development dan DEV_QUICK_LOGIN=1, yang hanya diaktifkan pada compose.dev.yaml. Mode development mengikat aplikasi ke 127.0.0.1. Endpoint masuk cepat menolak permintaan pada production, termasuk jika DEV_QUICK_LOGIN disetel. Login email/password tetap tersedia.

Tes development: `node --test tests/development-login.test.mjs` ketika kontainer development berjalan.

## Migrasi data D1 lokal

```powershell
npm run db:import:legacy
```

Perintah ini membuat snapshot SQLite konsisten dan backup MariaDB/bukti, membangun image production, memperbarui skema, memeriksa seluruh foreign key, menguji rollback, menjalankan dry-run dan impor, lalu memverifikasi dan mengulang impor untuk memastikan tidak ada duplikasi. Aplikasi dihentikan selama transaksi impor dan dijalankan kembali dalam mode production. Jalankan kembali `npm run dev:docker` untuk mengembangkan kode.

Akun admin dengan email ADMIN_EMAIL boleh digabung: ID, email, password hash/salt, dan waktu perubahan password tujuan dipertahankan; profil dan relasi dari sumber dipindahkan. Benturan akun lain atau data lain membatalkan transaksi. Data MariaDB yang sudah ada tidak dihapus. Berkas sumber SQLite tetap utuh sebagai arsip, tidak lagi digunakan aplikasi.

Laporan privat tersimpan bersama source.sqlite/source.json di backups/legacy-<waktu>/. Lokasi laporan terakhir dicatat pada outputs/legacy-migration-latest.json. Source.json memuat hash kredensial dan sesi, sehingga tidak boleh dimasukkan ke Git atau dibagikan sebagai laporan publik.

Migrasi ini memindahkan seluruh 19 tabel aplikasi yang tersedia pada D1 lokal: 48 baris sumber terverifikasi, termasuk satu admin yang digabung. Database lama tidak memiliki dokumen bukti, sehingga tidak ada berkas R2 untuk dipindahkan. Importer menolak sumber yang memiliki berkas bukti sampai pemindahan berkas yang terverifikasi disediakan. Snapshot menyimpan metadata internal Cloudflare sebagai arsip; tabel internal tersebut bukan bagian skema MariaDB aplikasi.

Rincian pemeriksaan ada di [catatan migrasi](docs/mariadb-data-migration.md).

## Konfigurasi

Salin `.env.example` atau jalankan `npm run docker:setup`. Script setup tidak menimpa `.env` yang sudah ada.

| Variabel | Keterangan |
|---|---|
| `APP_BIND` | Default `127.0.0.1`, hanya komputer ini |
| `APP_PORT` | Default `3000` |
| `DB_NAME`, `DB_USER` | Database dan pengguna aplikasi |
| `DB_PASSWORD`, `DB_ROOT_PASSWORD` | Password berbeda yang dibuat acak |
| `ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD` | Akun awal, dipakai hanya saat tabel pengguna kosong |
| `RESEND_API_KEY`, `MAIL_FROM` | Opsional untuk email reset password |

Mengubah `ADMIN_PASSWORD` dalam `.env` setelah inisialisasi tidak mengubah password pengguna yang sudah ada. Gunakan Pengguna & Akses atau reset password. Mengubah password database dalam `.env` juga tidak otomatis mengubah pengguna MariaDB pada volume yang sudah ada.

Tanpa konfigurasi email, aplikasi tetap berjalan dan endpoint lupa password memberi respons generik, tetapi email tidak dikirim. Tidak diperlukan API key untuk fungsi penilaian.

## Pengujian

Node.js >=22.13 diperlukan untuk perintah npm pada host; aplikasi dapat dibangun seluruhnya melalui Docker tanpa instalasi paket host.

```powershell
npm ci
npm run lint
npm run typecheck
npm test
npm run test:docker
```

Tes Docker memakai `.env`, membuat data uji bertanda `Docker integration`, lalu menjalankan login admin/staf, CRUD instrumen, unggah/unduh privat, notifikasi, finalisasi, laporan, dan logout. Jalankan pada database pengembangan. Tes ini membuat data uji dan bukan pemeriksaan hanya-baca pada produksi.

## Backup dan pemulihan

```powershell
npm run docker:backup
```

Aplikasi dihentikan sebentar agar dump database dan salinan dokumen konsisten, lalu dijalankan kembali. Backup tersimpan di `backups/<waktu>/`, berisi `database.sql`, `evidence/`, dan `.env`. Folder ini memuat data privat serta kredensial: simpan dengan akses terbatas dan salin keluar dari VM.

Untuk memulihkan ke instalasi Docker yang baru dan kosong:

1. Salin proyek beserta `.env` dari backup. Jangan membuat kredensial baru jika ingin memakai konfigurasi backup.
2. Jalankan `docker compose up -d db` dan tunggu database sehat.
3. Impor dump dengan klien MariaDB menggunakan pengguna/database dari `.env`. Contoh Linux:

```sh
docker compose exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" exec mariadb -u"$MARIADB_USER" "$MARIADB_DATABASE"' < backups/CONTOH/database.sql
```

4. Buat kontainer aplikasi tanpa menjalankannya: `docker compose create app`.
5. Salin isi folder bukti: `docker compose cp backups/CONTOH/evidence/. app:/data/evidence/`.
6. Jika salinan dilakukan sebagai root, perbaiki izin: `docker compose run --rm --no-deps --user root --entrypoint sh app -c 'chown -R node:node /data/evidence'`.
7. Jalankan `docker compose up -d app`, lalu periksa health, login, dan unduhan bukti.

Pemulihan mengganti data: lakukan ke volume kosong atau setelah mencadangkan instalasi tujuan. Contoh impor di atas menggunakan shell Linux; jangan memakai pengalihan teks PowerShell lama untuk dump biner/UTF-8 tanpa memeriksa encoding.

## Memindahkan ke VM

Pasang Docker Engine dan Compose pada VM Linux, salin proyek serta `.env` secara privat, kemudian jalankan perintah Compose yang sama. Pindahkan data menggunakan backup dan pemulihan, bukan hanya menyalin source code.

Untuk akses LAN, sesuaikan `APP_BIND` dengan alamat antarmuka VM atau `0.0.0.0`, lalu atur firewall. Untuk domain/HTTPS, gunakan reverse proxy di depan aplikasi. Database tetap berada di jaringan internal Docker. Konfigurasi saat ini hanya membuka aplikasi ke localhost.

## Dokumentasi

- [Buku panduan](docs/BUKU-PANDUAN.md)
- [Rencana migrasi lokal](docs/docker-local-plan.md)
- [Skema aplikasi](db/schema.ts)

### HTTPS pada VM

Isi `VINEXT_TRUSTED_HOSTS=penilaian.domain-anda.go.id` (tanpa skema, sertakan port jika bukan port standar). Pada reverse proxy, tetapkan Host dan X-Forwarded-Host ke domain tersebut, serta X-Forwarded-Proto ke skema permintaan asli. Contoh Nginx di dalam blok lokasi:

```nginx
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_pass http://127.0.0.1:3000;
```

Jalankan ulang `docker compose up -d app` setelah mengubah konfigurasi. Akses port aplikasi harus dibatasi ke reverse proxy saat mempercayai header tersebut. Pengaturan ini diperlukan agar pemeriksaan asal permintaan, cookie Secure, dan tautan reset password memakai URL HTTPS yang benar. Untuk lokal HTTP, biarkan VINEXT_TRUSTED_HOSTS kosong.

Jika HTTPS memakai port nonstandar, `$host` pada Nginx tidak menyertakan port. Tetapkan Host dan X-Forwarded-Host secara eksplisit ke `domain:port` yang sama dengan VINEXT_TRUSTED_HOSTS, atau gunakan `$http_host` setelah memvalidasi host pada konfigurasi server.
