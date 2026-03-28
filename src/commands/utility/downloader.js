const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const youtubedl = require('youtube-dl-exec');
const ui = require('../../config/ui');
const { logError } = require('../../managers/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('downloader')
        .setDescription('📥 Unduh video dari TikTok, Instagram, Twitter/X, dll tanpa API Key.')
        .addStringOption(opt => 
            opt.setName('url')
                .setDescription('Masukkan link video (TikTok/IG/Twitter)')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Beri tahu Discord bahwa Naura butuh waktu untuk mengekstrak video (bisa lebih dari 3 detik)
        await interaction.deferReply(); 

        const url = interaction.options.getString('url');

        // Validasi URL dasar
        if (!url.startsWith('http')) {
            return interaction.editReply(`${ui.emojis.error} URL tidak valid! Harap masukkan link yang benar diawali http/https.`);
        }

        try {
            // ==========================================
            // 🚀 MESIN YT-DLP LOKAL (Tanpa API Key)
            // ==========================================
            // Kita meminta yt-dlp untuk mengambil "Direct URL" videonya tanpa mendownloadnya ke hard disk server
            const output = await youtubedl(url, {
                dumpSingleJson: true,
                noWarnings: true,
                noCallHome: true,
                noCheckCertificate: true,
                preferFreeFormats: true,
                youtubeSkipDashManifest: true,
            });

            // Ekstrak data dari hasil json
            const title = output.title || 'Video Tanpa Judul';
            const uploader = output.uploader || output.extractor || 'Unknown';
            // Output URL biasanya berisi direct link mp4 yang bisa diputar langsung oleh Discord
            const videoUrl = output.url; 

            if (!videoUrl) {
                return interaction.editReply(`${ui.emojis.error} Gagal mendapatkan link video. Postingan mungkin di-private.`);
            }

            const embed = new EmbedBuilder()
                .setColor(ui.colors.primary)
                .setTitle(`📥 Berhasil Mengekstrak Video!`)
                .setDescription(`**Judul:** ${title}\n**Sumber:** ${uploader}`)
                .setURL(url)
                .setFooter({ text: 'Naura Local Downloader Engine' })
                .setTimestamp();

            // Kirim pesan beserta file video
            // Discord akan otomatis mengunduh videoUrl ini menjadi file mp4 di dalam chat
            await interaction.editReply({ 
                content: `${ui.emojis.success} Proses ekstraksi selesai!`, 
                embeds: [embed],
                files: [videoUrl] 
            });

        } catch (error) {
            logError('Local Downloader Error', error);
            
            // Tangkap error jika video terlalu besar untuk Discord (Limit bot gratis = 25MB)
            if (error.message && error.message.includes('413')) {
                return interaction.editReply(`${ui.emojis.error} Ukuran video terlalu besar untuk dikirim ke Discord!`);
            }

            await interaction.editReply(`${ui.emojis.error} Gagal memproses video. Pastikan link publik dan didukung oleh sistem.`);
        }
    }
};