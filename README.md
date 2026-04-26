<div align="center">
  <h1>🌸 Naura Hoshino Intelligence</h1>
  <p><strong>Enterprise-Grade Discord Bot Ecosystem with AI, High-Fidelity Audio, and Web Dashboard</strong></p>

  ![Version](https://img.shields.io/badge/Version-1.0.0-blue.svg?style=for-the-badge&logo=github)
  ![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg?style=for-the-badge&logo=nodedotjs)
  ![Discord.js](https://img.shields.io/badge/Discord.js-v14.15.3-blue.svg?style=for-the-badge&logo=discord)
  ![MySQL](https://img.shields.io/badge/Database-MySQL-orange.svg?style=for-the-badge&logo=mysql)
  ![Lavalink](https://img.shields.io/badge/Audio-Lavalink_v4-red.svg?style=for-the-badge)
</div>

---

**Naura Hoshino** adalah ekosistem bot Discord berskala *Enterprise* yang memadukan Kecerdasan Buatan (AI) tingkat lanjut, Sistem Audio Premium, Sistem Ekonomi Terintegrasi, dan *Web Dashboard*. Dibangun dengan arsitektur modular yang kokoh dan estetika *Canvas* generasi baru, Naura dirancang untuk memberikan pengalaman server yang paling profesional, interaktif, dan modern.

## ✨ Fitur Utama (Core Features)

### 🎵 High-Fidelity Music System
Ditenagai oleh **Poru** dan node **Lavalink v4** terbaru, memberikan pengalaman mendengarkan musik sekelas platform komersial:
- **Smart Autocomplete:** Pencarian cerdas dan instan ke **YouTube Music** (`ytmsearch`) & **Spotify** (`spsearch`) berkat integrasi *LavaSrc*.
- **SponsorBlock AI:** Secara cerdas melompati intro dialog panjang atau iklan bawaan (*in-video ads*) di dalam YouTube.
- **Canvas Visualizer:** Merender *Dynamic Image Canvas* setiap lagu dimainkan, bekerja *real-time* tanpa membuat *lag* server!
- **DSP Audio Filters:** *Dropdown Menu* untuk langsung mengubah efek suara ke *Bassboost*, *Nightcore*, atau *Vaporwave*.
- **Naura Cloud Playlist:** Sinkronisasi MySQL untuk menyimpan daftar putar favorit Anda agar bisa dipanggil kembali kapan saja.

### 💎 Sistem V.I.P Premium & Webhooks Otomatis
Ekosistem finansial otonom yang bekerja 24/7 tanpa perlu campur tangan manual:
- **Automated Billing (Saweria):** Melalui jalur *API Webhook* tersembunyi (`/api/webhook/saweria`), bot dapat membaca donasi masuk, memindai ID Discord pembeli, dan langsung memberikan status V.I.P.
- **Top.gg Auto-Reward:** *Webhook* khusus (`/api/webhook/vote`) yang langsung menyuntikkan *Trial V.I.P* 12 jam kepada siapa saja yang melakukan *Vote* untuk Naura.
- **Premium Perks:** Pengguna V.I.P menikmati **2x Global XP Boost**, akses eksklusif ke AI Generator (`/ai imagine`), gaji mingguan spesial, Mode 24/7 Radio, serta Kartu Level & Profil Emas (*Gold Glow*).

### 🤖 Kecerdasan Buatan Terintegrasi (Google Gemini)
- Ditenagai oleh **Google Gemini AI**, Naura merespons secara adaptif, cerdas, dan memiliki persona karakter khas.
- Menyediakan *Image Studio* (`/ai imagine`) untuk menghasilkan ilustrasi berbasis prompt (Terkunci untuk V.I.P).

### 🎨 Visual & Leveling Generasi Baru
- Kartu Level-Up dan `/rank` menggunakan arsitektur *Glassmorphism* dan *Neon Glow* tingkat tinggi yang dirender oleh `@napi-rs/canvas`.

### 🌐 Live Web Dashboard
- Endpoint HTTP Express bawaan yang berjalan otomatis dan menyajikan halaman *Dashboard UI* cantik untuk memantau performa *Resource*, latensi (Ping), dan status jaringan komunitas server.

---

## ⚙️ Persyaratan Infrastruktur (Prerequisites)

Untuk menjalankan ekosistem Naura Hoshino dengan sempurna, Anda memerlukan:
1. **[Node.js](https://nodejs.org/)** (v18.x atau lebih baru)
2. **[MySQL Server](https://www.mysql.com/)** untuk penyimpanan data relasional berkecepatan tinggi.
3. **[Lavalink Server v4](https://github.com/lavalink-devs/Lavalink)** (Disarankan memakai plugin *LavaSrc* & *SponsorBlock*).
4. Kunci API: **Discord Bot Token**, **Google Gemini API Key**, **Spotify API**.

---

## 🚀 Panduan Instalasi & Eksekusi

### 1. Persiapan Repositori
Lakukan kloning repositori dan masuk ke dalam direktorinya:
```bash
git clone https://github.com/aryandita/Naura-Hoshino.git
cd Naura-Hoshino
```

### 2. Instalasi Dependensi
Instal seluruh paket perpustakaan (*library*) yang dibutuhkan:
```bash
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin (atau ubah nama) file `.env.example` menjadi `.env`. Masukkan kredensial Anda ke dalam file tersebut:
```env
TOKEN=discord_bot_token_anda
GEMINI_API_KEY=gemini_api_key_anda
OWNER_IDS=id_discord_anda

# Konfigurasi MySQL
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=password_database
DB_NAME=naura_db

# Kunci Rahasia Webhook (Untuk Integrasi V.I.P)
WEBHOOK_AUTH_SAWERIA=stream_key_saweria_anda
WEBHOOK_AUTH_VOTE=sandi_topgg_anda

# Konfigurasi Lavalink Node
LAVALINK_HOST=127.0.0.1
LAVALINK_PORT=2333
LAVALINK_PASSWORD=youshallnotpass
LAVALINK_SECURE=false
```

### 4. Nyalakan Mesin
Naura menggunakan *Sequelize ORM*. Saat Anda menjalankan mesin pertama kalinya, bot akan secara otomatis membuat, mengatur struktur, dan menyinkronkan seluruh tabel MySQL Anda (Sinkronisasi *Auto-Migrate*).

Jalankan perintah ini:
```bash
npm run start
```
*(Atau `node index.js` untuk environment produksi).*

---

## 🛡️ Keamanan & Stabilitas
Sistem Naura Hoshino dirancang tangguh. Memiliki modul *anti-crash* komprehensif untuk mencegah terhentinya program karena *Uncaught Exceptions* (seperti API Discord Timeout atau Lavalink Disconnect), serta *memory-leak prevention* pada rendering Canvas.

<p align="center">
  Dibuat dengan 🤍 oleh <b>Aryandita Praftian (Ryaa)</b>.
</p>