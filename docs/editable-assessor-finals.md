# Nilai asesor dapat diedit sebelum finalisasi

Klarifikasi pengguna: meskipun ITKP memakai poin langsung, nilai asesor harus dapat diisi terpisah dari nilai mandiri sebelum periode difinalisasi. Ini menggantikan keputusan awal yang membuat subtotal final hanya-baca dan menyalin nilai indikator.

Dialog membuka nilai awal dari capaian terverifikasi. Asesor dapat mengubah setiap subtotal dari nol sampai maksimum subkategori (ITKP: 10, 20, 15, 9, 6, 30, 10). Total menjumlahkan seluruh input, tanpa pembobotan ulang. Seluruh input harus terisi dan valid; batas yang sama diperiksa server. Pecahan hasil rata-rata beberapa unit tidak diblokir validasi langkah browser.

Saat disimpan, nilai asesor masuk ke subcategories.final_value yang sudah ada. Nilai mandiri, capaian terverifikasi, dan dokumen tidak diubah. Tidak dibuat alokasi nilai asesor per indikator yang tidak pernah diisi pengguna. Dashboard publik, PDF, dan Excel memakai subtotal asesor yang tersimpan. Nilai final historis tetap terbaca.

Semua indikator tetap wajib diterima dan memiliki bukti aktif sebelum finalisasi. Periode dan nilai dikunci setelah finalisasi. Kesalahan jaringan atau respons tidak valid mengembalikan kontrol simpan dan meminta pengguna memeriksa status sebelum mengulang.

Verifikasi: 10 tes perhitungan dan 4 tes integrasi pada database sementara. Contoh nilai mandiri/terverifikasi 25, nilai asesor 23: hasil final publik/PDF/Excel 23 dan nilai mandiri tetap 25. Input kosong, null, boolean, negatif, serta Renaksi 6,01 ditolak. Pengujian UI lokal mengubah Rencana Pengadaan 10 ke 8 dan total 77 ke 75 tanpa menyimpan/finalisasi database pengguna. Tidak ada migrasi baru.
