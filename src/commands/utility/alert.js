const { SlashCommandBuilder, ChannelType } = require('discord.js');
const SocialAlert = require('../../models/SocialAlert');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('📡 Tambahkan notifikasi otomatis jika ada video baru.')
        .addSubcommand(sub =>
            sub.setName('add_youtube')
                .setDescription('Notifikasi video YouTube baru.')
                .addStringOption(opt => opt.setName('channel_id').setDescription('Masukkan ID Channel YouTube target').setRequired(true))
                .addChannelOption(opt => opt.setName('target_channel').setDescription('Channel Discord untuk notif').addChannelTypes(ChannelType.GuildText).setRequired(true))
        )
        // Opsional: Untuk platform lain via RSSHub
        .addSubcommand(sub =>
            sub.setName('add_tiktok')
                .setDescription('Notifikasi video TikTok baru.')
                .addStringOption(opt => opt.setName('username').setDescription('Username TikTok tanpa @').setRequired(true))
                .addChannelOption(opt => opt.setName('target_channel').setDescription('Channel Discord untuk notif').addChannelTypes(ChannelType.GuildText).setRequired(true))
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();
        const targetChannel = interaction.options.getChannel('target_channel');

        if (subcommand === 'add_youtube') {
            const ytId = interaction.options.getString('channel_id');
            // Format rahasia RSS YouTube
            const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${ytId}`;

            await SocialAlert.create({
                guildId: interaction.guildId,
                discordChannelId: targetChannel.id,
                platform: 'youtube',
                name: `YouTube ID: ${ytId}`,
                feedUrl: feedUrl
            });

            return interaction.editReply(`${ui.emojis.success} Berhasil! Naura akan mengabari di channel <#${targetChannel.id}> setiap ada video YouTube baru.`);
        }

        if (subcommand === 'add_tiktok') {
            const username = interaction.options.getString('username');
            // Format RSSHub untuk TikTok
            const feedUrl = `https://rsshub.app/tiktok/user/${username}`;

            await SocialAlert.create({
                guildId: interaction.guildId,
                discordChannelId: targetChannel.id,
                platform: 'tiktok',
                name: `TikTok: @${username}`,
                feedUrl: feedUrl
            });

            return interaction.editReply(`${ui.emojis.success} Berhasil! Naura akan memantau TikTok **@${username}** setiap 10 menit.`);
        }
    }
};