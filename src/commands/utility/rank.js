const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
// IMPORT UTILITY GAMBAR
const { generateRankCard } = require('../../utils/CanvasUtils'); 
// IMPORT MODEL DATABASE ASLI ANDA
// Sesuaikan path ini dengan lokasi model database Anda.
const UserProfile = require('../../models/UserProfile'); 

/**
 * Rumus XP yang disesuaikan agar kenaikan level terasa proporsional dan menantang.
 * Contoh: Level 1 butuh 100 XP, Level 10 butuh 11,500 XP, Level 50 butuh 257,500 XP.
 */
const { getXpForLevel } = require('../../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('🌟 Lihat Kartu Profil Eksklusif dinamis kamu!')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Lihat profil milik orang lain')
                .setRequired(false)
        ),

    async execute(interaction) {
        // 1. Tampilkan loading karena query database dan membuat gambar butuh waktu
        await interaction.deferReply();

        const targetUser = interaction.options.getUser('target') || interaction.user;

        // ==========================================
        // 💾 2. PENGAMBILAN DATA NYATA DARI DATABASE
        // ==========================================
        let userData;
        try {
            userData = await UserProfile.findOne({ userId: targetUser.id });
            
            // Logika jika user belum ada di database (belum pernah aktif)
            if (!userData) {
                // Buat profil default sementara agar tidak error
                userData = {
                    leveling: { xp: 0, level: 1 },
                    totalMessages: 0,
                    rank: 'Tidak Terperingkat' // Default jika belum dihitung
                };
            }
        } catch (error) {
            console.error('❌ Gagal mengambil data user:', error);
            return interaction.editReply('❌ Terjadi kesalahan saat mengakses database.');
        }

        // ==========================================
        // 🏆 3. MENGHITUNG PERINGKAT GLOBAL SECARA REAL-TIME
        // ==========================================
        let globalRank = 'N/A';
        try {
            // Kita menghitung peringkat berdasarkan kombinasi Level dan XP.
            // Peringkat 1 adalah yang memiliki level tertinggi dan XP terbanyak.
            const allUsers = await UserProfile.find({})
                .sort({ 'leveling.level': -1, 'leveling.xp': -1 }) // Sort DESC Level, lalu DESC XP
                .select('userId'); // Hanya ambil userId agar query cepat

            // Cari index user target dalam list yang sudah di-sort
            const rankIndex = allUsers.findIndex(u => u.userId === targetUser.id);
            if (rankIndex !== -1) {
                globalRank = rankIndex + 1; // Index dimulai dari 0, jadi tambah 1
            }
        } catch (error) {
            console.error('❌ Gagal menghitung peringkat:', error);
        }


        // Ambil data XP dan Level asli
        const currentXp = userData.leveling.xp;
        const currentLevel = userData.leveling.level;
        // Hitung XP yang dibutuhkan untuk mencapai level *berikutnya*
        // Hapus `const targetXp = xpForLevel(currentLevel);` dan ganti menjadi:
		const targetXp = getXpForLevel(currentLevel);

        // ==========================================
        // 🎭 4. PENENTUAN GELAR (ROLE BADGE) DINAMIS
        // ==========================================
        let roleBadge = '✧ Aristokrat Pemula';
        if (currentLevel >= 100) roleBadge = '✦ Legenda Keabadian ✦';
        else if (currentLevel >= 75) roleBadge = '✦ Penguasa Realm ✦';
        else if (currentLevel >= 50) roleBadge = '✧ Ksatria Elit';
        else if (currentLevel >= 25) roleBadge = '✧ Penjelajah Bintang';
        else if (currentLevel >= 10) roleBadge = '✧ Pengembara Berbakat';


        // ==========================================
        // 🖼️ 5. GENERATE GAMBAR SECARA OTOMATIS
        // ==========================================
        let imageBuffer;
        try {
            // Panggil fungsi gambar baru dengan tekstur, data nyata, rank global, dan gelar
            imageBuffer = await generateRankCard(targetUser, currentLevel, currentXp, targetXp, globalRank, roleBadge);
        } catch (error) {
            console.error('❌ Error generating rank card:', error);
            return interaction.editReply('❌ Terjadi kesalahan saat membuat kartu profil.');
        }

        // Buat attachment dari buffer gambar
        const attachment = new AttachmentBuilder(imageBuffer, { name: 'prestige-rank.png' });

        // ==========================================
        // 🖥️ 6. MERAKIT EMBED UI PREMIUM
        // ==========================================
        const rankEmbed = new EmbedBuilder()
            // Warna emas jika level tinggi, warna perak jika rendah
            .setColor(currentLevel >= 50 ? '#FFD700' : '#B0C4DE')
            .setAuthor({ name: `✦  𝐏 𝐑 𝐄 𝐒 𝐓 𝐈 𝐆 𝐄   𝐏 𝐑 𝐎 𝐅 𝐈 𝐋 𝐄  ✦`, iconURL: interaction.client.user.displayAvatarURL() })
            // Pasang gambar hasil generate ke Embed
            .setImage('attachment://prestige-rank.png') 
            .addFields(
                { name: '📜 Statistik Perjalanan', value: `\`Total Pesan: ${(userData.totalMessages || 0).toLocaleString()} Epilog\``, inline: false }
            )
            .setFooter({ text: 'Naura Ultimate System • Divisi Registrasi', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        // Mengirim Embed dan Gambar sekaligus
        await interaction.editReply({ embeds: [rankEmbed], files: [attachment] });
    }
};