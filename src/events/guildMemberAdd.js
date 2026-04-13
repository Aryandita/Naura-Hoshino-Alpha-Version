const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const GuildSettings = require('../models/GuildSettings');
const env = require('../config/env');

// Register custom font jika Anda punya (Opsional)
// Canvas.registerFont('./assets/fonts/Futuristic.ttf', { family: 'Futuristic' });

module.exports = async (client, member) => {
    if (member.user.bot) return;

    // Ambil pengaturan channel welcome dari database
    const settings = await GuildSettings.findOne({ where: { guildId: member.guild.id } });
    if (!settings || !settings.settings || !settings.settings.announcementChannel) return;

    const welcomeChannel = member.guild.channels.cache.get(settings.settings.announcementChannel);
    if (!welcomeChannel) return;

    try {
        // ==========================================
        // 🎨 PEMBUATAN GAMBAR CANVAS (TEMA: FUTURISTIC PINK PASTEL)
        // ==========================================
        const canvas = Canvas.createCanvas(1024, 450);
        const ctx = canvas.getContext('2d');

        // 1. Background (Gradient Pink Pastel ke Cyberpunk Dark)
        const gradient = ctx.createLinearGradient(0, 0, 1024, 450);
        gradient.addColorStop(0, '#FFB6C1'); // Light Pink Pastel
        gradient.addColorStop(0.5, '#FF69B4'); // Hot Pink
        gradient.addColorStop(1, '#1A1A2E'); // Dark Futuristic Blue/Black
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Tambahkan pola grid/garis futuristik tipis
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 1024; i += 50) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 450); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
        }

        // 2. Lingkaran untuk Avatar User
        const avatarX = 512;
        const avatarY = 180;
        const avatarRadius = 100;

        // Efek Glow / Shadow pada Avatar
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2, true);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
        ctx.shadowBlur = 0; // Reset shadow

        // 3. Masukkan Avatar User
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();

        const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
        ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
        ctx.restore();

        // 4. Teks Welcome (Estetika Modern)
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        
        // Teks UTAMA
        ctx.font = 'bold 50px sans-serif'; // Gunakan font futuristik jika sudah di-register
        ctx.fillText(`WELCOME TO THE SERVER`, 512, 350);
        
        // Teks NAMA USER
        ctx.font = 'bold 40px sans-serif';
        ctx.fillStyle = '#FFD700'; // Warna emas agar mencolok
        ctx.fillText(member.user.username.toUpperCase(), 512, 400);

        // Teks INFO MEMBER KE-
        ctx.font = '25px sans-serif';
        ctx.fillStyle = '#E0E0E0';
        ctx.fillText(`Member #${member.guild.memberCount}`, 512, 435);

        // Jadikan Buffer Attachment
        const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'welcome-image.png' });

        // ==========================================
        // ✉️ PENGIRIMAN PESAN
        // ==========================================
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#FFB6C1')
            .setTitle(`Halo, ${member.user.username}! ✨`)
            .setDescription(`Selamat datang di **${member.guild.name}**!\nAku Naura Versi 1.0.0, sistem yang dikembangkan oleh Developer Aryan.\n\nJangan lupa baca peraturan server dan selamat bersenang-senang!`)
            .setImage('attachment://welcome-image.png')
            .setFooter({ text: 'Sistem Keamanan & Penyambutan Naura' });

        await welcomeChannel.send({ content: `<@${member.user.id}>`, embeds: [welcomeEmbed], files: [attachment] });

    } catch (error) {
        console.error('Gagal membuat gambar welcome:', error);
    }
};
