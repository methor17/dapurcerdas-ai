# v8.2 — Resumable Chat

- Streaming menyimpan teks parsial secara berkala; tetap ada setelah refresh.
- Tombol Lanjutkan Jawaban muncul bila token habis/timeout/Stop/koneksi terputus.
- Server mengirim metadata selesai/tidak lengkap dan mendukung `continueFrom` (maks 2200 karakter).
- Lanjutan tidak mengulang percakapan di histori, melainkan menempel pada bubble yang sama.
- Fitur lain dan aturan Cari Bahan tetap dari v8.1.
# CHANGELOG — DapurCerdas AI v7

- Input stok dan CRUD dari v6 tetap tersedia.
- Recomendasi cepat mengisi slot minggu pada awal proses; hasil AI menggantikan 1 slot per permintaan.
- Tombol Pause / Resume / Stop & Simpan untuk rencana mingguan dan inspirasi AI.
- Auto-save status pekerjaan dan resep AI per slot di browser localStorage.
- Resume setelah refresh tanpa mengulang slot yang telah disimpan.
- Tampilkan hasil parsial bila AI gagal atau timeout; saran cepat tetap dapat dipakai.
- AbortController di browser dan propagasi abort dari backend Node.js ke Ollama.
- Backend membatasi num_ctx, num_predict, memakai keep_alive=20m, prompt JSON terstruktur.
- Perbedaan tampilan antara saran cepat dan resep AI yang selesai.
- Contoh .env menggunakan qwen3.5:4b dan timeout per resep, Google CSE ID tidak berubah.
- Preview offline interaktif menyediakan simulasi progress tanpa membutuhkan model AI.
- Tidak ada menu otomatis masuk ke daftar belanja sebelum klik Cari Bahan.
- Test otomatis tambahan untuk progress/pause-resume/idempotensi.

## v7.1 — Perbaikan Google Search
- Google Search Engine ID CX tetap `b0f250f042fc442b3` di `.env`, `.env.example`, dan preview HTML.
- Gunakan `window.__gcse.initializationCallback` resmi untuk menghindari kondisi balapan pada script.onload.
- Preview HTML juga memuat Google Search online, bila browser mengizinkan script pihak ketiga.
- Pesan error membedakan ID kosong, loading, terhubung, error jaringan/CSP/ad-block; pencarian yang diklik saat loading akan otomatis berjalan setelah siap.
- Tidak mengubah aturan belanja opt-in, AI, atau CRUD.
