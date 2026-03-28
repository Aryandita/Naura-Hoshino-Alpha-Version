const { createCanvas, loadImage } = require('canvas');
const ui = require('../config/ui');

// --- KONFIGURASI BACKGROUND ---
const BG_LEVEL_UP = 'https://i.imgur.com/8Qp2D6Y.png'; 
const BG_PROFILE = 'https://i.imgur.com/mO5XGfL.png';  
const BG_WELCOME = 'https://i.imgur.com/mO5XGfL.png'; // Ganti URL ini untuk tema Welcome khusus!

// --- DATABASE GAMBAR LENCANA (SHOP) ---
const BADGES = {
    'katakana': 'https://cdn-icons-png.flaticon.com/512/3389/3389081.png', 
    'mcvip': 'https://cdn-icons-png.flaticon.com/512/875/875525.png',     
    'starlight': 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png' 
};

// Fungsi Bantuan: Membuat avatar bulat
const drawRoundAvatar = async (ctx, url, x, y, size) => {
    try {
        const avatar = await loadImage(url);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x, y, size, size);
        ctx.restore();
    } catch (e) {
        ctx.fillStyle = '#ccc';
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2, true);
        ctx.fill();
    }
};

class ImageManager {
    // ==========================================
    // 1. GENERATE GAMBAR LEVEL UP (900x250)
    // ==========================================
    async generateLevelUpImage(user, newLevel) {
        const canvas = createCanvas(900, 250);
        const ctx = canvas.getContext('2d');
        const background = await loadImage(BG_LEVEL_UP);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);
        
        await drawRoundAvatar(ctx, user.displayAvatarURL({ extension: 'png' }), 50, 50, 150);

        ctx.textAlign = 'left';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText(user.username.toUpperCase(), 230, 90);

        ctx.font = 'bold 60px sans-serif';
        ctx.fillStyle = ui.colors.primary; 
        ctx.fillText(`LEVEL UP! ✨`, 230, 160);

        ctx.font = 'bold 100px sans-serif';
        ctx.fillStyle = ui.colors.economy;
        ctx.textAlign = 'right';
        ctx.fillText(`${newLevel}`, 850, 160);

        ctx.font = '24px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`LEVEL BARU`, 850, 190);

        return canvas.toBuffer();
    }

    // ==========================================
    // 2. GENERATE GAMBAR PROFIL (934x282)
    // ==========================================
    async generateProfileImage(user, level, xp, requiredXp, rank, inventory) {
        const canvas = createCanvas(934, 282);
        const ctx = canvas.getContext('2d');

        const background = await loadImage(BG_PROFILE);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

        await drawRoundAvatar(ctx, user.displayAvatarURL({ extension: 'png' }), 60, 60, 162);

        ctx.textAlign = 'left';

        // Efek VIP: Jika punya item katakana, nama jadi Emas
        const hasKatakana = inventory && inventory.includes('katakana');
        ctx.fillStyle = hasKatakana ? '#FFD700' : '#ffffff';
        ctx.font = 'bold 40px sans-serif';
        ctx.fillText(user.username, 260, 100);

        ctx.font = 'bold 30px sans-serif';
        ctx.fillStyle = ui.colors.tech;
        ctx.fillText(`#${rank}`, 260, 140);

        const barX = 260;
        const barY = 170;
        const barWidth = 600;
        const barHeight = 30;
        const percentage = Math.min(xp / requiredXp, 1);

        ctx.fillStyle = '#444444';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 15);
        ctx.fill();

        ctx.fillStyle = ui.colors.primary;
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth * percentage, barHeight, 15);
        ctx.fill();

        ctx.font = 'bold 20px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(`${xp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`, barX + barWidth / 2, barY + 22);

        ctx.textAlign = 'right';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('LEVEL', 880, 80);

        ctx.font = 'bold 80px sans-serif';
        ctx.fillStyle = ui.colors.economy;
        ctx.fillText(`${level}`, 880, 150);

        // Menggambar lencana dari Shop
        if (inventory && inventory.length > 0) {
            let badgeX = 260;
            const badgeY = 220; 
            const badgeSize = 40;

            for (const item of inventory) {
                if (BADGES[item]) {
                    try {
                        const badgeImg = await loadImage(BADGES[item]);
                        ctx.drawImage(badgeImg, badgeX, badgeY, badgeSize, badgeSize);
                        badgeX += badgeSize + 15; 
                    } catch (e) {
                        console.error('Gagal memuat gambar lencana:', item);
                    }
                }
            }
        }

        return canvas.toBuffer();
    }

    // ==========================================
    // 3. GENERATE GAMBAR WELCOME (1024x450)
    // ==========================================
    async generateWelcomeImage(member) {
        const canvas = createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        const background = await loadImage(BG_WELCOME);
        ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const avatarSize = 200;
        const avatarX = (canvas.width / 2) - (avatarSize / 2);
        const avatarY = 50;
        
        ctx.beginPath();
        ctx.arc(canvas.width / 2, avatarY + (avatarSize / 2), (avatarSize / 2) + 10, 0, Math.PI * 2, true);
        ctx.fillStyle = ui.colors.primary;
        ctx.fill();

        await drawRoundAvatar(ctx, member.user.displayAvatarURL({ extension: 'png', size: 512 }), avatarX, avatarY, avatarSize);

        ctx.textAlign = 'center';

        ctx.font = 'bold 50px sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('W E L C O M E', canvas.width / 2, 320);

        ctx.font = 'bold 65px sans-serif';
        ctx.fillStyle = ui.colors.tech;
        ctx.fillText(member.user.username.toUpperCase(), canvas.width / 2, 390);

        ctx.font = '30px sans-serif';
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`Member #${member.guild.memberCount}`, canvas.width / 2, 430);

        return canvas.toBuffer();
    }
}

module.exports = new ImageManager();