const { createCanvas, loadImage, registerFont } = require('canvas');
const axios = require('axios');
const path = require('path');

// ==========================================
// 🎨 KONFIGURASI DESAIN
// ==========================================
const CARD_WIDTH = 934;
const CARD_HEIGHT = 282;
const COLOR_GOLD = '#FFD700'; // Emas Premium
const COLOR_TEXT_MAIN = '#FFFFFF'; // Putih Murni
const COLOR_TEXT_SUB = '#C0C0C0'; // Perak/Abu terang
// Path ke gambar tekstur background Anda. SESUAIKAN JIKA PERLU.
const BG_TEXTUR_PATH = path.join(__dirname, '../../assets/bg_rank.png');

// (Opsional) Daftarkan font custom jika Anda punya
// registerFont(path.join(__dirname, '../assets/fonts/Poppins-Bold.ttf'), { family: 'PoppinsBold' });
const FONT_MAIN = 'sans-serif'; // Ganti dengan 'PoppinsBold' jika ada

/**
 * Fungsi untuk menggambar Progress Bar dengan sudut melengkung (Rounded)
 */
function drawRoundedProgressBar(ctx, x, y, width, height, radius, percentage, color) {
    // Bagian Belakang (Background Bar)
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; // Bar kosong transparan
    ctx.fill();

    // Bagian Isi (Progress) - Emas Berkilau
    if (percentage > 0) {
        const progressWidth = (width * percentage) / 100;
        if (progressWidth < radius * 2) return; 

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + progressWidth - radius, y);
        ctx.quadraticCurveTo(x + progressWidth, y, x + progressWidth, y + radius);
        ctx.lineTo(x + progressWidth, y + height - radius);
        ctx.quadraticCurveTo(x + progressWidth, y + height, x + progressWidth - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        
        // Gunakan Gradasi untuk efek emas berkilau pada bar
        const barGradient = ctx.createLinearGradient(x, y, x + progressWidth, y);
        barGradient.addColorStop(0, '#B8860B'); // Dark Goldenrod
        barGradient.addColorStop(0.5, COLOR_GOLD); // Gold
        barGradient.addColorStop(1, '#FFEC8B'); // Light Goldenrod
        
        ctx.fillStyle = barGradient;
        ctx.fill();
        
        // Tambahkan efek glow tipis pada bar
        ctx.shadowColor = COLOR_GOLD;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0; // Matikan shadow untuk objek lain
    }
}

/**
 * FUNGSI UTAMA: Membuat Gambar Rank Card Mewah dengan Tekstur
 */
async function generateRankCard(user, level, currentXp, requiredXp, rank, roleBadge) {
    // 1. Inisialisasi Canvas
    const canvas = createCanvas(CARD_WIDTH, CARD_HEIGHT);
    const ctx = canvas.getContext('2d');

    // ==========================================
    // 🖼️ 2. MEMUAT & MENGGAMBAR TEXTURE BACKGROUND
    // ==========================================
    try {
        const backgroundImg = await loadImage(BG_TEXTUR_PATH);
        // Gambar background memenuhi canvas
        ctx.drawImage(backgroundImg, 0, 0, CARD_WIDTH, CARD_HEIGHT);
        
        // ✨ TAMBAHKAN OVERLAY GELAP (PENTING!)
        // Ini memastikan teks tetap terbaca, apa pun teksturnya.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; // Hitam transparan 50%
        ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
        
        // Tambahkan gradasi radial gelap di pinggir untuk fokus ke tengah
        const radialGradient = ctx.createRadialGradient(CARD_WIDTH/2, CARD_HEIGHT/2, 100, CARD_WIDTH/2, CARD_HEIGHT/2, 600);
        radialGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
        radialGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

    } catch (error) {
        console.error('❌ Gagal memuat tekstur background:', error);
        // Fallback ke warna solid jika gambar tidak ditemukan
        ctx.fillStyle = '#101010';
        ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);
    }


    // 3. Mengambil dan Menggambar Avatar (Lingkaran dengan Border Mewah)
    try {
        const avatarUrl = user.displayAvatarURL({ extension: 'png', size: 256 });
        const response = await axios.get(avatarUrl, { responseType: 'arraybuffer' });
        const avatarImg = await loadImage(Buffer.from(response.data));

        const avatarX = 60;
        const avatarY = (CARD_HEIGHT / 2) - 80;
        const avatarSize = 160;

        ctx.save(); 
        ctx.beginPath();
        ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip(); 

        ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore(); 

        // Border Emas Mewah dengan efek Glow
        ctx.save();
        ctx.strokeStyle = COLOR_GOLD;
        ctx.lineWidth = 6;
        ctx.shadowColor = COLOR_GOLD;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(avatarX + (avatarSize / 2), avatarY + (avatarSize / 2), (avatarSize / 2) + 3, 0, Math.PI * 2, true);
        ctx.stroke();
        ctx.restore();

    } catch (error) {
        console.error('Gagal memuat avatar:', error);
        ctx.fillStyle = '#555';
        ctx.fillRect(60, (CARD_HEIGHT / 2) - 80, 160, 160);
    }

    // 4. Menggambar Teks Data (Nama, Gelar, Level, Rank)
    
    // Nama User & Gelar
    ctx.fillStyle = COLOR_TEXT_MAIN;
    ctx.textAlign = 'left';
    ctx.font = `bold 42px ${FONT_MAIN}`;
    // Tambahkan shadow tipis pada teks agar lebih 'pop'
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 5;
    ctx.fillText(user.username.toUpperCase(), 270, 95);

    ctx.fillStyle = COLOR_GOLD;
    ctx.font = `italic 24px ${FONT_MAIN}`;
    ctx.fillText(roleBadge, 270, 130);
    ctx.shadowBlur = 0; // Matikan shadow


    // Data Peringkat & Level (Pojok Kanan Atas, Teks besar)
    ctx.textAlign = 'right';
    
    // RANK
    ctx.fillStyle = COLOR_TEXT_SUB;
    ctx.font = `26px ${FONT_MAIN}`;
    ctx.fillText('PENGUASA', CARD_WIDTH - 60, 60);
    ctx.fillStyle = COLOR_GOLD;
    ctx.font = `bold 65px ${FONT_MAIN}`;
    ctx.fillText(`#${rank}`, CARD_WIDTH - 60, 115);

    // LEVEL
    ctx.fillStyle = COLOR_TEXT_SUB;
    ctx.font = `26px ${FONT_MAIN}`;
    ctx.fillText('TINGKAT', CARD_WIDTH - 190, 60);
    ctx.fillStyle = COLOR_TEXT_MAIN;
    ctx.font = `bold 65px ${FONT_MAIN}`;
    ctx.fillText(`${level}`, CARD_WIDTH - 190, 115);


    // 5. Menggambar Progress Bar XP (Emas Berkualitas)
    ctx.textAlign = 'left';
    const barX = 270;
    const barY = 185;
    const barWidth = 600;
    const barHeight = 38;
    // Hitung persentase XP di level saat ini
    const percentage = Math.min(100, Math.max(0, (currentXp / requiredXp) * 100));

    drawRoundedProgressBar(ctx, barX, barY, barWidth, barHeight, 19, percentage, COLOR_GOLD);

    // Teks XP & Persentase (Dibawah Bar, Perak)
    ctx.fillStyle = COLOR_TEXT_SUB;
    ctx.font = `22px ${FONT_MAIN}`;
	const xpText = `${Math.floor(currentXp).toLocaleString()} / ${Math.floor(requiredXp).toLocaleString()} KEKUATAN`;
    ctx.fillText(xpText, barX, barY + barHeight + 28);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLOR_GOLD;
    ctx.font = `bold 22px ${FONT_MAIN}`;
    ctx.fillText(`${Math.floor(percentage)}%`, barX + barWidth, barY + barHeight + 28);


    // 6. Mengubah Canvas menjadi Buffer (Data Gambar)
    return canvas.toBuffer('image/png');
}

module.exports = { generateRankCard };