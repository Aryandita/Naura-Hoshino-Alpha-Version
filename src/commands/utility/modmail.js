const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modmail')
        .setDescription('📩 Hubungi tim support dari server tempat kamu bergabung.'),
    aliases: ['mail', 'contact'],

    // Dukungan Hybrid (Slash & Prefix n!modmail)
    async execute(interaction) {
        const user = interaction.user || interaction.author;
        const client = interaction.client;
        
        const isSlash = typeof interaction.deferReply === 'function';
        if (isSlash) await interaction.deferReply({ ephemeral: true });

        const botGuilds = client.guilds.cache;
        let availableOptions = [];

        // Mencari server persekutuan (Diparalelkan agar tidak timeout)
        const checkPromises = botGuilds.map(async (guild) => {
            try {
                // Cek apakah user ada di guild ini
                const member = await guild.members.fetch(user.id).catch(() => null);
                if (member) {
                    // Cek apakah guild mengaktifkan Modmail
                    const settingsData = await GuildSettings.findOne({ where: { guildId: guild.id } });
                    if (settingsData && settingsData.settings?.modmail?.enabled && settingsData.settings?.modmail?.categoryId) {
                        return {
                            label: guild.name.substring(0, 100),
                            value: guild.id,
                            description: 'Hubungi Staff / Admin di server ini',
                            emoji: '🏢'
                        };
                    }
                }
            } catch (e) {}
            return null;
        });

        const results = await Promise.all(checkPromises);
        availableOptions = results.filter(opt => opt !== null);

        if (availableOptions.length === 0) {
            const errEmbed = new EmbedBuilder().setColor('#FF0000').setDescription('❌ Tidak ada server (yang kamu ikuti) yang mengaktifkan fitur Modmail saat ini.');
            return isSlash ? interaction.editReply({ embeds: [errEmbed] }) : interaction.reply({ embeds: [errEmbed] });
        }

        const embed = new EmbedBuilder()
            .setColor(ui.getColor('primary') || '#00FFFF')
            .setAuthor({ name: '📩 Pusat Komunikasi Modmail', iconURL: client.user.displayAvatarURL() })
            .setTitle('Hubungi Staff & Administrator')
            .setDescription('Sistem transmisi pesan Naura telah siap digunakan.\n\nSilakan pilih server dari menu tarik-turun di bawah ini untuk memulai percakapan rahasia dengan tim Staff / Moderator terkait.\n\n> 🛡️ *Identitasmu aman dan pesanmu akan langsung dikirimkan ke markas mereka.*')
            .setFooter({ text: 'Naura Secure Communication System' });

        const selectMenu = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('modmail_select_guild')
                .setPlaceholder('Pilih server tujuan...')
                .addOptions(availableOptions.slice(0, 25))
        );

        if (isSlash) {
            await interaction.editReply({ embeds: [embed], components: [selectMenu] });
        } else {
            await interaction.reply({ embeds: [embed], components: [selectMenu] });
        }
    }
};