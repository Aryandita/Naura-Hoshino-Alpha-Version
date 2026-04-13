const { createCanvas, loadImage } = require('@napi-rs/canvas'); // Menggunakan mesin baru
const { AttachmentBuilder } = require('discord.js');
const path = require('path');

class CanvasUtils {
  
  // ==========================================
  // 🪪 KARTU PROFIL (JANGAN DIHAPUS JIKA SUDAH ADA ISINYA)
  // ==========================================
  static async generateProfile(user, guild) {
    // Taruh kembali logika kodingan kartu profil asli milikmu di sini.
    // Jika belum ada, biarkan saja kosong untuk sementara.
  }

  // ==========================================
  // 🎉 KARTU LEVEL UP (RPG STYLE & DECORATED)
  // ==========================================
  static async generateLevel(user, newLevel) {
    // Membuat Kanvas ukuran 800x400 (Sesuai proporsi gambar gunung)
    const canvas = createCanvas(800, 400);
    const ctx = canvas.getContext('2d');

    // Helper function untuk menggambar bentuk kotak dengan sudut tumpul
    const fillRoundRect = (ctx, x, y, width, height, radius, color) => {
        if (width < 2 * radius) radius = width / 2;
        if (height < 2 * radius) radius = height / 2;
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
    };

    try {
        // 1. MEMUAT BACKGROUND GAMBAR PIXEL ART (level-bg.png)
        // Pastikan gambar level-bg.png ada di folder utama (root) bot kamu
        const bgPath = path.join(process.cwd(), 'level-bg.png');
        const bg = await loadImage(bgPath);
        ctx.drawImage(bg, 0, 0, 800, 400);
    } catch (error) {
        console.error('Gambar level-bg.png tidak ditemukan, memakai warna solid cadangan.', error);
        ctx.fillStyle = '#1a1a1d'; // Warna gelap pekat jika gambar gagal dimuat
        ctx.fillRect(0, 0, 800, 400);
    }

    // 2. MEMBUAT OVERLAY (KOTAK HITAM TRANSPARAN) DENGAN TEKSTUR
    const margin = 30;
    const ovWidth = 800 - margin * 2;
    const ovHeight = 400 - margin * 2;
    
    // Kotak latar belakang transparan
    fillRoundRect(ctx, margin, margin, ovWidth, ovHeight, 15, 'rgba(0, 0, 0, 0.75)');

    // Pola Garis-Garis Diagonal Subtil (Tekstur UI agar tidak polos)
    ctx.save();
    ctx.clip(); // Batasi gambar pola hanya di dalam kotak overlay
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; // Garis putih sangat tipis
    ctx.lineWidth = 1;
    for (let i = -800; i < 1200; i += 10) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 400, 400);
        ctx.stroke();
    }
    ctx.restore();

    // 3. DEKORASI BINGKAI EMAS YANG LEBIH RAMAI (ORNATE BORDER)
    ctx.strokeStyle = '#f1c40f'; // Warna emas base
    ctx.lineWidth = 4;
    ctx.strokeRect(margin + 5, margin + 5, ovWidth - 10, ovHeight - 10); // Bingkai dalam

    // Dekorasi Segitiga di Setiap Sudut (Corner Flourishes)
    const cornerSize = 25;
    ctx.fillStyle = '#f1c40f'; // Isi emas solid
    
    // Pojok Kiri Atas
    ctx.beginPath(); ctx.moveTo(margin+5, margin+5); ctx.lineTo(margin+5+cornerSize, margin+5); ctx.lineTo(margin+5, margin+5+cornerSize); ctx.fill();
    // Pojok Kanan Atas
    ctx.beginPath(); ctx.moveTo(800-margin-5, margin+5); ctx.lineTo(800-margin-5-cornerSize, margin+5); ctx.lineTo(800-margin-5, margin+5+cornerSize); ctx.fill();
    // Pojok Kiri Bawah
    ctx.beginPath(); ctx.moveTo(margin+5, 400-margin-5); ctx.lineTo(margin+5+cornerSize, 400-margin-5); ctx.lineTo(margin+5, 400-margin-5-cornerSize); ctx.fill();
    // Pojok Kanan Bawah
    ctx.beginPath(); ctx.moveTo(800-margin-5, 400-margin-5); ctx.lineTo(800-margin-5-cornerSize, 400-margin-5); ctx.lineTo(800-margin-5, 400-margin-5-cornerSize); ctx.fill();

    // Dekorasi Pita Emas di Tengah Atas (Sertifikat)
    fillRoundRect(ctx, 400 - 80, margin - 10, 160, 25, 5, '#f1c40f');
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px "Trebuchet MS", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('🏆 PRESTASI BARU', 400, margin + 8);

    // 4. MENGGAMBAR FOTO PROFIL (AVATAR) USER DENGAN GLOW
    const avatarX = 170;
    const avatarY = 200;
    const avatarRadius = 85;

    // Efek Glow (Pendaran) di belakang Avatar
    ctx.save();
    ctx.shadowColor = '#00ffcc'; // Glow warna Cyan/Neon Green
    ctx.shadowBlur = 30;
    fillRoundRect(ctx, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2, avatarRadius, '#fff'); // Ring glow putih
    ctx.restore();

    // Load Avatar Discord
    const avatarURL = user.displayAvatarURL({ extension: 'png', size: 256 });
    const avatarImg = await loadImage(avatarURL);

    // Memotong kanvas bulat untuk avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatarImg, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
    ctx.restore();

    // Ring Bingkai Bulat (Putih di dalam, Emas di luar)
    ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
    ctx.lineWidth = 6; ctx.strokeStyle = '#ffffff'; ctx.stroke(); // Putih dalam
    
    ctx.beginPath(); ctx.arc(avatarX, avatarY, avatarRadius + 3, 0, Math.PI * 2, true);
    ctx.lineWidth = 2; ctx.strokeStyle = '#f1c40f'; ctx.stroke(); // Emas luar

    // 5. DEKORASI PARTICLES SPARKLES (BINTANG PIXEL)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'; // Putih transparan
    const particles = [
        [320, 90, 4], [350, 75, 2], [650, 110, 5], [710, 85, 3], [330, 310, 3], [600, 330, 4],
        [740, 320, 2], [700, 350, 4], [300, 200, 2], [680, 210, 3]
    ];
    particles.forEach(([px, py, ps]) => {
        // Pixel Sparkle (Kotak Kecil)
        ctx.fillRect(px, py, ps, ps);
        // Sparkle silang kecil
        ctx.fillRect(px - ps/2, py + ps/2, ps * 2, ps / 2);
        ctx.fillRect(px + ps/2, py - ps/2, ps / 2, ps * 2);
    });

    // 6. MENGGAMBAR TEKS LEVEL UP YANG RAMAI DAN STYLIZED
    ctx.shadowColor = 'rgba(0, 0, 0, 1)'; // Bayangan hitam pekat
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;
    ctx.textAlign = 'left';

    // Teks "LEVEL UP!" - Sangat Besar, Gradasi, Stroke
    ctx.font = 'bold 90px "Arial Black", sans-serif'; 
    
    // Membuat Gradasi Warna Emas
    const textGradient = ctx.createLinearGradient(320, 120, 320, 60);
    textGradient.addColorStop(0, '#d4af37'); // Emas gelap di bawah
    textGradient.addColorStop(0.5, '#f1c40f'); // Emas terang di tengah
    textGradient.addColorStop(1, '#fffde0'); // Kuning pucat di atas

    // Stroke (Garis Tepi) Teks 
    ctx.strokeStyle = '#000'; // Garis tepi hitam tebal
    ctx.lineWidth = 10;
    ctx.strokeText('LEVEL UP!', 310, 130);
    
    // Isi dengan Gradasi
    ctx.fillStyle = textGradient;
    ctx.fillText('LEVEL UP!', 310, 130);

    // Teks Nama User - Putih bersih Besar
    ctx.shadowBlur = 15;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 55px "Trebuchet MS", sans-serif';
    
    // Potong nama jika terlalu panjang agar tidak keluar batas dan berantakan
    let displayName = user.username;
    if (displayName.length > 13) displayName = displayName.substring(0, 12) + '...';
    ctx.fillText(displayName, 310, 205);

    // Dekorasi Penanda Garis Neon Kecil di bawah nama
    fillRoundRect(ctx, 310, 230, 200, 8, 4, '#00ffcc');

    // Teks "MENCAPAI"
    ctx.fillStyle = '#00ffcc'; // Warna neon cyan
    ctx.font = 'bold 50px "Trebuchet MS", sans-serif';
    ctx.fillText(`MENCAPAI`, 310, 280);
    
    // Angka Level Baru (Dibuat sangat mencolok di sebelah kanan)
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 70px "Arial Black", sans-serif';
    
    // Tambah Bayangan Hijau/Cyan di belakang angka level
    ctx.shadowColor = '#00ffcc'; 
    ctx.shadowBlur = 20; 
    ctx.fillText(newLevel, 570, 285); 
    ctx.shadowBlur = 0; // Reset glow agar teks bawahnya tidak ikut menyala terlalu terang

    // Teks Sorak
    ctx.fillStyle = '#00ffcc'; 
    ctx.font = 'bold 20px "Trebuchet MS", sans-serif';
    ctx.fillText(`MANTAP! 🎉`, 310, 310);

    // 7. PROGRESS BAR GIMMICK (Dekorasi tambahan di Bagian Bawah)
    const pBarX = 310;
    const pBarY = 340;
    const pBarW = 430;
    const pBarH = 15;
    
    // Background bar transparan
    fillRoundRect(ctx, pBarX, pBarY, pBarW, pBarH, 5, 'rgba(255, 255, 255, 0.1)');
    
    // Isi bar (Penuh 100% bercahaya sebagai Gimmick Level Up)
    ctx.shadowColor = '#00ffcc'; 
    ctx.shadowBlur = 15;
    fillRoundRect(ctx, pBarX, pBarY, pBarW, pBarH, 5, '#00ffcc');
    ctx.shadowBlur = 0; // Reset glow

    // Mengubah gambar menjadi Buffer dan mereturn sebagai Attachment Discord
    return new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'levelup-naura-ornate.png' });
  }
}

module.exports = { CanvasUtils };
