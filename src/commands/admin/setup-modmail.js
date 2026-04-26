const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-modmail')
        .setDescription('📩 [ADMIN] Mengaktifkan penerimaan Modmail di server ini.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(opt => opt.setName('category').setDescription('Kategori untuk menampung pesan masuk dari DM').addChannelTypes(ChannelType.GuildCategory).setRequired(true)),

    async execute(interaction) {
        const category = interaction.options.getChannel('category');

        let [settings] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guild.id } });
        let currentSettings = settings.settings || {};
        
        currentSettings.modmail = {
            enabled: true,
            categoryId: category.id
        };

        settings.settings = currentSettings;
        settings.changed('settings', true);
        await settings.save();

        const embed = new EmbedBuilder()
            .setColor(ui.getColor ? ui.getColor('success') : '#00FF00')
            .setDescription(`✅ **Sistem Modmail Diaktifkan!**\nSekarang member bisa mengetik \`/modmail\` atau \`n!modmail\` di DM untuk menghubungi server ini. Semua pesan akan masuk ke kategori <#${category.id}>.`);

        await interaction.reply({ embeds: [embed] });
    }
};