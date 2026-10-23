# Lemari Digital — LEDI PBJ Komnas HAM

Aplikasi pengelolaan data dukung Pengadaan Barang/Jasa, pemantauan ITKP, dan pemenuhan bukti maturitas UKPBJ. Mendukung instrumen berversi, hak akses, penilaian mandiri, verifikasi, bukti privat, finalisasi, notifikasi, dan laporan.

Semua perubahan aktif tersedia pada branch `main`. Gunakan branch ini di Windows, Mac, dan VM; branch integrasi terdahulu sudah digabung.

## Mode nilai dan ITKP 2026

Tahun Penilaian menyediakan **Rata-rata berbobot** (mode bawaan untuk instrumen lama) dan **Poin langsung**. Pilih mode sebelum membuat struktur instrumen. Pada mode poin, setiap indikator wajib memiliki nilai maksimal; batas ini diperiksa oleh UI dan server. Nilai subkategori, kategori dan keseluruhan dijumlahkan, tanpa mengalikan bobot lagi. Kontribusi kategori/subkategori diperbarui dari jumlah maksimum indikatornya. Nilai yang belum diisi tidak menaikkan kontribusi indikator lain.

ITKP 2026 mengikuti matriks yang diberikan: kategori maksimum 30/30/30/10; indikator maksimum 5; 2,5; 2,5; 10; 2,5; 2,5; 5; 15; 9; 6; 30; 10 (total 100). Ini adalah batas poin, bukan rumus konversi data sumber; nilai capaian tetap diisi berdasarkan matriks penilaian yang berlaku. Renaksi maksimal 6, kematangan UKPBJ maksimal 30. Target awal subkategori disetel sebesar maksimum poin, dan dapat disesuaikan admin sebagai target kerja.

Admin memeriksa nilai dan bukti per indikator sebelum menyetujui. Finalisasi mode poin mengambil nilai indikator yang telah disetujui; subtotal final tidak diisi bebas. Seluruh indikator harus disetujui dan jumlah maksimum indikator harus sama dengan maksimum periode. Jika beberapa unit mengisi indikator yang sama, nilai antarunit dirata-rata per indikator dahulu, kemudian poin indikator dijumlahkan. Dashboard dan kartu subkategori pada mode poin menampilkan capaian terverifikasi: hanya nilai berstatus diterima/dikunci dengan bukti aktif yang menyumbang poin. Nilai ditolak atau menunggu verifikasi menyumbang nol, tetapi nilai mandiri asli tetap tersimpan dan ditampilkan terpisah. Pengunggahan ulang bukti belum dianggap diterima sampai diverifikasi admin. Progres indikator memakai jumlah indikator diterima, sementara panjang bar capaian memakai poin terverifikasi dibanding target. Dashboard publik menampilkan nilai final periode yang dipublikasikan; laporan membedakan nilai mandiri, terverifikasi, dan final.

Migrasi baru diterapkan saat proses inisialisasi server. Setelah **backup database diverifikasi**, periode ITKP 2026 yang sudah dibuat dan masih kosong dapat disiapkan dengan `docker compose exec -T app node scripts/setup-itkp-2026.mjs --apply`. Script menolak struktur berbeda atau periode final; pengulangan yang sesuai tidak menghapus nilai. Data ITKP 2025 dan penilaian lain dipertahankan. Jangan menjalankan script untuk mereset periode berisi data.

Verifikasi perhitungan: `npm run test:scoring`. Uji API dan kompatibilitas mode lama: `npm run test:scoring:integration` (memerlukan Docker MariaDB lokal, `.env`, akses root database dan port 3002 kosong). Pengujian integrasi membuat database sementara bernama `satunilai_scoring_test_*` dan menghapus database sementara itu setelah selesai; database aplikasi tidak dipakai sebagai data uji.

## Menjalankan dengan Docker Desktop

Aktifkan Docker Desktop dengan Linux containers, kemudian jalankan dari direktori proyek:

```powershell
npm run docker:setup
docker compose up -d --build
```

Buka http://localhost:3000. Email admin awal berada pada `ADMIN_EMAIL` dan password pada `ADMIN_PASSWORD` dalam `.env`. Password dibuat acak; tidak ada akun demo atau password bawaan tetap. Berkas `.env` tidak masuk Git atau image Docker.

Instalasi baru berisi satu unit internal dan administrator. Buat jenis penilaian, tahun, kategori/subkategori/indikator, serta akun staf melalui menu pengelolaan. Data dari komputer lain tidak ikut berpindah melalui Git. Untuk data terbaru di Mac, ikuti [migrasi Mac ke MariaDB](#migrasi-data-terbaru-dari-mac-ke-mariadb).

```powershell
docker compose ps
docker compose logs --tail 100 app
docker compose stop
docker compose up -d
```

Database dan dokumen tersimpan dalam named volume `database` dan `evidence`. Menghentikan atau membuat ulang kontainer mempertahankan data. `docker compose down -v` menghapus seluruh volume beserta datanya: jangan gunakan untuk pembaruan biasa.

## Instalasi bersih: hanya akun superadmin awal

Gunakan prosedur ini bila ingin memulai dari nol, **tanpa database, pengguna, penilaian, atau evidence lama**. Instalasi baru tetap memerlukan MariaDB; yang baru adalah isi database dan volume dokumennya. Data lama tidak dihapus dan tidak diimpor.

Dalam aplikasi saat ini, hak akses tertinggi bernama **`admin`**, bukan role terpisah `superadmin`. Pada instalasi bersih hanya satu akun tersebut yang dibuat, bersama satu unit internal. Jenis penilaian, periode, indikator, nilai, dan bukti masih kosong. Beranda publik tetap menjadi halaman pertama; klik **Login** untuk masuk sebagai administrator.

### 1. Pilih proyek Docker yang belum pernah digunakan

Contoh ini menggunakan proyek terpisah `ledi-pbj-bersih`, berkas konfigurasi `.env.bersih`, dan port **3001** agar dapat berjalan bersamaan dengan instalasi lama pada port 3000.

```sh
docker compose -p ledi-pbj-bersih --env-file .env ps -a
```

Jalankan pemeriksaan ini setelah `.env` biasa tersedia (`npm run docker:setup` bila belum ada). Jika proyek `ledi-pbj-bersih` pernah dipakai, volume lamanya mungkin masih ada meskipun daftar kontainer kosong. Periksa juga:

```sh
docker volume ls --filter label=com.docker.compose.project=ledi-pbj-bersih
```

Jika ada kontainer atau volume proyek tersebut, pilih nama baru, misalnya `ledi-pbj-bersih-2`, dan gunakan nama itu pada **semua** perintah `-p` berikut. Nama proyek baru menghasilkan volume database dan evidence tersendiri. Jangan menggunakan proyek `satunilai` untuk prosedur ini karena itu adalah nama instalasi lama.

### 2. Buat konfigurasi khusus instalasi bersih

Salin `.env.example` menjadi `.env.bersih` menggunakan editor atau pengelola berkas. Jika `.env.bersih` sudah ada dan dipakai instalasi lain, gunakan nama berkas baru; jangan menimpa kredensial yang masih diperlukan. Isi nilai berikut di berkas baru:

```dotenv
APP_BIND=127.0.0.1
APP_PORT=3001
DB_NAME=ledi_pbj
DB_USER=ledi_pbj
DB_PASSWORD=ISI_PASSWORD_DATABASE_BARU
DB_ROOT_PASSWORD=ISI_PASSWORD_ROOT_BARU_YANG_BERBEDA
ADMIN_EMAIL=superadmin@localhost
ADMIN_NAME=Superadministrator Lemari Digital
ADMIN_PASSWORD=ISI_PASSWORD_SUPERADMIN_BARU
```

Ganti ketiga contoh password dengan nilai rahasia yang berbeda. Password administrator harus 10–128 karakter. Untuk membuat nilai acak, jalankan `node -e "console.log(require('node:crypto').randomBytes(24).toString('hex'))"` secara terpisah untuk masing-masing password, lalu salin hasilnya ke berkas. Jangan commit atau membagikan `.env.bersih`; pola `.env*` sudah diabaikan Git.

Variabel lain dari `.env.example` dapat dibiarkan pada nilai awal. `DB_HOST`/`DB_PORT` di berkas hanya untuk klien host; Compose menghubungkan aplikasi ke `db:3306`. Mode production ini tidak membuka port MariaDB ke host.

### 3. Jalankan mode production

Aktifkan Docker Desktop, kemudian jalankan dari direktori proyek:

```sh
docker compose -p ledi-pbj-bersih --env-file .env.bersih up -d --build --wait
docker compose -p ledi-pbj-bersih --env-file .env.bersih ps
docker compose -p ledi-pbj-bersih --env-file .env.bersih exec -T app node scripts/verify-schema.mjs
```

Compose membuat database dan penyimpanan bukti baru, menjalankan migrasi skema MariaDB, lalu membuat satu administrator awal. Verifikasi skema harus melaporkan 20 tabel, 31 foreign key, dan nol orphan.

Untuk mempertahankan hanya akun awal, **jangan menjalankan** `npm run dev`, `npm run dev:docker`, atau menambahkan `compose.dev.yaml`: mode development membuat akun staf dan kepala unit. Jangan menjalankan importer legacy, memulihkan dump lama, atau menyalin evidence lama ke proyek baru ini.

### 4. Login dan pastikan data kosong

Buka http://localhost:3001, klik **Login**, lalu gunakan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari `.env.bersih`. Pada menu Pengguna & Akses hanya ada administrator awal. Daftar penilaian dan bukti kosong; Anda dapat mulai membuat data baru dari sana.

Untuk memeriksa jumlah pengguna dan data langsung melalui database, jalankan perintah berikut pada Terminal Mac/Linux:

```sh
docker compose -p ledi-pbj-bersih --env-file .env.bersih exec -T db sh -c 'MYSQL_PWD="$MARIADB_PASSWORD" exec mariadb -u"$MARIADB_USER" "$MARIADB_DATABASE" -e "SELECT role,COUNT(*) AS jumlah FROM users GROUP BY role; SELECT COUNT(*) AS bukti FROM evidence; SELECT COUNT(*) AS periode FROM assessment_periods;"'
```

Hasil awal yang diharapkan: `admin = 1`, tidak ada role lain, `bukti = 0`, dan `periode = 0`. Login dapat menambahkan baris sesi dan audit; hal itu normal.

### 5. Menghentikan atau menjalankan kembali

Selalu sertakan nama proyek dan berkas konfigurasi yang sama:

```sh
docker compose -p ledi-pbj-bersih --env-file .env.bersih stop
docker compose -p ledi-pbj-bersih --env-file .env.bersih up -d --wait
```

Menjalankan kembali proyek yang sama mempertahankan data barunya; tidak mengosongkannya lagi. Untuk awal kosong berikutnya, pilih nama proyek dan berkas konfigurasi baru. Prosedur ini tidak memerlukan `down -v` dan tidak menghapus instalasi lama.

Perintah singkat seperti `npm run docker:backup` dan Compose tanpa `-p`/`--env-file` mengacu pada proyek/konfigurasi biasa. Jangan menggunakannya untuk administrasi instalasi bersih ini tanpa menyesuaikan proyek dan berkas konfigurasi; gunakan perintah eksplisit di atas agar tidak tertukar.

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

## Migrasi data terbaru dari Mac ke MariaDB

Jalankan langkah berikut di Terminal **Mac**, dari direktori proyek. Prosedur ini berlaku untuk aplikasi lama yang datanya masih berada pada SQLite/D1 lokal di `.wrangler`; menjalankan aplikasi melalui Node tidak otomatis berarti databasenya sudah MariaDB. Jika Mac sudah menggunakan MariaDB, gunakan bagian **Backup dan pemulihan**, bukan importer SQLite ini.

Sumber utama adalah data Mac. Jangan menyalin database Windows untuk menggantikan data Mac. Diperlukan Node.js >=22.13, Docker Desktop yang aktif, dan ruang untuk backup database beserta dokumen.

### 1. Hentikan aplikasi lama dan simpan backup Mac

Hentikan server Node lama dengan `Ctrl+C` agar data tidak berubah selama pengambilan snapshot. Simpan seluruh state Cloudflare, termasuk database, WAL, dan penyimpanan R2 lokal, sebelum memperbarui kode:

```sh
BACKUP_DIR="$HOME/lemari-digital-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -m 700 "$BACKUP_DIR"
cp -Rp .wrangler "$BACKUP_DIR/"
if [ -f .env ]; then cp -p .env "$BACKUP_DIR/"; fi
if [ -d data ]; then cp -Rp data "$BACKUP_DIR/"; fi
```

Jika `.wrangler` tidak ditemukan, identifikasi lokasi database sebenarnya terlebih dahulu. Jangan melanjutkan dengan database kosong. Backup berada di luar repository dan harus disimpan privat.

### 2. Ambil kode terbaru

Pastikan `git status` bersih. Simpan perubahan kode lokal sebelum penggabungan. Jika masih berada dalam percobaan merge gagal sebelumnya, selesaikan atau batalkan percobaan itu dahulu.

```sh
git fetch origin
git merge --ff-only origin/main
npm ci
```

Jika fast-forward ditolak, jangan menggunakan reset paksa: periksa commit lokal yang berbeda. Git hanya memperbarui kode; data Mac tetap berada di tempat semula.

### 3. Pilih database sumber dan buat snapshot konsisten

Daftar kandidat database aplikasi:

```sh
find .wrangler/state/v3/d1 -type f -name '*.sqlite' ! -name 'metadata.sqlite'
```

Isi `SOURCE_DB` dengan path database aplikasi yang benar dari hasil tersebut. Jika ada lebih dari satu kandidat, pastikan database yang berisi data terbaru; jangan memilih database metadata/R2.

```sh
SOURCE_DB="/path/absolut/database-aplikasi.sqlite"
MIGRATION_DIR="$PWD/backups/migrasi-mac-$(date +%Y%m%d-%H%M%S)"
node scripts/export-legacy.mjs "$SOURCE_DB" "$MIGRATION_DIR"
```

Ganti contoh `SOURCE_DB` sebelum menjalankannya. Exporter memeriksa integritas/relasi SQLite, membuat `source.sqlite` dan `source.json`, lalu menampilkan jumlah baris tiap tabel. Database asli tidak diubah. Sumber terbaru mencakup 20 tabel, termasuk favorit dan visibilitas publik; sumber lama 19 tabel juga diterima. Pastikan jumlah unit, pengguna, periode, indikator, dan nilai sesuai data Mac.

### 4. Periksa apakah ada bukti berupa berkas

```sh
node --input-type=module - "$MIGRATION_DIR/source.json" <<'NODE'
import { readFileSync } from 'node:fs';
const payload = JSON.parse(readFileSync(process.argv[2], 'utf8'));
const versions = payload.tables.evidence_versions.rows;
console.log({ evidenceVersions: versions.length, fileVersions: versions.filter(row => row.object_key).length });
NODE
```

**Jika `fileVersions` lebih dari nol, hentikan prosedur di sini.** Importer saat ini menolak sumber dengan `object_key`, karena penyalinan dan verifikasi isi berkas dari R2 lokal ke volume bukti belum diimplementasikan. Backup `.wrangler` pada langkah 1 mempertahankan berkas tersebut. Jangan menghapus baris bukti atau mengosongkan `object_key` untuk melewati pemeriksaan. Bukti yang berupa tautan HTTPS dapat diimpor oleh prosedur berikut. Kegagalan unggah sebelumnya tidak membuktikan bahwa semua versi berkas kosong; periksa hasil hitung ini.

### 5. Siapkan MariaDB Docker dan cadangkan target

```sh
npm run docker:setup
```

Script membuat `.env` dengan password acak hanya jika belum ada. Jika Mac mempunyai `.env` lama, script mempertahankannya: lengkapi variabel database dan admin menggunakan `.env.example` sebagai acuan sebelum menjalankan Compose. Simpan nilai lama yang masih diperlukan. `DB_PASSWORD`, `DB_ROOT_PASSWORD`, dan `ADMIN_PASSWORD` wajib terisi; `ADMIN_PASSWORD` harus 10–128 karakter.

Tetapkan `ADMIN_EMAIL` sesuai email administrator sumber yang hendak digabung **sebelum** inisialisasi target. Kebijakan yang dipilih adalah mempertahankan password admin Docker; profil dan relasi admin sumber dipindahkan ke akun tersebut. Pengguna lain mempertahankan kredensial sumbernya. Mengubah `.env` sesudah inisialisasi tidak mengganti password akun atau pengguna MariaDB yang sudah ada.

```sh
docker compose up -d --build --wait
npm run docker:backup
docker compose stop app
docker compose run --rm --no-deps app node scripts/verify-schema.mjs
```

Pastikan verifikasi melaporkan `applicationTables: 20`, `foreignKeys: 31`, dan `orphanRows: 0`. Untuk Mac yang belum mempunyai MariaDB, gunakan target baru agar data sumber tidak berbenturan dengan data uji. Jangan menyalin volume database Windows. Jika target sudah berisi data, importer mempertahankannya dan menolak konflik; importer tidak menggantinya otomatis. Jangan menjalankan mode development sebelum impor karena mode itu dapat menambahkan akun development.

### 6. Dry-run, impor, dan verifikasi

Gunakan Terminal yang sama agar `MIGRATION_DIR` masih terdefinisi. Aplikasi harus tetap berhenti selama seluruh rangkaian ini. Jalankan perintah satu per satu dan lanjutkan **hanya jika perintah sebelumnya berhasil**:

```sh
docker compose run --rm --no-deps --user root --volume "$MIGRATION_DIR:/migration" app node scripts/import-legacy.mjs /migration/source.json --dry-run
docker compose run --rm --no-deps --user root --volume "$MIGRATION_DIR:/migration" app node scripts/import-legacy.mjs /migration/source.json
docker compose run --rm --no-deps --user root --volume "$MIGRATION_DIR:/migration" app node scripts/import-legacy.mjs /migration/source.json --verify-only
docker compose run --rm --no-deps --user root --volume "$MIGRATION_DIR:/migration" app node scripts/import-legacy.mjs /migration/source.json
docker compose run --rm --no-deps app node scripts/verify-schema.mjs
```

Dry-run melakukan transaksi lalu rollback. Impor nyata memeriksa setiap baris sebelum commit. `--verify-only` membandingkan hasil tanpa menulis data; `verifiedRows` harus sama dengan `sourceRows`. Impor ulang terakhir harus melaporkan `inserted: 0`, dengan seluruh baris tetap terverifikasi. Laporan ditulis di folder snapshot, termasuk `source.json.imported.json` dan `source.json.verified.json`.

Jika ada konflik akun selain admin yang diizinkan, perbedaan isi baris dengan ID sama, nilai terlalu panjang untuk kolom, atau kegagalan foreign key, transaksi perintah tersebut dibatalkan. Jangan mematikan foreign key atau memaksa pengabaian konflik. Perintah impor yang telah berhasil sebelumnya tetap committed meskipun pemeriksaan sesudahnya gagal; gunakan backup target untuk pemulihan bila diperlukan.

### 7. Jalankan dan periksa hasil di browser

```sh
docker compose up -d --wait app
docker compose ps
```

Buka http://localhost:3000, masuk dengan admin Docker, lalu bandingkan pengguna, jenis penilaian, periode, kategori/indikator, nilai, favorit, dan tautan bukti dengan sumber Mac. Beranda publik hanya menampilkan jenis yang ditetapkan publik dan periode final, sehingga halaman publik kosong bukan bukti bahwa impor gagal.

Setelah verifikasi selesai, development dapat dijalankan dengan `npm run dev:docker`; MariaDB dan volume bukti yang sama tetap digunakan. Server Node lama yang memakai SQLite tidak perlu dijalankan bersamaan. Simpan backup Mac dan laporan privat sampai hasil migrasi disetujui. Jangan menggunakan `docker compose down -v` untuk memperbarui aplikasi.

### Catatan keamanan data

`source.json` berisi hash password dan sesi, sementara `.env` berisi kredensial. Jangan commit `.wrangler`, `.env`, `data`, `backups`, atau file dump ke Git. Jangan membagikan isi `source.json`; gunakan ringkasan jumlah baris untuk pemeriksaan.

## Utilitas migrasi D1 lokal terdahulu

```powershell
npm run db:import:legacy
```

Perintah ini membuat snapshot SQLite konsisten dan backup MariaDB/bukti, membangun image production, memperbarui skema, memeriksa seluruh foreign key, menguji rollback, menjalankan dry-run dan impor, lalu memverifikasi dan mengulang impor untuk memastikan tidak ada duplikasi. Aplikasi dihentikan selama transaksi impor dan dijalankan kembali dalam mode production. Jalankan kembali `npm run dev:docker` untuk mengembangkan kode.

Akun admin dengan email ADMIN_EMAIL boleh digabung: ID, email, password hash/salt, dan waktu perubahan password tujuan dipertahankan; profil dan relasi dari sumber dipindahkan. Benturan akun lain atau data lain membatalkan transaksi. Data MariaDB yang sudah ada tidak dihapus. Berkas sumber SQLite tetap utuh sebagai arsip, tidak lagi digunakan aplikasi.

Laporan privat tersimpan bersama source.sqlite/source.json di backups/legacy-<waktu>/. Lokasi laporan terakhir dicatat pada outputs/legacy-migration-latest.json. Source.json memuat hash kredensial dan sesi, sehingga tidak boleh dimasukkan ke Git atau dibagikan sebagai laporan publik.

Hasil pengujian terdahulu di Windows memindahkan 19 tabel/48 baris, termasuk satu admin yang digabung, tanpa berkas R2. Angka tersebut **bukan jumlah data Mac**. Utilitas di atas memerlukan kontainer target yang sudah tersedia untuk backup dan mengasumsikan adanya baris penugasan pada uji rollback; untuk Mac gunakan prosedur bertahap di atas yang memeriksa sumber terlebih dahulu. Snapshot menyimpan metadata internal Cloudflare sebagai arsip; tabel internal tersebut bukan bagian skema MariaDB aplikasi.

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
