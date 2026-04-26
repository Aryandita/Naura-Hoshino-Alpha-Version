/**
 * @namespace: src/commands/utility/rank.js
 * @type: Command
 * @copyright © 2026 Aryandita Praftian
 * @assistant Naura Hoshino
 * @version 1.0.1
 * @description Menampilkan kartu profil level lokal (per-server) yang mewah & terstruktur.
 */

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { Op } = require('sequelize'); // Diperlukan untuk kalkulasi ranking
const { CanvasUtils } = require('../../utils/Canvas'); 
const UserLeveling = require('../../models/UserLeveling');
const UserProfile = require('../../models/UserProfile');
const { getNextLevelXp } = require('../../utils/leveling'); 
const ui = require('../../config/ui');

module.exports = {
    // 1. DEFINISI COMMAND (SLASH & PREFIX)
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('🌟 Lihat Kartu Profil Eksklusif dinamis kamu di server ini!')
        .addUserOption(option => 
            option.setName('target').setDescription('Lihat profil milik orang lain').setRequired(false)
        ),
    aliases: ['profile', 'level', 'xp'], // n!rank, n!profile

    async execute(interaction) {
        // --- PRE-EXECUTION SETTINGS ---
        const isSlash = typeof interaction.deferReply === 'function';
        if (isSlash) await interaction.deferReply();

        // Menentukan Target Pengguna
        const targetUser = (interaction.options && typeof interaction.options.getUser === 'function') 
            ? interaction.options.getUser('target') || interaction.user 
            : interaction.user;

        const guildId = interaction.guild.id;

        // ==========================================
        // 💾 1. LOGIKA DATABASE (PENGAMBILAN DATA)
        // ==========================================
        let userData;
        let userProfile;
        try {
            userData = await UserLeveling.findOne({ 
                where: { userId: targetUser.id, guildId: guildId } 
            });
            [userProfile] = await UserProfile.findOrCreate({ 
                where: { userId: targetUser.id } 
            });
            
            // Evaluasi Lazy Expiry Premium
            if (userProfile.isPremium && userProfile.premiumUntil && userProfile.premiumUntil <= new Date()) {
                userProfile.isPremium = false;
                userProfile.premiumUntil = null;
                await userProfile.save();
            }
        } catch (error) {
            console.error('\x1b[31m[RANK ERROR]\x1b[0m Gagal mengakses MySQL:', error);
            return sendErrorReply(interaction, '❌ Gagal menghubungkan ke database MySQL.', isSlash);
        }

        // ==========================================
        // 📊 2. LOGIKA KALKULASI (NULL GUARD & RANK)
        // ==========================================
        
        // A. Statistik Level & XP (Default jika data kosong)
        const currentLevel = userData ? userData.level : 1;
        const currentXp = userData ? userData.xp : 0;
        const targetXp = getNextLevelXp(currentLevel);

        // B. Kalkulasi Ranking Lokal (Server Rank)
        let localRank = 'N/A';
        if (userData) {
            // Menghitung berapa banyak user yang XP-nya lebih tinggi
            const higherUsers = await UserLeveling.count({
                where: { guildId: guildId, xp: { [Op.gt]: currentXp } }
            });
            localRank = `#${higherUsers + 1}`;
        }

        // C. Kalkulasi Gelar (Badge) berdasarkan Level
        let roleBadge = '✧ Pendatang Baru';
        if (currentLevel >= 100) roleBadge = '✦ Legenda Abadi ✦';
        else if (currentLevel >= 50) roleBadge = '✧ Pahlawan Senior';
        else if (currentLevel >= 25) roleBadge = '✧ Petualang Tangguh';
        else if (currentLevel >= 10) roleBadge = '✧ Pengembara Berbakat';
        
        // Premium Override
        const isPremium = userProfile ? userProfile.isPremium : false;
        if (isPremium) roleBadge = '👑 V.I.P Premium';

        // ==========================================
        // 🖼️ 3. LOGIKA GRAFIS (GENERATOR CANVAS)
        // ==========================================
        let imageBuffer;
        try {
            // Memanggil fungsi generateRankCard yang baru (ANTI TABRAKAN)
            const canvas = await CanvasUtils.generateRankCard(
                targetUser, currentLevel, currentXp, targetXp, localRank, roleBadge, isPremium
            );
            
            // Konversi Canvas ke Buffer (Mendukung @napi-rs/canvas)
            if (canvas && typeof canvas.encodeSync === 'function') {
                imageBuffer = canvas.encodeSync('png');
            } else if (canvas && typeof canvas.toBuffer === 'function') {
                imageBuffer = canvas.toBuffer('image/png');
            } else {
                imageBuffer = canvas; // Asumsi sudah berupa buffer
            }
            
        } catch (error) {
            console.error('\x1b[31m[RANK CANVAS ERROR]\x1b[0m Gagal merender:', error);
            return sendErrorReply(interaction, '❌ Gagal merender grafis kartu profil.', isSlash);
        }

        const attachment = new AttachmentBuilder(imageBuffer, { name: 'naura-prestige.png' });

        // ==========================================
        // 🖥️ 4. LOGIKA UI (EMBED ASSEMBLY & SEND)
        // ==========================================
        const embedColor = isPremium ? '#FFD700' : (currentLevel >= 50 ? '#FFD700' : (ui.getColor ? ui.getColor('primary') : '#00FFFF'));
        const rankEmbed = new EmbedBuilder()
            // Warna emas jika premium atau level tinggi, warna primary jika standar
            .setColor(embedColor)
            .setAuthor({ name: `✦   𝐏 𝐑 𝐄 𝐒 𝐓 𝐈 𝐆 𝐄   𝐏 𝐑 𝐎 𝐅 𝐈 𝐋 𝐄   ✦`, iconURL: targetUser.displayAvatarURL() })
            .setImage('attachment://naura-prestige.png') 
            .addFields(
                { name: '📜 Sertifikat Registrasi', value: `\`Status Wilayah: Tersinkronisasi dengan ${interaction.guild.name}\`\n🛡️ \`Poin Tata Krama: ${userData ? (userData.mannersPoint !== undefined ? userData.mannersPoint : 100) : 100}/100\``, inline: false }
            )
            .setFooter({ text: 'Naura Ultimate System • Divisi Registrasi', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        // Pengiriman Akhir
        if (isSlash) {
            await interaction.editReply({ embeds: [rankEmbed], files: [attachment] });
        } else {
            await interaction.reply({ embeds: [rankEmbed], files: [attachment] });
        }
    }
};

// --- FUNGSI UTILITAS LOKAL (HELPER) ---
function sendErrorReply(interaction, message, isSlash) {
    const embed = new EmbedBuilder().setColor('#FF0000').setDescription(message);
    if (isSlash) return interaction.editReply({ embeds: [embed] }).catch(() => {});
    return interaction.reply({ embeds: [embed] }).catch(() => {});
}
