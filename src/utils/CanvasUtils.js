const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
const axios = require('axios');
const path = require('path');

const FONT_MAIN = 'sans-serif'; 

function drawRoundedRect(ctx, x, y, w, h, r, color, glowColor) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
    if (glowColor) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20;
    }
    if (color) {
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.shadowBlur = 0;
}

function drawRoundedProgressBar(ctx, x, y, width, height, radius, percentage, gradientColors) {
    drawRoundedRect(ctx, x, y, width, height, radius, 'rgba(255, 255, 255, 0.05)');
    if (percentage > 0) {
        const progressWidth = (width * percentage) / 100;
        if (progressWidth < radius * 2 && progressWidth > 0) return; 

        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, progressWidth, height, radius);
        else ctx.rect(x, y, progressWidth, height);
        
        const barGradient = ctx.createLinearGradient(x, y, x + progressWidth, y);
        barGradient.addColorStop(0, gradientColors[0]);
        barGradient.addColorStop(1, gradientColors[1]);
        
        ctx.fillStyle = barGradient;
        ctx.shadowColor = gradientColors[1];
        ctx.shadowBlur = 15;
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

async function drawAvatar(ctx, url, x, y, size, glowColor) {
    try {
        let avatarImg;
        try {
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            avatarImg = await loadImage(Buffer.from(response.data));
        } catch {
            avatarImg = await loadImage(url);
        }

        ctx.save(); 
        ctx.beginPath();
        ctx.arc(x + (size / 2), y + (size / 2), size / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip(); 
        ctx.drawImage(avatarImg, x, y, size, size);
        ctx.restore(); 

        ctx.save();
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 4;
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(x + (size / 2), y + (size / 2), (size / 2) + 2, 0, Math.PI * 2, true);
        ctx.stroke();
        ctx.restore();
    } catch (e) {
        drawRoundedRect(ctx, x, y, size, size, size/2, '#333');
    }
}

// ==========================================
// 🏆 RANK CARD (ELEGANT PRESTIGE UI)
// ==========================================
async function generateRankCard(user, level, currentXp, requiredXp, rank, roleBadge) {
    const canvas = createCanvas(934, 282);
    const ctx = canvas.getContext('2d');

    const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGradient.addColorStop(0, '#0c0c14');
    bgGradient.addColorStop(1, '#1b1b2f');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative Glow
    ctx.save();
    const radial = ctx.createRadialGradient(canvas.width, 0, 10, canvas.width, 0, 600);
    radial.addColorStop(0, 'rgba(0, 217, 255, 0.2)');
    radial.addColorStop(1, 'transparent');
    ctx.fillStyle = radial;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Semi-transparent Overlay
    drawRoundedRect(ctx, 20, 20, 894, 242, 20, 'rgba(255, 255, 255, 0.03)');

    await drawAvatar(ctx, user.displayAvatarURL({ extension: 'png', size: 256 }), 50, 60, 150, '#00d9ff');

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = `bold 40px ${FONT_MAIN}`;
    ctx.shadowColor = 'black';
    ctx.shadowBlur = 8;
    ctx.fillText(user.username.toUpperCase(), 230, 100);
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#00d9ff';
    ctx.font = `italic 22px ${FONT_MAIN}`;
    ctx.fillText(roleBadge || 'Member', 230, 135);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#8e98b0';
    ctx.font = `22px ${FONT_MAIN}`;
    ctx.fillText('RANK', canvas.width - 60, 60);
    ctx.fillStyle = '#00d9ff';
    ctx.font = `bold 55px ${FONT_MAIN}`;
    ctx.fillText(`#${rank}`, canvas.width - 60, 110);

    ctx.fillStyle = '#8e98b0';
    ctx.font = `22px ${FONT_MAIN}`;
    ctx.fillText('LEVEL', canvas.width - 180, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 55px ${FONT_MAIN}`;
    ctx.fillText(`${level}`, canvas.width - 180, 110);

    ctx.textAlign = 'left';
    const percentage = Math.min(100, Math.max(0, (currentXp / requiredXp) * 100));
    drawRoundedProgressBar(ctx, 230, 175, 640, 30, 15, percentage, ['#0088ff', '#00d9ff']);

    ctx.fillStyle = '#8e98b0';
    ctx.font = `18px ${FONT_MAIN}`;
    ctx.fillText(`${Math.floor(currentXp).toLocaleString()} / ${Math.floor(requiredXp).toLocaleString()} XP`, 230, 230);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#00d9ff';
    ctx.font = `bold 18px ${FONT_MAIN}`;
    ctx.fillText(`${Math.floor(percentage)}%`, 870, 230);

    return canvas.toBuffer('image/png');
}

// ==========================================
// 💳 BALANCE CARD (NEON CREDIT CARD UI)
// ==========================================
async function generateBalanceCard(user, profile) {
    const canvas = createCanvas(800, 420);
    const ctx = canvas.getContext('2d');

    // Background Gradient (Dark Mode)
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#0a0a0f');
    bg.addColorStop(1, '#111116');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing Orbs in Background
    ctx.save();
    const glow1 = ctx.createRadialGradient(100, 100, 0, 100, 100, 300);
    glow1.addColorStop(0, 'rgba(255, 0, 128, 0.15)');
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const glow2 = ctx.createRadialGradient(700, 300, 0, 700, 300, 300);
    glow2.addColorStop(0, 'rgba(0, 217, 255, 0.15)');
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    // The Credit Card Layer
    ctx.save();
    const cardX = 40, cardY = 40, cardW = 720, cardH = 340;
    
    // Glassmorphism Card
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(cardX, cardY, cardW, cardH, 30);
    else ctx.rect(cardX, cardY, cardW, cardH);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.stroke();

    // Inner Card Gradient (Holographic feel)
    const innerCardGrad = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
    innerCardGrad.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
    innerCardGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
    ctx.fillStyle = innerCardGrad;
    ctx.fill();
    ctx.restore();

    // Naura Economy Chip (Top Left inside card)
    drawRoundedRect(ctx, 80, 80, 60, 40, 10, '#ffd700');
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(90, 80, 2, 40);
    ctx.fillRect(110, 80, 2, 40);
    ctx.fillRect(130, 80, 2, 40);

    // "BANK NAURA" Text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = `bold 24px ${FONT_MAIN}`;
    ctx.textAlign = 'right';
    ctx.fillText('NAURA PLATINUM', 720, 105);
    ctx.font = `16px ${FONT_MAIN}`;
    ctx.fillText('Economy System', 720, 130);

    // Avatar
    await drawAvatar(ctx, user.displayAvatarURL({ extension: 'png', size: 128 }), 620, 180, 100, '#ff0080');

    // Balance Info
    ctx.textAlign = 'left';
    ctx.fillStyle = '#8e98b0';
    ctx.font = `20px ${FONT_MAIN}`;
    ctx.fillText('DOMPET (WALLET)', 80, 180);

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 45px ${FONT_MAIN}`;
    ctx.fillText(`${profile.economy_wallet.toLocaleString()} Koin`, 80, 230);

    ctx.fillStyle = '#8e98b0';
    ctx.font = `18px ${FONT_MAIN}`;
    ctx.fillText('BANK BALANCE', 80, 280);

    ctx.fillStyle = '#00d9ff';
    ctx.font = `bold 28px ${FONT_MAIN}`;
    ctx.fillText(`${profile.economy_bank.toLocaleString()} Koin`, 80, 315);

    // Bottom Footer of Card
    ctx.fillStyle = '#8e98b0';
    ctx.font = `18px ${FONT_MAIN}`;
    ctx.fillText(`CARDHOLDER: ${user.username.toUpperCase()}`, 80, 350);

    ctx.textAlign = 'right';
    ctx.fillText(`TOTAL ITEM: ${profile.inventory.length}`, 720, 350);

    return canvas.toBuffer('image/png');
}

module.exports = { generateRankCard, generateBalanceCard };