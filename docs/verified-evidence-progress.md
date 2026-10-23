# Koreksi capaian terverifikasi

Kasus: Rencana Pengadaan berisi nilai mandiri 5 + 2,5 + 2,5. Indikator kedua ditolak, dua lainnya diterima. Sebelumnya kartu menjumlahkan nilai mandiri menjadi 10 dan menghitung semua indikator terisi sebagai selesai.

Perbaikan menambahkan capaian terverifikasi tanpa mengubah nilai tersimpan. Hasil: mandiri 10, terverifikasi 7,5, diterima 2 dari 3, ditolak 1. Bar capaian 75% dari target 10. Jumlah indikator diterima 2/3 adalah ukuran kelengkapan yang berbeda dari persentase poin. Tiga indikator dapat memiliki unggahan fisik meskipun hanya dua diterima.

Untuk beberapa unit, kontribusi unit yang ditolak/pending tetap nol dalam penyebut rata-rata indikator; tidak dihilangkan sehingga unit diterima tidak otomatis mewakili nilai penuh. Indikator baru dinyatakan lengkap bila semua nilai unit yang ada diterima dan mempunyai bukti aktif. Perilaku mode berbobot lama dipertahankan.

Verifikasi: delapan tes perhitungan dan empat tes integrasi pada database sementara, termasuk tolak -> unggah ulang -> menunggu -> terima, kompatibilitas mode lama, dan finalisasi yang tetap ditolak ketika ada bukti belum diterima. API dan browser lokal dikonfirmasi terhadap data pengguna: 7,5 poin, 2 diterima, 1 ditolak. Tidak ada migrasi atau perubahan nilai/evidence pengguna. Enam tes lama tetap gagal karena fixture database.sql sudah dihapus sebelumnya.
