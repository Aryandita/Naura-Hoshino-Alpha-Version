const { AttachmentBuilder } = require('discord.js');
const imageManager = require('../managers/imageManager');
const ui = require('../config/ui');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member, client) {
        // ⚠️ PENTING: Ganti deretan angka di bawah dengan ID Channel "Welcome" di servermu!
        const welcomeChannelId = '123456789012345678'; 
        
        const channel = member.guild.channels.cache.get(welcomeChannelId);

        // Jika channel tidak ditemukan (ID salah atau channel dihapus), hentikan proses
        if (!channel) return; 

        try {
            // Memanggil mesin pelukis untuk menggambar banner
            const welcomeBuffer = await imageManager.generateWelcomeImage(member);
            const attachment = new AttachmentBuilder(welcomeBuffer, { name: `welcome-${member.user.id}.png` });

            // Pesan teks yang menemani gambar
            const welcomeMsg = `✨ Selamat datang di **${member.guild.name}**, <@${member.user.id}>! ✨\nJangan lupa baca rules dan bersenang-senang ya!`;

            // Kirim pesan + gambar ke channel welcome
            await channel.send({ content: welcomeMsg, files: [attachment] });

        } catch (error) {
            console.error('\x1b[31m[GFX ERROR]\x1b[0m Gagal membuat Welcome Image:', error);
        }
    },
};