const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    RoleSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-roles')
        .setDescription('🎭 [ADMIN] Setup Button Roles interaktif (Menu Formulir)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        let session = {
            roles: [], // { id: '...', label: '...', emoji: '...' }
            channelId: null,
            title: '🎭 Ambil Role Kamu!',
            description: 'Silakan klik tombol di bawah ini untuk mendapatkan role yang sesuai.'
        };

        const generateDashboard = () => {
            const embed = new EmbedBuilder()
                .setColor(ui.getColor('primary'))
                .setTitle('🛠️ Setup Button Roles')
                .setDescription('Gunakan menu di bawah ini untuk mengatur Panel Button Roles.\n\n**Konfigurasi Saat Ini:**\n' +
                    `> 📌 **Judul Panel:** ${session.title}\n` +
                    `> 📝 **Deskripsi:** ${session.description}\n` +
                    `> 📍 **Channel Target:** ${session.channelId ? `<#${session.channelId}>` : '*Belum diatur*'}\n` +
                    `> 🎭 **Role Ditambahkan:** ${session.roles.length}/5\n` +
                    session.roles.map(r => `  - <@&${r.id}> [Label: ${r.label}]`).join('\n')
                )
                .setFooter({ text: 'Naura Interactive Setup' });

            const rowChannel = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder()
                    .setCustomId('sr_select_channel')
                    .setPlaceholder('1️⃣ Pilih Channel untuk Panel')
                    .addChannelTypes(ChannelType.GuildText)
            );

            const rowRole = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder()
                    .setCustomId('sr_add_role')
                    .setPlaceholder('2️⃣ Tambahkan Role ke Panel')
                    .setMaxValues(1)
                    .setDisabled(session.roles.length >= 5)
            );

            const rowRemove = new ActionRowBuilder();
            if (session.roles.length > 0) {
                const removeSelect = new StringSelectMenuBuilder()
                    .setCustomId('sr_remove_role')
                    .setPlaceholder('🗑️ Hapus Role dari Panel');
                session.roles.forEach(r => {
                    removeSelect.addOptions({ label: `Hapus ${r.label}`, value: r.id });
                });
                rowRemove.addComponents(removeSelect);
            }

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sr_edit_text').setLabel('Edit Teks Panel').setEmoji('📝').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('sr_send_panel').setLabel('Kirim Panel').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(!session.channelId || session.roles.length === 0),
                new ButtonBuilder().setCustomId('sr_cancel').setLabel('Batalkan').setStyle(ButtonStyle.Danger)
            );

            const components = [rowChannel, rowRole];
            if (session.roles.length > 0) components.push(rowRemove);
            components.push(rowBtns);

            return { embeds: [embed], components, ephemeral: true };
        };

        const response = await interaction.reply(generateDashboard());

        const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 Menit

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Sesi ini bukan milikmu.', ephemeral: true });

            if (i.isChannelSelectMenu() && i.customId === 'sr_select_channel') {
                session.channelId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isRoleSelectMenu() && i.customId === 'sr_add_role') {
                const roleId = i.values[0];
                const modal = new ModalBuilder()
                    .setCustomId(`sr_modal_role_${roleId}`)
                    .setTitle('Konfigurasi Tombol Role');

                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_label').setLabel('Label Tombol').setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('role_emoji').setLabel('Emoji Tombol (Opsional, Unicode)').setStyle(TextInputStyle.Short).setRequired(false))
                );

                await i.showModal(modal);
                
                try {
                    const submitted = await i.awaitModalSubmit({ time: 60000, filter: m => m.user.id === interaction.user.id && m.customId === `sr_modal_role_${roleId}` });
                    const label = submitted.fields.getTextInputValue('role_label');
                    const emoji = submitted.fields.getTextInputValue('role_emoji');
                    
                    if (!session.roles.find(r => r.id === roleId)) {
                        session.roles.push({ id: roleId, label, emoji });
                    }
                    await submitted.update(generateDashboard());
                } catch (e) {
                    console.error('Modal Timeout');
                }
            }

            if (i.isStringSelectMenu() && i.customId === 'sr_remove_role') {
                session.roles = session.roles.filter(r => r.id !== i.values[0]);
                await i.update(generateDashboard());
            }

            if (i.isButton() && i.customId === 'sr_edit_text') {
                const modal = new ModalBuilder().setCustomId('sr_modal_text').setTitle('Edit Teks Panel');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_title').setLabel('Judul Panel').setStyle(TextInputStyle.Short).setValue(session.title)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_desc').setLabel('Deskripsi Panel').setStyle(TextInputStyle.Paragraph).setValue(session.description))
                );
                
                await i.showModal(modal);

                try {
                    const submitted = await i.awaitModalSubmit({ time: 120000, filter: m => m.user.id === interaction.user.id && m.customId === 'sr_modal_text' });
                    session.title = submitted.fields.getTextInputValue('panel_title');
                    session.description = submitted.fields.getTextInputValue('panel_desc');
                    await submitted.update(generateDashboard());
                } catch (e) {}
            }

            if (i.isButton() && i.customId === 'sr_cancel') {
                collector.stop();
                await i.update({ content: '❌ Setup dibatalkan.', embeds: [], components: [] });
            }

            if (i.isButton() && i.customId === 'sr_send_panel') {
                const channel = interaction.guild.channels.cache.get(session.channelId);
                if (!channel) return i.reply({ content: 'Channel tidak ditemukan.', ephemeral: true });

                const embed = new EmbedBuilder()
                    .setColor(ui.getColor('primary'))
                    .setTitle(session.title)
                    .setDescription(session.description)
                    .setFooter({ text: 'Naura Roles System' });

                const row = new ActionRowBuilder();
                session.roles.forEach(r => {
                    const btn = new ButtonBuilder().setCustomId(`role_assign_${r.id}`).setLabel(r.label).setStyle(ButtonStyle.Primary);
                    if (r.emoji) btn.setEmoji(r.emoji);
                    row.addComponents(btn);
                });

                await channel.send({ embeds: [embed], components: [row] });
                collector.stop();
                await i.update({ content: `✅ Panel berhasil dikirim ke <#${session.channelId}>!`, embeds: [], components: [] });
            }
        });
    }
};
