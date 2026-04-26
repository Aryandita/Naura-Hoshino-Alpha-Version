const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-channels')
        .setDescription('⚙️ [ADMIN] Mengatur channel khusus untuk AI, Leveling, dan Minigames.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(opt => opt.setName('ai_channel').setDescription('Channel khusus ngobrol otomatis dengan Naura AI').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('level_channel').setDescription('Channel khusus pengumuman naik level').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('counting_channel').setDescription('Channel khusus minigame berhitung').addChannelTypes(ChannelType.GuildText))
        .addChannelOption(opt => opt.setName('tod_channel').setDescription('Channel khusus game Truth or Dare').addChannelTypes(ChannelType.GuildText)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const aiChannel = interaction.options.getChannel('ai_channel');
        const levelChannel = interaction.options.getChannel('level_channel');
        const countingChannel = interaction.options.getChannel('counting_channel');
        const todChannel = interaction.options.getChannel('tod_channel');

        // Jika tidak ada satupun yang diisi
        if (!aiChannel && !levelChannel && !countingChannel && !todChannel) {
            return interaction.editReply(`❌ Kamu harus mengisi setidaknya satu opsi channel untuk diatur.`);
        }

        // Ambil pengaturan yang sudah ada di database MySQL
        let [settings] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guild.id } });
        let currentSettings = settings.settings || {};
        
        // Buat objek channels jika belum ada
        if (!currentSettings.channels) currentSettings.channels = {};

        // Update ID channel yang dipilih
        if (aiChannel) currentSettings.channels.ai = aiChannel.id;
        if (levelChannel) currentSettings.channels.levelUp = levelChannel.id;
        if (countingChannel) currentSettings.channels.counting = countingChannel.id;
        if (todChannel) currentSettings.channels.tod = todChannel.id;

        settings.settings = currentSettings;
        settings.changed('settings', true);
        await settings.save();

        const embed = new EmbedBuilder()
            .setColor(ui.getColor ? ui.getColor('success') : '#00FF00')
            .setTitle('⚙️ Konfigurasi Channel Berhasil')
            .setDescription('Berikut adalah pemetaan channel khusus saat ini:')
            .addFields(
                { name: '🤖 Auto AI Chat', value: currentSettings.channels.ai ? `<#${currentSettings.channels.ai}>` : '*Belum diatur*', inline: true },
                { name: '⬆️ Level Up', value: currentSettings.channels.levelUp ? `<#${currentSettings.channels.levelUp}>` : '*Mengikuti tempat chat*', inline: true },
                { name: '🔢 Counting', value: currentSettings.channels.counting ? `<#${currentSettings.channels.counting}>` : '*Belum diatur*', inline: true },
                { name: '🎭 Truth or Dare', value: currentSettings.channels.tod ? `<#${currentSettings.channels.tod}>` : '*Belum diatur*', inline: true }
            );

        await interaction.editReply({ embeds: [embed] });
    }
};