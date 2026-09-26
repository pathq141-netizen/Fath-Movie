# 🎬 FathMovie — Streaming Movie & Series Platform

Website streaming movie & series full-stack modern menggunakan **Node.js + Express**, dirancang siap deploy ke **Vercel** (Serverless Functions) maupun VPS/Local server.

Menggunakan engine scraper data `movie.js` (TheMovieBox) sebagai satu-satunya penyedia data (tanpa database eksternal untuk konten).

---

## ✨ Fitur Utama

- 🍿 **Tampilan Modern & Sinematik (Dark Mode)**: Terinspirasi dari Netflix & Disney+, aksen merah neon (#E50914), card poster interaktif dengan zoom hover dan rating IMDB.
- ⚡ **Siap Deploy ke Vercel**: Seluruh endpoint API di `/api` berjalan sebagai Vercel Serverless Functions, dengan file statis di `/public`.
- 🔍 **Pencarian Cepat & Filter**: Cari film & serial TV secara live dengan filter kategori (Semua, Movie, Series) dan debounce instan.
- 📜 **Halaman Detail Komprehensif**: Menampilkan poster beresolusi tinggi, sinopsis lengkap, trailer embed, dubbing audio alternatif, dan pilihan Season & Episode.
- 📺 **Pemutar Video Kustom HTML5**:
  - Dukungan seeking video via **HTTP Range 206 (Partial Content)** melalui reverse streaming proxy lokal (`/api/proxy-stream`).
  - Pemilihan multi-kualitas resolusi (360p, 480p, 720p, 1080p) tanpa kehilangan posisi menit video.
  - Pemilihan subtitle bahasa (Indonesia, English, dll.) terkonversi otomatis dari SRT ke WebVTT (`/api/subtitle`).
  - Navigasi cepat episode (Episode Selanjutnya, Episode Sebelumnya, dan deretan tombol episode).
  - Pintasan keyboard (Spasi untuk Play/Pause, Panah Kiri/Kanan untuk seek 10s, Mute 'M', Fullscreen 'F').
- 💾 **Fitur Pengguna Bebas Database (LocalStorage)**:
  - **Lanjutkan Menonton (Continue Watching)**: Menyimpan progres menit terakhir dan persentase tontonan secara otomatis tiap 5 detik.
  - **Watchlist / Favorit**: Simpan daftar film/series yang ingin ditonton kapan saja.

---

## 📁 Struktur Proyek (Vercel & Express Compatible)

```
movienas/
├── api/
│   ├── trending.js             # GET /api/trending
│   ├── search.js               # GET /api/search
│   ├── detail.js               # GET /api/detail
│   ├── detail/[detailPath].js  # Dynamic route untuk Vercel
│   ├── stream.js               # GET /api/stream
│   ├── proxy-stream.js         # GET /api/proxy-stream (Video Range Pipe)
│   ├── subtitle.js             # GET /api/subtitle (SRT to WebVTT)
│   └── captions.js             # GET /api/captions
├── lib/
│   ├── movie.js                # Core Scraper Engine (TheMovieBox)
│   └── cache.js                # In-Memory Cache (TTL) untuk Trending & Detail
├── public/
│   ├── index.html              # Homepage (Hero Banner, Carousels, Continue Watching)
│   ├── search.html             # Halaman Pencarian & Filter Kategori
│   ├── detail.html             # Halaman Detail, Trailer & Daftar Episode
│   ├── player.html             # Pemutar Video Kustom HTML5
│   ├── css/
│   │   └── style.css           # Styling Dark Mode, Animasi Shimmer & Responsive
│   └── js/
│       ├── app.js              # Shared State, Navbar, Watchlist & History
│       ├── home.js             # Homepage Data Fetching & Carousel Handler
│       ├── search.js           # Debounced Search & Pagination
│       ├── detail.js           # Detail Renderer & Episode Tabs
│       └── player.js           # Video Player Engine & Subtitle Switcher
├── server.js                   # Express Local Server
├── package.json
└── vercel.json                 # Konfigurasi Vercel Serverless & Rewrites
```

---

## 📡 Dokumentasi API Endpoints

| Endpoint | Method | Deskripsi | Query Parameters |
|---|---|---|---|
| `/api/trending` | GET | Daftar film & series trending | `page` (default: 1), `perPage` (default: 20), `lang` (default: id) |
| `/api/search` | GET | Cari judul film atau series | `q` (kata kunci), `page`, `perPage`, `type` (0=Semua, 1=Movie, 2=Series) |
| `/api/detail` | GET | Detail lengkap, sinopsis, & episode | `path` atau `slug` atau `detailPath` |
| `/api/stream` | GET | Link playable MP4 & daftar subtitle | `path`, `id`, `se` (season), `ep` (episode) |
| `/api/proxy-stream`| GET | Proxy video stream (Range 206) | `url` (link upstream video), `filename` |
| `/api/subtitle` | GET | Proxy subtitle WebVTT | `url` (link upstream .srt), `lang` |

---

## 🚀 Panduan Menjalankan Secara Lokal

1. **Clone / Buka Direktori**:
   ```bash
   cd movienas
   ```

2. **Instalasi Dependensi**:
   ```bash
   npm install
   ```

3. **Jalankan Server Development**:
   ```bash
   npm start
   # atau
   npm run dev
   ```

4. Buka browser di [http://localhost:4000](http://localhost:4000).

---

## ☁️ Panduan Deploy ke Vercel

Proyek ini telah dikonfigurasi secara native untuk Vercel:

1. Pastikan Anda telah menginstal **Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. Jalankan perintah deploy:
   ```bash
   vercel
   ```
   Atau untuk production:
   ```bash
   vercel --prod
   ```

3. Atau hubungkan repositori Git Anda ke dashboard Vercel:
   - Framework Preset: **Other**
   - Root Directory: `./`
   - Build Command: *(Kosongkan)*
   - Output Directory: *(Kosongkan)*

Vercel akan otomatis mengenali folder `/api` sebagai **Serverless Functions** dan folder `/public` sebagai aset web statis sesuai konfigurasi di `vercel.json`.

---

## 🛡️ Lisensi & Disclaimer
Aplikasi ini dibuat untuk tujuan edukasi dan eksplorasi teknologi full-stack Node.js, Express, dan Vercel Serverless. Seluruh materi konten video dan gambar bersumber dari API pihak ketiga.
