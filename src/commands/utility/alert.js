const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ChannelSelectMenuBuilder,
    ChannelType
} = require('discord.js');
const SocialAlert = require('../../models/SocialAlert');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('alert')
        .setDescription('📡 [ADMIN] Setup Notifikasi Sosial Media (YouTube/TikTok) Interaktif.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageWebhooks),

    async execute(interaction) {
        let alerts = await SocialAlert.findAll({ where: { guildId: interaction.guild.id } });

        const generateDashboard = () => {
            const embed = new EmbedBuilder()
                .setColor(ui.getColor('primary') || '#2b2d31')
                .setTitle('📡 Social Media Alert Dashboard')
                .setDescription('Sistem ini akan mendeteksi video YouTube atau TikTok terbaru secara otomatis dan mengirimkannya langsung ke channel servermu!\n\n**Daftar Notifikasi Aktif:**\n' +
                    (alerts.length > 0 
                        ? alerts.map((a, i) => `**${i + 1}.** ${a.platform === 'youtube' ? '🔴' : '🎵'} **${a.name}**\n↳ 📍 Dikirim ke: <#${a.discordChannelId}>`).join('\n\n')
                        : '> *Belum ada notifikasi yang ditambahkan di server ini.*')
                )
                .setFooter({ text: 'Naura Auto-Alert System' });

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sa_add_yt').setLabel('Tambah YouTube').setEmoji('🔴').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('sa_add_tt').setLabel('Tambah TikTok').setEmoji('🎵').setStyle(ButtonStyle.Primary)
            );

            const rowRemove = new ActionRowBuilder();
            if (alerts.length > 0) {
                const removeSelect = new StringSelectMenuBuilder().setCustomId('sa_remove').setPlaceholder('🗑️ Hapus Notifikasi (Pilih untuk menghapus)');
                alerts.forEach(a => {
                    removeSelect.addOptions({ label: `Hapus ${a.platform.toUpperCase()}: ${a.name.substring(0, 50)}`, value: a.id.toString() });
                });
                rowRemove.addComponents(removeSelect);
            }

            const components = [rowBtns];
            if (alerts.length > 0) components.push(rowRemove);

            return { embeds: [embed], components, ephemeral: true };
        };

        const response = await interaction.reply(generateDashboard());
        const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 Menit

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Sesi ini bukan milikmu.', ephemeral: true });

            if (i.isButton() && (i.customId === 'sa_add_yt' || i.customId === 'sa_add_tt')) {
                const platform = i.customId === 'sa_add_yt' ? 'YouTube' : 'TikTok';
                const inputLabel = i.customId === 'sa_add_yt' ? 'Channel ID (UC...)' : 'Username (Tanpa @)';

                const modal = new ModalBuilder().setCustomId(`modal_${i.customId}`).setTitle(`Setup ${platform} Alert`);
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('input_target').setLabel(inputLabel).setStyle(TextInputStyle.Short).setRequired(true))
                );

                await i.showModal(modal);

                try {
                    const submitted = await i.awaitModalSubmit({ time: 120000, filter: m => m.user.id === interaction.user.id && m.customId === `modal_${i.customId}` });
                    const targetData = submitted.fields.getTextInputValue('input_target');

                    // Minta Channel
                    const channelEmbed = new EmbedBuilder().setColor('#FFD700').setDescription(`Pilih channel text mana yang akan digunakan untuk mengirimkan notifikasi **${platform}** milik **${targetData}**!`);
                    const channelRow = new ActionRowBuilder().addComponents(
                        new ChannelSelectMenuBuilder().setCustomId('select_alert_channel').setPlaceholder('Pilih Channel Target').addChannelTypes(ChannelType.GuildText)
                    );

                    await submitted.update({ embeds: [channelEmbed], components: [channelRow] });

                    // Tunggu pilihan channel
                    const filterChannel = m => m.user.id === interaction.user.id && m.customId === 'select_alert_channel';
                    const channelInteraction = await response.awaitMessageComponent({ filter: filterChannel, time: 60000 });
                    
                    const selectedChannelId = channelInteraction.values[0];

                    let feedUrl, name;
                    if (platform === 'YouTube') {
                        feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${targetData}`;
                        name = `YouTube ID: ${targetData}`;
                    } else {
                        feedUrl = `https://rsshub.app/tiktok/user/${targetData}`;
                        name = `TikTok: @${targetData}`;
                    }

                    await SocialAlert.create({
                        guildId: interaction.guild.id,
                        discordChannelId: selectedChannelId,
                        platform: platform.toLowerCase(),
                        name: name,
                        feedUrl: feedUrl
                    });

                    alerts = await SocialAlert.findAll({ where: { guildId: interaction.guild.id } });
                    await channelInteraction.update(generateDashboard());

                } catch (e) {}
            }

            if (i.isStringSelectMenu() && i.customId === 'sa_remove') {
                const idToRemove = i.values[0];
                await SocialAlert.destroy({ where: { id: idToRemove } });
                alerts = await SocialAlert.findAll({ where: { guildId: interaction.guild.id } });
                await i.update(generateDashboard());
            }
        });
    }
};