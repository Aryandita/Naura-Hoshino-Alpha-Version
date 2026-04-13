const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { generateRankCard } = require('../../utils/CanvasUtils'); 
const UserProfile = require('../../models/UserProfile'); 
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
            userData = await UserProfile.findOne({ where: { userId: targetUser.id } });
        } catch (error) {
            console.error('❌ Gagal mengambil data user:', error);
            return interaction.editReply('❌ Terjadi kesalahan saat mengakses database.');
        }

        // ==========================================
        // 🏆 3. MENGHITUNG PERINGKAT GLOBAL SECARA REAL-TIME
        // ==========================================
        let globalRank = 'N/A';
        try {
            const allUsers = await UserProfile.findAll({
                attributes: ['userId', 'leveling_level', 'leveling_xp'],
                order: [['leveling_level', 'DESC'], ['leveling_xp', 'DESC']]
            });

            const rankIndex = allUsers.findIndex(u => u.userId === targetUser.id);
            if (rankIndex !== -1) {
                globalRank = rankIndex + 1;
            }
        } catch (error) {
            console.error('❌ Gagal menghitung peringkat:', error);
        }

        // Ambil data XP dan Level asli (Gunakan default 0 dan 1 jika user belum terdata)
        const currentXp = userData ? userData.leveling_xp : 0;
        const currentLevel = userData ? userData.leveling_level : 1;
        
        // Hitung XP yang dibutuhkan untuk mencapai level *berikutnya*
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
            imageBuffer = await generateRankCard(targetUser, currentLevel, currentXp, targetXp, globalRank, roleBadge);
        } catch (error) {
            console.error('❌ Error generating rank card:', error);
            return interaction.editReply('❌ Terjadi kesalahan saat membuat kartu profil.');
        }

        const attachment = new AttachmentBuilder(imageBuffer, { name: 'prestige-rank.png' });

        // ==========================================
        // 🖥️ 6. MERAKIT EMBED UI PREMIUM
        // ==========================================
        const rankEmbed = new EmbedBuilder()
            .setColor(currentLevel >= 50 ? '#FFD700' : '#B0C4DE')
            .setAuthor({ name: `✦  𝐏 𝐑 𝐄 𝐒 𝐓 𝐈 𝐆 𝐄   𝐏 𝐑 𝐎 𝐅 𝐈 𝐋 𝐄  ✦`, iconURL: interaction.client.user.displayAvatarURL() })
            .setImage('attachment://prestige-rank.png') 
            .addFields(
                { name: '📜 Statistik Perjalanan', value: `\`Status: Tersinkronisasi Global\``, inline: false }
            )
            .setFooter({ text: 'Naura Ultimate System • Divisi Registrasi', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        await interaction.editReply({ embeds: [rankEmbed], files: [attachment] });
    }
};
