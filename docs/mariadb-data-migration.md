# Migrasi data lokal ke MariaDB

Tujuan: semua data aplikasi pada D1 lokal dipindahkan ke MariaDB yang sudah berjalan; pengembangan dan produksi memakai mesin MariaDB, tanpa fallback SQLite. Pengguna memilih mempertahankan password admin Docker saat email akun bertabrakan.

Sumber ditemukan: satu database aplikasi D1 pada `.wrangler/state/v3/d1/miniflare-D1DatabaseObject/`, berisi 19 tabel aplikasi dan 48 baris. Pemeriksaan integrity dan foreign key bersih. Tidak ada evidence/evidence_versions, sehingga tidak ada berkas R2 yang perlu dipindahkan. Database metadata internal Cloudflare tetap tersimpan pada snapshot arsip, tidak menjadi tabel aplikasi MariaDB.

Aturan: snapshot SQLite konsisten dan backup MariaDB sebelum impor; impor menambah data tanpa menghapus data MariaDB. Hanya akun admin dengan email ADMIN_EMAIL yang boleh digabung, dan kedua akun harus berperan admin. ID, email dan kredensial Docker dipertahankan; profil sumber dipindahkan dan seluruh foreign key pengguna dipetakan ulang. Konflik akun lain atau data lain menghentikan transaksi; tidak menggunakan INSERT IGNORE atau mematikan foreign key. Setiap baris diverifikasi sebelum commit, impor dapat diulang tanpa duplikasi. Sumber lama tidak dimodifikasi.

Langkah: buat tes snapshot/konflik; implementasikan exporter/importer dan laporan; dry-run dalam transaksi rollback; impor dan verifikasi baris; periksa data SPBE melalui API; tambahkan mode Docker development dengan hot reload dan MariaDB yang sama; build production, uji development, lalu periksa persistensi dan kredensial.

Backup dan laporan data privat berada di `backups/` yang diabaikan Git. Laporan ringkas tidak menyertakan password/hash/token. Deployment ke VM tidak dilakukan pada tugas ini.

## Hasil pemeriksaan

- Snapshot sumber utuh, 19 tabel / 48 baris terverifikasi; satu admin digabung dengan kebijakan di atas. Semua data MariaDB yang sebelumnya ada dipertahankan.
- Generator identifier diperbaiki setelah tes menemukan komentar pemisah SQL ikut berubah. Migrasi lama yang sudah diterapkan tidak ditulis ulang; migrasi 0001 memulihkan seluruh 29 foreign key dan indeks yang hilang.
- Satu baris penugasan dari uji awal yang terlanjur masuk dengan indikator sintetis diperbaiki tepat berdasarkan ID dan nilai uji tersebut. Pemeriksaan berikutnya menunjukkan tidak ada baris orphan.
- Impor sekarang menolak skema tanpa 29 foreign key/InnoDB atau dengan foreign_key_checks dimatikan. Uji foreign key tidak valid berhasil ditolak dan seluruh transaksi dibatalkan.
- Verifikasi melalui HTTP membuktikan password Docker tetap berlaku dan periode/indikator/nilai SPBE lama terlihat pada workspace dan dashboard.
- Pengembangan Docker memakai driver mysql2 eksternal pada Node dan polling berkas untuk bind mount Windows. Mode production dan development mempunyai image berbeda dan sama-sama memakai MariaDB.
- Instalasi production pada database kosong yang terisolasi juga berhasil: 19 tabel, 29 foreign key, nol orphan. Seluruh kontainer dan volume uji terisolasi dihapus setelah tes, tanpa menyentuh volume utama.
- Mode development lolos uji penemuan route baru, perubahan respons melalui hot reload, dan penghapusan route tanpa restart server. Uji HTTP lengkap lolos pada kedua mode.
