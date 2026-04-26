const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-ticket')
        .setDescription('🎫 [ADMIN] Setup Panel Tiket interaktif (Menu Formulir)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        // Ambil konfigurasi lama jika ada
        let [settings] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guild.id } });
        let currentSettings = settings.settings || {};
        
        let session = {
            channelId: null,
            categoryId: currentSettings.ticket?.categoryId || null,
            supportRoleId: currentSettings.ticket?.supportRoleId || null,
            title: '🎫 Pusat Bantuan & Layanan',
            description: 'Apakah Anda memiliki pertanyaan, laporan *bug*, atau butuh bantuan?\n\nSilakan klik tombol di bawah ini untuk membuka tiket dan berbicara langsung dengan tim Staff kami.'
        };

        const generateDashboard = () => {
            const embed = new EmbedBuilder()
                .setColor(ui.getColor('primary'))
                .setTitle('🛠️ Setup Panel Tiket')
                .setDescription('Gunakan menu di bawah ini untuk mengatur Panel Tiket.\n\n**Konfigurasi Saat Ini:**\n' +
                    `> 📌 **Judul Panel:** ${session.title}\n` +
                    `> 📝 **Deskripsi:** ${session.description}\n` +
                    `> 📍 **Channel Panel:** ${session.channelId ? `<#${session.channelId}>` : '*Belum diatur*'}\n` +
                    `> 📁 **Kategori Tiket:** ${session.categoryId ? `<#${session.categoryId}>` : '*Belum diatur*'}\n` +
                    `> 👮 **Role Support:** ${session.supportRoleId ? `<@&${session.supportRoleId}>` : '*Belum diatur*'}`
                )
                .setFooter({ text: 'Naura Interactive Setup' });

            const rowPanelChannel = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId('st_select_panel').setPlaceholder('1️⃣ Pilih Channel untuk Mengirim Panel').addChannelTypes(ChannelType.GuildText)
            );
            const rowTicketCategory = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId('st_select_category').setPlaceholder('2️⃣ Pilih Kategori untuk Tiket Baru').addChannelTypes(ChannelType.GuildCategory)
            );
            const rowSupportRole = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder().setCustomId('st_select_role').setPlaceholder('3️⃣ Pilih Role Support (Staff)')
            );

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('st_edit_text').setLabel('Edit Teks Panel').setEmoji('📝').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId('st_send_panel').setLabel('Simpan & Kirim Panel').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(!session.channelId || !session.categoryId || !session.supportRoleId),
                new ButtonBuilder().setCustomId('st_cancel').setLabel('Batalkan').setStyle(ButtonStyle.Danger)
            );

            return { embeds: [embed], components: [rowPanelChannel, rowTicketCategory, rowSupportRole, rowBtns], ephemeral: true };
        };

        const response = await interaction.reply(generateDashboard());
        const collector = response.createMessageComponentCollector({ time: 300000 }); // 5 Menit

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Sesi ini bukan milikmu.', ephemeral: true });

            if (i.isChannelSelectMenu() && i.customId === 'st_select_panel') {
                session.channelId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isChannelSelectMenu() && i.customId === 'st_select_category') {
                session.categoryId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isRoleSelectMenu() && i.customId === 'st_select_role') {
                session.supportRoleId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isButton() && i.customId === 'st_edit_text') {
                const modal = new ModalBuilder().setCustomId('st_modal_text').setTitle('Edit Teks Panel Tiket');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_title').setLabel('Judul Panel').setStyle(TextInputStyle.Short).setValue(session.title)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('panel_desc').setLabel('Deskripsi Panel').setStyle(TextInputStyle.Paragraph).setValue(session.description))
                );
                
                await i.showModal(modal);

                try {
                    const submitted = await i.awaitModalSubmit({ time: 120000, filter: m => m.user.id === interaction.user.id && m.customId === 'st_modal_text' });
                    session.title = submitted.fields.getTextInputValue('panel_title');
                    session.description = submitted.fields.getTextInputValue('panel_desc');
                    await submitted.update(generateDashboard());
                } catch (e) {}
            }

            if (i.isButton() && i.customId === 'st_cancel') {
                collector.stop();
                await i.update({ content: '❌ Setup dibatalkan.', embeds: [], components: [] });
            }

            if (i.isButton() && i.customId === 'st_send_panel') {
                // Simpan pengaturan ke DB
                currentSettings.ticket = {
                    enabled: true,
                    categoryId: session.categoryId,
                    supportRoleId: session.supportRoleId
                };
                settings.settings = currentSettings;
                settings.changed('settings', true);
                await settings.save();

                const channel = interaction.guild.channels.cache.get(session.channelId);
                if (!channel) return i.reply({ content: 'Channel panel tidak ditemukan.', ephemeral: true });

                const embed = new EmbedBuilder()
                    .setColor(ui.getColor('primary'))
                    .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                    .setTitle(session.title)
                    .setDescription(session.description)
                    .setFooter({ text: 'Naura Support System', iconURL: interaction.client.user.displayAvatarURL() });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_create').setLabel('Buka Tiket').setEmoji(ui.getEmoji ? ui.getEmoji('ticket') : '📩').setStyle(ButtonStyle.Primary)
                );

                await channel.send({ embeds: [embed], components: [row] });
                collector.stop();
                await i.update({ content: `✅ Panel Tiket berhasil dikirim ke <#${session.channelId}> dan pengaturan disimpan!`, embeds: [], components: [] });
            }
        });
    }
};