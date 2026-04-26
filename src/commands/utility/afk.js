const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const UserProfile = require('../../models/UserProfile');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('afk')
        .setDescription('💤 Tinggalkan pesan saat kamu pergi.')
        .addStringOption(opt => opt.setName('alasan').setDescription('Kenapa kamu pergi?')),

    async execute(interaction) {
        const alasan = interaction.options.getString('alasan') || 'Sedang istirahat sebentar.';
        
        let [profile] = await UserProfile.findOrCreate({ where: { userId: interaction.user.id } });
        profile.afk_reason = alasan;
        profile.afk_timestamp = new Date();
        await profile.save();

        try {
            await interaction.member.setNickname(`[AFK] ${interaction.member.displayName}`);
        } catch (e) {}

        const embed = new EmbedBuilder()
            .setColor(ui.getColor('primary') || '#2b2d31')
            .setAuthor({ name: `${interaction.user.username} sedang AFK`, iconURL: interaction.user.displayAvatarURL() })
            .setDescription(`💤 **Sistem AFK Diaktifkan!**\nNaura akan menjaga notifikasimu saat kamu sedang tidak ada di sekitar.\n\n> 📝 **Pesan / Alasan:** *${alasan}*`)
            .setFooter({ text: 'Naura Auto-Responder System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};