/**
 * @namespace: src/utils/Canvas.js
 * @type: Utility
 * @copyright © 2026 Aryandita Praftian
 * @assistant Naura Hoshino
 * @version 1.0.2
 * @description Generator Grafis Canvas Mewah untuk Leveling & Profile Naura.
 */

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');
const ui = require('../config/ui');

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

class CanvasUtils {
    
    // ==========================================
    // 🌟 FUNGSI 1: KARTU NAIK LEVEL (ESTETIK & PROFESIONAL)
    // ==========================================
    static async generateLevel(user, level) {
        const canvas = createCanvas(1024, 400); 
        const ctx = canvas.getContext('2d');

        // Background
        try {
            if (ui.banners && ui.banners.levelUp) {
                const background = await loadImage(ui.banners.levelUp);
                ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
            } else {
                const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                bgGradient.addColorStop(0, '#0f0c29');
                bgGradient.addColorStop(0.5, '#302b63');
                bgGradient.addColorStop(1, '#24243e');
                ctx.fillStyle = bgGradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } catch(e) {
            ctx.fillStyle = '#1a1c23'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        // Glassmorphism Overlay (Center Box)
        ctx.save();
        ctx.fillStyle = 'rgba(20, 20, 30, 0.6)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        ctx.shadowBlur = 30;
        ctx.shadowOffsetY = 10;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(50, 50, 924, 300, 25);
        else ctx.rect(50, 50, 924, 300);
        ctx.fill();
        ctx.restore();

        // Overlay Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(50, 50, 924, 300, 25);
        else ctx.rect(50, 50, 924, 300);
        ctx.stroke();

        // Decorative Glow / Lighting inside
        ctx.save();
        const glowGradient = ctx.createRadialGradient(200, 200, 10, 200, 200, 400);
        glowGradient.addColorStop(0, 'rgba(0, 217, 255, 0.25)');
        glowGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = glowGradient;
        ctx.fillRect(50, 50, 924, 300);
        ctx.restore();

        // Avatar (Glowing)
        const avatarSize = 200;
        const avatarX = 100;
        const avatarY = 100;
        
        await drawAvatar(ctx, user.displayAvatarURL({ extension: 'png', size: 512 }), avatarX, avatarY, avatarSize, '#00d9ff');

        // Typography: "LEVEL UP"
        ctx.fillStyle = '#00d9ff';
        ctx.font = 'bold 35px sans-serif'; 
        ctx.textAlign = 'left';
        ctx.shadowColor = '#00d9ff';
        ctx.shadowBlur = 15;
        ctx.fillText('N E W   A C H I E V E M E N T', 350, 140);
        ctx.shadowBlur = 0;

        // Level Number
        const textGradient = ctx.createLinearGradient(350, 150, 350, 250);
        textGradient.addColorStop(0, '#ffffff');
        textGradient.addColorStop(1, '#a1c4fd');
        ctx.fillStyle = textGradient;
        ctx.font = 'bold 110px sans-serif';
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 5;
        ctx.fillText(`LEVEL ${level}`, 345, 240);
        ctx.shadowBlur = 0;

        // User Tag
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px sans-serif';
        ctx.fillText(`Congratulations, ${user.username}!`, 350, 295);

        // Right side geometric accents
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(850, 80);
        ctx.lineTo(910, 80);
        ctx.lineTo(880, 110);
        ctx.lineTo(820, 110);
        ctx.fillStyle = 'rgba(0, 217, 255, 0.4)';
        ctx.fill();
        ctx.closePath();
        
        ctx.beginPath();
        ctx.moveTo(800, 120);
        ctx.lineTo(880, 120);
        ctx.lineTo(850, 150);
        ctx.lineTo(770, 150);
        ctx.fillStyle = 'rgba(0, 217, 255, 0.2)';
        ctx.fill();
        ctx.closePath();
        ctx.restore();

        return canvas;
    }

    // ==========================================
    // 🏆 FUNGSI 2: KARTU PROFIL RANK (PRESTIGE UI)
    // ==========================================
    static async generateRankCard(user, level, currentXp, requiredXp, rank, roleBadge, isPremium = false) {
        const canvas = createCanvas(934, 282);
        const ctx = canvas.getContext('2d');

        // Premium Theme Colors
        const primaryGlow = isPremium ? '#FFD700' : '#00d9ff';
        const progressColors = isPremium ? ['#FF8C00', '#FFD700'] : ['#0088ff', '#00d9ff'];

        const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        bgGradient.addColorStop(0, '#0c0c14');
        bgGradient.addColorStop(1, '#1b1b2f');
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Decorative Glow
        ctx.save();
        const radial = ctx.createRadialGradient(canvas.width, 0, 10, canvas.width, 0, 600);
        radial.addColorStop(0, isPremium ? 'rgba(255, 215, 0, 0.25)' : 'rgba(0, 217, 255, 0.2)');
        radial.addColorStop(1, 'transparent');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Semi-transparent Overlay
        drawRoundedRect(ctx, 20, 20, 894, 242, 20, 'rgba(255, 255, 255, 0.03)');

        await drawAvatar(ctx, user.displayAvatarURL({ extension: 'png', size: 256 }), 50, 60, 150, primaryGlow);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = `bold 40px sans-serif`;
        ctx.shadowColor = 'black';
        ctx.shadowBlur = 8;
        ctx.fillText(user.username.toUpperCase(), 230, 100);
        ctx.shadowBlur = 0;

        ctx.fillStyle = primaryGlow;
        ctx.font = `italic 22px sans-serif`;
        ctx.fillText(roleBadge || 'Member', 230, 135);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#8e98b0';
        ctx.font = `22px sans-serif`;
        ctx.fillText('RANK', canvas.width - 60, 60);
        ctx.fillStyle = primaryGlow;
        ctx.font = `bold 55px sans-serif`;
        ctx.fillText(`${rank}`, canvas.width - 60, 110);

        // Ubah LEVEL menjadi rata kiri dengan padding agar tidak menabrak
        ctx.textAlign = 'left';
        ctx.fillStyle = '#8e98b0';
        ctx.font = `22px sans-serif`;
        ctx.fillText('LEVEL', canvas.width - 240, 60);
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold 55px sans-serif`;
        ctx.fillText(`${level}`, canvas.width - 240, 110);

        ctx.textAlign = 'left';
        const percentage = Math.min(100, Math.max(0, (currentXp / requiredXp) * 100));
        drawRoundedProgressBar(ctx, 230, 175, 640, 30, 15, percentage, progressColors);

        ctx.fillStyle = '#8e98b0';
        ctx.font = `18px sans-serif`;
        ctx.fillText(`${Math.floor(currentXp).toLocaleString()} / ${Math.floor(requiredXp).toLocaleString()} XP`, 230, 230);

        ctx.textAlign = 'right';
        ctx.fillStyle = primaryGlow;
        ctx.font = `bold 18px sans-serif`;
        ctx.fillText(`${Math.floor(percentage)}%`, 870, 230);

        return canvas;
    }

    // ==========================================
    // 💎 FUNGSI 3: KARTU PREMIUM INFO (PROMO & STATUS)
    // ==========================================
    static async generatePremiumInfoCard(user, isPremium, daysLeft) {
        const canvas = createCanvas(800, 250);
        const ctx = canvas.getContext('2d');

        // Background
        const bgGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        if (isPremium) {
            bgGradient.addColorStop(0, '#1c1500');
            bgGradient.addColorStop(1, '#332600');
        } else {
            bgGradient.addColorStop(0, '#0c0c14');
            bgGradient.addColorStop(1, '#1b1b2f');
        }
        ctx.fillStyle = bgGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Glow
        ctx.save();
        const radial = ctx.createRadialGradient(canvas.width/2, 0, 10, canvas.width/2, 0, 600);
        radial.addColorStop(0, isPremium ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 217, 255, 0.15)');
        radial.addColorStop(1, 'transparent');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();

        // Panel Overlay
        drawRoundedRect(ctx, 20, 20, 760, 210, 20, 'rgba(255, 255, 255, 0.05)');

        // Avatar
        const primaryColor = isPremium ? '#FFD700' : '#8e98b0';
        await drawAvatar(ctx, user.displayAvatarURL({ extension: 'png', size: 256 }), 50, 50, 150, primaryColor);

        // Text Username
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.font = `bold 40px sans-serif`;
        ctx.fillText(user.username.toUpperCase(), 230, 90);

        // Status Tag
        ctx.fillStyle = primaryColor;
        ctx.font = `bold 24px sans-serif`;
        ctx.fillText(isPremium ? 'V.I.P PREMIUM MEMBER' : 'REGULAR MEMBER', 230, 130);

        // Separator
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(230, 150, 500, 2);

        // Info Details
        ctx.fillStyle = '#ffffff';
        ctx.font = `20px sans-serif`;
        if (isPremium) {
            ctx.fillText(`STATUS: ACTIVE`, 230, 190);
            ctx.fillStyle = '#FFD700';
            ctx.fillText(`${daysLeft} Days Remaining`, 230, 215);
        } else {
            ctx.fillText(`STATUS: INACTIVE`, 230, 190);
            ctx.fillStyle = '#00d9ff';
            ctx.fillText(`Unlock exclusive features today!`, 230, 215);
        }

        // Stamp
        ctx.textAlign = 'right';
        ctx.fillStyle = isPremium ? '#FFD700' : '#8e98b0';
        ctx.font = `italic 20px sans-serif`;
        ctx.fillText('NAURA SUBSCRIPTION', 750, 60);

        return canvas;
    }
}

module.exports = { CanvasUtils };
