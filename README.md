# SatuNilai

Aplikasi manajemen penilaian SPBE, Indeks SDI, EPSS, ITKP, dan instrumen pemerintahan lainnya. SatuNilai menyediakan instrumen berversi, dukungan multiunit, RBAC, nilai target/internal/asesor, penyimpanan bukti privat, audit log, dan pelaporan.

## Dokumentasi

- [Buku panduan](docs/BUKU-PANDUAN.md)
- [Skema database](database.sql)
- [Migrasi database](drizzle/)

## Prerequisites

- Node.js `>=22.13.0`

## Menjalankan aplikasi

```bash
npm install
npm run dev
npm run build
```

This starter does not use `wrangler.jsonc`.

## Included Shape

- edit site code under `app/`
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/schema.ts` starts intentionally empty
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Autentikasi dan email reset

SatuNilai memakai password PBKDF2-SHA256 dan sesi acak di cookie `HttpOnly`, `SameSite=Strict`. Admin menentukan password awal saat membuat pengguna. Mengubah password pengguna akan mengakhiri seluruh sesi pengguna tersebut.

Untuk pengembangan lokal, akun awal adalah `admin@localhost` dengan password `Admin123!SatuNilai`. Ganti password ini melalui **Pengguna & Akses** sebelum memakai data penting.

Akun uji lokal untuk pemeriksaan hak akses:

- Staf: `staff@localhost` / `Staff123!SatuNilai` — akses ITKP.
- Kepala Unit: `kepala.unit@localhost` / `Kepala123!SatuNilai` — akses ITKP dan SPBE.

Akun uji hanya digunakan pada lingkungan lokal dan wajib diganti atau dinonaktifkan sebelum produksi.

Pengiriman reset password menggunakan Resend. Isi rahasia berikut pada lingkungan deployment (jangan commit nilainya):

```text
RESEND_API_KEY=re_...
MAIL_FROM=SatuNilai <noreply@domain-anda.go.id>
```

Tanpa dua konfigurasi tersebut, endpoint tetap memberikan respons generik untuk mencegah enumerasi akun, tetapi email tidak dikirim. Domain pengirim harus sudah diverifikasi pada penyedia email.

Terapkan migrasi `drizzle/0001_auth.sql` pada database yang sudah ada. Instalasi baru dapat menggunakan `database.sql`.

## Useful Commands

- `npm run dev`: start local development
- `npm run build`: verify the vinext build output
- `npm test`: build the starter and verify its rendered loading skeleton
- `npm run db:generate`: generate Drizzle migrations after schema changes

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
