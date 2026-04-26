const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const axios = require('axios');
const path = require('path');

const UI_COLORS = {
    background: '#0a0d14', 
    card: '#0c111c',       
    primary: '#00D9FF',    
    secondary: '#1a243d',  
    textMain: '#ffffff',   
    textSub: '#8e98b0'     
};

const formatDur = (ms) => {
    if (!ms || ms === 0) return '0 Menit';
    const totalSeconds = Number(ms) / 1000;
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) return `${hours} J ${minutes} M`;
    return `${minutes} Menit`;
};

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

const drawArcProgressBar = (ctx, x, y, radius, current, total, color, width) => {
    if (!total || total === 0) return;
    const percentage = Math.min(1, current / total);
    
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-Math.PI / 2);
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
    ctx.strokeStyle = UI_COLORS.secondary;
    ctx.lineWidth = width;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2 * percentage, false);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    ctx.restore();
};

// ==========================================
// 🛠️ UTILITY: Auto Word-Wrap Text
// ==========================================
const wrapText = (ctx, text, x, y, maxWidth, lineHeight, maxLines) => {
    const words = text.split(' ');
    let line = '';
    let currentY = y;
    let lineCount = 1;

    for (let n = 0; n < words.length; n++) {
        let testLine = line + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        
        if (metrics.width > maxWidth && n > 0) {
            if (lineCount === maxLines) {
                ctx.fillText(line.trim() + '...', x, currentY);
                return;
            }
            ctx.fillText(line.trim(), x, currentY);
            line = words[n] + ' ';
            currentY += lineHeight;
            lineCount++;
        } else {
            line = testLine;
        }
    }
    if (lineCount <= maxLines) {
        ctx.fillText(line.trim(), x, currentY);
    }
};

async function generateMusicProfileImage(user, stats, clientAvatar) {
    const canvas = createCanvas(1000, 600); 
    const ctx = canvas.getContext('2d');
    
    // Background - Dark Elegant Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#090a0f');
    bgGradient.addColorStop(1, '#111522');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Blur
    ctx.save();
    const blurGlow = ctx.createRadialGradient(200, 200, 50, 200, 200, 400);
    blurGlow.addColorStop(0, 'rgba(0, 217, 255, 0.15)');
    blurGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = blurGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Utility: Draw Rounded Rect
    const fillRoundedRect = (x, y, w, h, r, color) => {
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
        else ctx.rect(x, y, w, h); // fallback
        ctx.fillStyle = color;
        ctx.fill();
    };
    
    // Main Profile Header Card (Top)
    fillRoundedRect(40, 40, 920, 180, 25, 'rgba(255, 255, 255, 0.03)');
    ctx.strokeStyle = 'rgba(0, 217, 255, 0.3)';
    ctx.lineWidth = 1;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(40, 40, 920, 180, 25); ctx.stroke(); }
    
    let userAvatarImg;
    try {
        userAvatarImg = await loadImage(user.displayAvatarURL({ extension: 'png', size: 256 }));
    } catch (e) {
        userAvatarImg = await loadImage(clientAvatar);
    }
    
    drawCircularImage(ctx, userAvatarImg, 130, 130, 65, UI_COLORS.primary);
    
    // Username & Display Name
    ctx.fillStyle = UI_COLORS.textMain;
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText(user.displayName || user.username, 220, 115);
    
    ctx.fillStyle = UI_COLORS.primary;
    ctx.font = '22px sans-serif';
    ctx.fillText(`@${user.username}`, 220, 150);

    // Global Stats (Right side of Header)
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Total Trek', 810, 90);
    ctx.fillText('Total Durasi', 810, 150);
    
    ctx.fillStyle = UI_COLORS.textMain;
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'left'; // Ubah menjadi left agar tidak menabrak label
    ctx.fillText(`${stats.tracksListened || 0}`, 830, 90);
    ctx.fillText(`${formatDur(stats.totalDurationMs)}`, 830, 150);

    // 3 Cards Section
    const cardY = 250;
    const cardW = 286;
    const cardH = 300;
    const gap = 30;

    // Card 1: Top Song
    fillRoundedRect(40, cardY, cardW, cardH, 20, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = UI_COLORS.primary;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Lagu Favorit', 60, cardY + 40); // Hilangkan emoji agar tidak error render kotak
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '15px sans-serif';
    ctx.fillText('Paling sering diputar', 60, cardY + 65);
    
    ctx.fillStyle = UI_COLORS.textMain;
    ctx.font = 'bold 22px sans-serif';
    wrapText(ctx, stats.topSong || 'Belum ada data', 60, cardY + 120, cardW - 40, 30, 3);
    
    // Card 2: Top Server
    fillRoundedRect(40 + cardW + gap, cardY, cardW, cardH, 20, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = '#FFD700'; // Gold
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Server Favorit', 40 + cardW + gap + 20, cardY + 40); // Hilangkan emoji
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '15px sans-serif';
    ctx.fillText('Tempat asik dengerin musik', 40 + cardW + gap + 20, cardY + 65);

    ctx.fillStyle = UI_COLORS.textMain;
    ctx.font = 'bold 24px sans-serif';
    wrapText(ctx, stats.favServer || 'Naura Lounge', 40 + cardW + gap + 20, cardY + 120, cardW - 40, 30, 3);

    // Card 3: Top Friends
    fillRoundedRect(40 + (cardW + gap) * 2, cardY, cardW, cardH, 20, 'rgba(0, 0, 0, 0.4)');
    ctx.fillStyle = '#ff4757'; // Red/Pink
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Top Teman Mabar', 40 + (cardW + gap) * 2 + 20, cardY + 40); // Hilangkan emoji
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '15px sans-serif';
    ctx.fillText('Sering dengerin bareng', 40 + (cardW + gap) * 2 + 20, cardY + 65);

    const friends = stats.topFriends || ['Reza (24 Jam)', 'Anya (12 Jam)', 'Budi (5 Jam)'];
    ctx.fillStyle = UI_COLORS.textMain;
    ctx.font = '18px sans-serif';
    friends.forEach((friend, idx) => {
        ctx.fillText(`${idx + 1}. ${friend}`, 40 + (cardW + gap) * 2 + 20, cardY + 120 + (idx * 40));
    });

    // Footer Watermark
    try {
        const nauraLogoImg = await loadImage(clientAvatar);
        drawCircularImage(ctx, nauraLogoImg, 930, 560, 20);
    } catch(e) {}
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('Naura Audio Intelligence • Prestige Edition', 890, 565);
    
    return canvas.toBuffer('image/png');
}

async function generateMusicPanelImage(track, currentPos, clientAvatar) {
    const canvas = createCanvas(600, 280); 
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = UI_COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // ==========================================
    // 🛡️ SMART FALLBACK URL ENGINE
    // ==========================================
    let trackImageUrl = track.info.image;

    if (!trackImageUrl && track.info.sourceName === 'youtube') {
        trackImageUrl = `https://img.youtube.com/vi/${track.info.identifier}/mqdefault.jpg`;
    }

    if (!trackImageUrl || typeof trackImageUrl !== 'string' || !trackImageUrl.startsWith('http')) {
        trackImageUrl = clientAvatar; 
    }

    let trackThumbImg;
    try {
        const response = await axios.get(trackImageUrl, { responseType: 'arraybuffer', timeout: 5000 });
        trackThumbImg = await loadImage(Buffer.from(response.data));
    } catch (error) {
        console.error(`[Canvas Warning] Gagal memuat thumbnail track, fallback ke Avatar. Info: ${error.message}`);
        trackThumbImg = await loadImage(clientAvatar);
    }
    // ==========================================

    drawCircularImage(ctx, trackThumbImg, 120, 140, 90, UI_COLORS.primary);
    
    // 🎤 TEKS AUTHOR (ARTIS) - Dipindah ke bawah cover
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    // Ditaruh di x=120 (sama dengan center cover) dan y=260 (tepat di bawah border cover)
    ctx.fillText(track.info.author.substring(0, 25), 120, 260); 

    // 🎵 TEKS JUDUL LAGU - Menggunakan Word Wrap (Anti Tabrak)
    ctx.fillStyle = UI_COLORS.primary;
    ctx.font = 'bold 20px sans-serif'; // Diperkecil menjadi 20px agar nyaman untuk multi-line
    ctx.textAlign = 'left';
    // Menjalankan utilitas wrapText dengan lebar maksimum 170px
    // Parameter: (ctx, text, x, y, maxWidth, lineHeight, maxLines)
    wrapText(ctx, track.info.title, 230, 100, 170, 25, 4);
    
    // 🔘 ARC PROGRESS BAR
    drawArcProgressBar(ctx, 480, 140, 70, currentPos, track.info.length, UI_COLORS.primary, 8);
    
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Naura', 480, 145);
    
    ctx.fillStyle = UI_COLORS.textSub;
    ctx.font = '14px sans-serif';
    ctx.fillText(formatDur(currentPos), 430, 230);
    ctx.fillText(formatDur(track.info.length), 530, 230);
    
    ctx.fillStyle = UI_COLORS.primary;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Naura Audio System', 20, 30);
    
    return canvas.toBuffer('image/png');
}

module.exports = { generateMusicProfileImage, generateMusicPanelImage };