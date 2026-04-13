const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const axios = require('axios');
const path = require('path');

// --- Konfigurasi UI Naura (Ambil dari gambar contoh) ---
const UI_COLORS = {
    background: '#0a0d14', // Sangat gelap, mendekati hitam
    card: '#0c111c',       // Sedikit lebih terang untuk kartu
    primary: '#00D9FF',    // Cyan biru terang untuk aksen
    secondary: '#1a243d',  // Biru gelap untuk progress bar kosong
    textMain: '#ffffff',   // Putih untuk teks utama
    textSub: '#8e98b0'     // Abu-abu kebiruan untuk teks sub
};

// Fungsi utilitas untuk memformat durasi ms ke teks (2 Jam 45 Menit)
const formatDur = (ms) => {
    if (!ms || ms === 0) return '0 Menit';
    const totalSeconds = Number(ms) / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) return `${hours} J ${minutes} M`;
    return `${minutes} Menit`;
};

// Fungsi utilitas untuk menggambar lingkaran bulat dengan gambar/avatar
const drawCircularImage = (ctx, img, x, y, radius, borderColor) => {
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    
    ctx.fillStyle = UI_COLORS.card;
    ctx.fill();
    ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
    
    if (borderColor) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 2, 0, Math.PI * 2, true);
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 4;
        ctx.stroke();
    }
    
    ctx.restore();
};

// Fungsi utilitas untuk menggambar Arc Progress Bar (Melingkar)
const drawArcProgressBar = (ctx, x, y, radius, current, total, color, width) => {
    if (!total || total === 0) return;
    const percentage = Math.min(1, current / total);
    
    ctx.save();
    // Mengubah titik awal arc agar dari atas (12:00)
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    
    // Gambar background arc kosong
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
    ctx.strokeStyle = UI_COLORS.secondary;
    ctx.lineWidth = width;
    ctx.stroke();
    
    // Gambar arc progress yang terisi
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2 * percentage, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.restore();
};

// ==========================================
// 🎵 FUNGSI 1: MEMBUAT KARTU MUSIC PROFILE
// ==========================================
async function generateMusicProfileImage(user, stats, clientAvatar) {
    const canvas = createCanvas(600, 400); // Ukuran kartu profesional
    const ctx = canvas.getContext('2d');
    
    // 1. Gambar Background Kartu Gelap
    ctx.fillStyle = UI_COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Gambar User Avatar Bulat dengan Border Cyan (Di Kiri Atas)
    const userAvatarImg = await loadImage(user.displayAvatarURL({ extension: 'png' }));
    drawCircularImage(ctx, userAvatarImg, 100, 100, 70, UI_COLORS.primary);
    
    // 3. Teks Judul Utama (Di Kanan Avatar)
    ctx.fillStyle = UI_COLORS.primary;
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText(`Audio Profile: ${user.username}`, 200, 80);
    
    // Teks Sub Judul (Profesional, Keep it simple)
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '16px sans-serif';
    ctx.fillText('Catatan riwayat pemutaran musik melalui Naura Hoshino Intelligence.', 200, 110);
    
    // 4. Garis Pembatas Sederhana
    ctx.strokeStyle = UI_COLORS.secondary;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(30, 190);
    ctx.lineTo(570, 190);
    ctx.stroke();
    
    // 5. Kotak-kotak Data Statistik
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '18px sans-serif';
    ctx.fillText('Total Trek', 50, 230);
    ctx.fillText('Total Durasi', 250, 230);
    
    ctx.fillStyle = UI_COLORS.textMain;
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`${stats.tracksListened || 0} Lagu`, 50, 270);
    ctx.fillText(`${formatDur(stats.totalDurationMs)}`, 250, 270);
    
    // Data Terakhir Diputar (Di bagian bawah, profesional)
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '18px sans-serif';
    ctx.fillText('Terakhir Diputar', 50, 320);
    
    ctx.fillStyle = UI_COLORS.textMain;
    ctx.font = '20px sans-serif';
    ctx.fillText(stats.lastListened || 'Belum ada data musik.', 50, 355);
    
    // 6. Footer Branding Naura (Di Kanan Bawah, Circular Logo + Text)
    const nauraLogoImg = await loadImage(clientAvatar);
    drawCircularImage(ctx, nauraLogoImg, 550, 350, 30);
    
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Naura Audio Intelligence', 500, 355);
    
    return canvas.toBuffer('image/png');
}

// ==========================================
// 🎧 FUNGSI 2: MEMBUAT KARTU MUSIC PANEL
// ==========================================
async function generateMusicPanelImage(track, currentPos, clientAvatar) {
    const canvas = createCanvas(600, 280); // Ukuran panel simetris
    const ctx = canvas.getContext('2d');
    
    // 1. Gambar Background Panel Gelap
    ctx.fillStyle = UI_COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. Gambar Track Thumbnail Melingkar dengan Border Cyan (Di Kiri)
    // Gunakan axios untuk ambil gambar Youtube thumbnail ke Buffer
    const response = await axios.get(track.info.image, { responseType: 'arraybuffer' });
    const trackThumbImg = await loadImage(Buffer.from(response.data));
    drawCircularImage(ctx, trackThumbImg, 120, 140, 90, UI_COLORS.primary);
    
    // 3. Teks Judul & Author (Di Kanan Thumbnail)
    ctx.fillStyle = UI_COLORS.primary;
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText(track.info.title.substring(0, 35), 240, 100);
    
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '18px sans-serif';
    ctx.fillText(track.info.author.substring(0, 30), 240, 130);
    
    // 4. Arc Progress Bar Melingkar (Di Kanan, mengelilingi HOSHINO)
    drawArcProgressBar(ctx, 480, 140, 70, currentPos, track.info.length, UI_COLORS.primary, 8);
    
    // 5. Teks HOSHINO Branding (Di tengah Arc, seperti di gambar)
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOSHINO', 480, 145);
    
    // Teks Waktu (Di bawah Arc)
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '14px sans-serif';
    ctx.fillText(formatDur(currentPos), 430, 230);
    ctx.fillText(formatDur(track.info.length), 530, 230);
    
    // 6. Header Naura branding
    ctx.fillStyle = UI_COLORS.primary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Naura Audio System', 20, 30);
    
    return canvas.toBuffer('image/png');
}

module.exports = { generateMusicProfileImage, generateMusicPanelImage };
