const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const Canvas = require('canvas');
const GuildSettings = require('../models/GuildSettings');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        if (member.user.bot) return;

        // Mencari pengaturan channel di database, jika gagal / tidak ada gunakan default
        let welcomeChannelId = null;
        try {
            const settings = await GuildSettings.findOne({ where: { guildId: member.guild.id } });
            if (settings && settings.settings && settings.settings.announcementChannel) {
                welcomeChannelId = settings.settings.announcementChannel;
            }
        } catch (e) {
            // ID Channel Cadangan jika database bermasalah
            welcomeChannelId = '123456789012345678'; 
        }

        if (!welcomeChannelId) return;

        const channel = member.guild.channels.cache.get(welcomeChannelId);
        if (!channel) return; 

        try {
            // ==========================================
            // 🎨 PEMBUATAN KANVAS (TEMA: PINK PASTEL FUTURISTIK)
            // ==========================================
            const canvas = Canvas.createCanvas(1024, 450);
            const ctx = canvas.getContext('2d');

            // 1. Background (Gradient Pink Pastel ke Cyberpunk Dark Blue)
            const gradient = ctx.createLinearGradient(0, 0, 1024, 450);
            gradient.addColorStop(0, '#FFB6C1'); // Light Pink Pastel
            gradient.addColorStop(0.5, '#FF69B4'); // Hot Pink
            gradient.addColorStop(1, '#1A1A2E'); // Dark Futuristic Blue/Black
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Pola Garis Futuristik (Neon Grid Tipis)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 1024; i += 50) {
                ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 450); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
            }

            // 3. Efek Glow (Shadow) pada Avatar
            const avatarX = 512;
            const avatarY = 180;
            const avatarRadius = 100;

            ctx.shadowColor = '#FFFFFF';
            ctx.shadowBlur = 20;
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius + 5, 0, Math.PI * 2, true);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.shadowBlur = 0; // Reset shadow untuk elemen berikutnya

            // 4. Memotong & Memasukkan Avatar User (Bulat)
            ctx.save();
            ctx.beginPath();
            ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
            ctx.closePath();
            ctx.clip();

            const avatar = await Canvas.loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
            ctx.drawImage(avatar, avatarX - avatarRadius, avatarY - avatarRadius, avatarRadius * 2, avatarRadius * 2);
            ctx.restore();

            // 5. Tipografi Modern & Bersih
            ctx.fillStyle = '#FFFFFF';
            ctx.textAlign = 'center';
            
            ctx.font = 'bold 50px sans-serif'; 
            ctx.fillText(`WELCOME TO THE SERVER`, 512, 350);
            
            // Nama dengan warna aksen menonjol
            ctx.font = 'bold 40px sans-serif';
            ctx.fillStyle = '#FFD700'; // Warna Emas/Kuning
            ctx.fillText(member.user.username.toUpperCase(), 512, 400);

            // Statistik Member
            ctx.font = '25px sans-serif';
            ctx.fillStyle = '#E0E0E0';
            ctx.fillText(`Member #${member.guild.memberCount}`, 512, 435);

            // Bungkus dalam AttachmentBuilder Discord
            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: `welcome-${member.user.id}.png` });

            // ==========================================
            // ✉️ PENGIRIMAN PESAN
            // ==========================================
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#FFB6C1')
                .setTitle(`Halo, ${member.user.username}! ✨`)
                .setDescription(`Selamat datang di **${member.guild.name}**!\nAku Naura Versi 1.0.0, asisten yang dikembangkan oleh Developer Aryan.\n\nJangan lupa baca peraturan server dan selamat bersenang-senang!`)
                .setImage(`attachment://welcome-${member.user.id}.png`)
                .setFooter({ text: 'Sistem Keamanan & Penyambutan Naura' });

            await channel.send({ content: `<@${member.user.id}>`, embeds: [welcomeEmbed], files: [attachment] });

        } catch (error) {
            console.error('\x1b[31m[GFX ERROR]\x1b[0m Gagal membuat Welcome Image:', error);
        }
    },
};
