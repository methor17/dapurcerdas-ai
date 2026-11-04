# DapurCerdas AI v9 — Katalog Nusantara 768 Resep & Variasi

Website masakan Nusantara siap digunakan secara lokal: **768 resep & variasi dengan nama unik**, terdiri dari **128 resep dasar** dan **640 adaptasi/variasi rumahan**. Katalog mencakup ayam, daging, ikan/seafood, sayur, tempe/tahu, telur, nasi dan mi. Setiap entri mencakup takaran untuk 3 porsi awal, 4 kelompok bahan (bahan utama, bumbu halus, bumbu iris/geprek, pelengkap), langkah memasak berurutan dan tips. Nama daerah adalah rujukan inspirasi; resep adalah adaptasi rumahan, **bukan klaim keaslian tunggal** masakan daerah.

## Coba tanpa instalasi

Buka `preview.html` di browser. Input belanjaan, filter daerah/kategori/jenis resep, klik kartu untuk melihat langkah dan bumbu, atur jadwal 7 hari, dan klik **Cari Bahan** untuk menghitung kebutuhan. Pratinjau offline ini menjalankan simulasi AI (bukan inferensi Ollama nyata). Google di pratinjau hanya berjalan bila browser mengizinkan script Google dari internet.

## Instalasi Windows (Node 20+)

1. Ekstrak ZIP dan buka PowerShell pada folder project.
2. Pastikan file `.env` tersedia. Jika tidak ada, salin `.env.example` menjadi `.env`.
3. Untuk AI lokal, jalankan `ollama pull qwen3.5:4b`; pastikan Ollama berjalan.
4. Jalankan `npm start`.
5. Buka `http://127.0.0.1:3000`.

Google Search Engine ID pengguna sudah dicatat dalam konfigurasi:

```env
GOOGLE_CSE_ID=b0f250f042fc442b3
AI_PROVIDER=ollama
OLLAMA_URL=http://127.0.0.1:11434
OLLAMA_MODEL=qwen3.5:4b
CHAT_TIMEOUT_MS=65000
```

AI lokal opsional: katalog, CRUD, resep lengkap, dan rencana mingguan tetap bisa dipakai saat Ollama tidak tersedia. OpenAI API tersedia jika `AI_PROVIDER=openai` dan `OPENAI_API_KEY` diisi secara pribadi; ChatGPT Plus tidak menyediakan API key gratis untuk website ini.

## Fitur katalog v9

- **768 entri berbeda**: 128 resep dasar dan 5 variasi per resep (640 variasi), sehingga tidak menyamakan semua entri dengan 768 masakan tradisional yang berbeda.
- **Pencarian cepat** berdasarkan nama masakan, bahan, dan beberapa wilayah melalui tag.
- **Filter kategori, wilayah, jenis** (resep dasar atau variasi), dan durasi memasak.
- **Muat bertahap**: awalnya 24 kartu; klik Tampilkan Resep Lainnya untuk 24 kartu berikutnya.
- **Detail langsung siap**: kelompok bahan utama, bumbu halus, bumbu iris/geprek, pelengkap, serta langkah memasak berurutan.
- **Rencana 7 hari**: pilih 1–3 menu/hari, tampilkan 7–21 menu berbeda berdasarkan resep yang tersedia; variasi satu hidangan diberi penalti agar jadwal lebih beragam.
- **Cari Bahan**: hanya menambah kebutuhan setelah ditekan secara eksplisit. Membuka resep, menjadwalkan resep, mencari inspirasi Google, atau memfavoritkan **tidak** menambah belanja.
- **Google Search**: hasil online memerlukan Google Programmable Search Engine ID dan akses internet. Hasil Google bisa dikonversi menjadi draft resep dari katalog paling cocok; ini **bukan** hasil ekstraksi isi situs yang telah terverifikasi. Penyempurnaan dengan AI opsional.
- **Chat Koki AI**: menggunakan streaming dan fitur Stop/Lanjutkan saat respons Ollama terpotong. Kecepatan tetap dipengaruhi CPU, RAM/VRAM, dan model lokal.
- **CRUD**: stok bahan, resep pribadi, rencana mingguan, pengaturan daftar belanja, dan favorit (menambah/menghapus).

## Struktur source code

- `public/data.js`: resep awal dan perakitan katalog.
- `public/regional-recipes.js`: 92 resep dasar tambahan (diracik khusus untuk proyek ini).
- `public/catalog-expansion.js`: mesin 5 variasi per resep; menyesuaikan bahan, jumlah, langkah dan penandaan asal.
- `public/app.js`: frontend, filter, 7 hari, pembelian opt-in, chat dan Google.
- `public/shopping-core.js`, `public/units.js`: pemilihan resep dan normalisasi takaran.
- `server.mjs`: backend Node.js untuk Ollama/OpenAI dan Google Search Element.
- `test/catalog-v9.test.mjs`: pengujian katalog 768 judul, bahan, variasi, dan langkah memasak.
- `build_preview.py`: membuat ulang HTML preview mandiri.

## Pengujian

`npm test` menjalankan seluruh pengujian Node. Uji browser dilakukan terpisah untuk pencarian dan filter wilayah, pembukaan resep, empat kelompok bahan, pemilihan belanja, serta menyusun 21 menu. Integrasi Google live dan keluaran model AI nyata harus diuji pada lingkungan pemilik aplikasi. Pengujian yang dilakukan dalam paket ini **tidak** menjamin semua takaran dan ciri kuliner otentik: resep variasi adalah konten panduan rumahan yang bisa disalin/edit oleh pengguna.

## Penyimpanan

Data pengguna disimpan di localStorage dalam browser (key `dapurcerdas_v2`), kompatibel dengan versi sebelumnya. Jangan menghapus data situs jika ingin mempertahankan stok, resep pribadi, favorit, dan pengaturan belanja. Simpan cadangan sebelum pindah browser. Katalog dasar dan variasi tersedia offline dan tidak menghabiskan storage browser pengguna.
