const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const env = require('../config/env');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        
        // 1. COMMANDS ROUTER
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`Error command ${interaction.commandName}:`, error);
                const errEmbed = new EmbedBuilder().setColor('#00FFFF').setDescription('❌ Terjadi kesalahan saat mengeksekusi perintah!');
                if (interaction.replied || interaction.deferred) await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
                else await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
            }
            return;
        }

        // 2. TOMBOL ROUTER
        if (interaction.isButton()) {
            
            // ==========================================
            // 🎫 TICKET SYSTEM LOGIC
            // ==========================================
            if (interaction.customId === 'ticket_create') {
                const guildData = await GuildSettings.findOne({ where: { guildId: interaction.guild.id } });
                
                if (!guildData || !guildData.settings || !guildData.settings.ticket || !guildData.settings.ticket.categoryId) {
                    return interaction.reply({ content: '❌ Sistem tiket belum disetup oleh admin.', ephemeral: true });
                }

                const existingTicket = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
                if (existingTicket) return interaction.reply({ content: `❌ Kamu sudah memiliki tiket yang terbuka di <#${existingTicket.id}>!`, ephemeral: true });

                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: guildData.settings.ticket.categoryId,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels] }
                    ]
                });

                // Warna Embed Aqua KHUSUS untuk Anda, kuning untuk publik. Sapaan lama dihapus.
                const embedColor = env.OWNER_IDS.includes(interaction.user.id) ? '#00FFFF' : '#f1c40f';
                const embedTicket = new EmbedBuilder()
                    .setColor(embedColor)
                    .setTitle('🎫 Tiket Bantuan')
                    .setDescription(`Halo <@${interaction.user.id}>!\nSilakan jelaskan masalahmu di sini. Developer Aryan atau Tim Support akan segera membalas.\n\nKlik tombol di bawah jika masalah sudah selesai.`)
                    .setFooter({ text: 'Naura Support System' });

                const closeBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_close').setLabel('Tutup Tiket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [embedTicket], components: [closeBtn] });
                return interaction.reply({ content: `✅ Tiket berhasil dibuat! Buka <#${ticketChannel.id}>`, ephemeral: true });
            }

            if (interaction.customId === 'ticket_close') {
                return interaction.reply({ content: '🔒 Tiket akan ditutup dalam 5 detik...', ephemeral: false }).then(() => {
                    setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
                });
            }

            // ==========================================
            // 🎛️ TEMP VOICE CONTROL LOGIC
            // ==========================================
            if (interaction.customId.startsWith('tvc_')) {
                const memberVoice = interaction.member.voice.channel;
                if (!memberVoice) return interaction.reply({ content: '❌ Kamu harus berada di dalam Voice Channel!', ephemeral: true });
                if (!memberVoice.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageChannels)) return interaction.reply({ content: '❌ Kamu bukan pemilik Voice Channel ini.', ephemeral: true });

                if (interaction.customId === 'tvc_lock') {
                    await memberVoice.permissionOverwrites.edit(interaction.guild.id, { [PermissionFlagsBits.Connect]: false });
                    return interaction.reply({ content: '🔒 Voice Channel berhasil **dikunci**!', ephemeral: true });
                }
                
                if (interaction.customId === 'tvc_unlock') {
                    await memberVoice.permissionOverwrites.edit(interaction.guild.id, { [PermissionFlagsBits.Connect]: null });
                    return interaction.reply({ content: '🔓 Voice Channel berhasil **dibuka**!', ephemeral: true });
                }

                if (interaction.customId === 'tvc_rename') {
                    const modal = new ModalBuilder().setCustomId('modal_tvc_rename').setTitle('Ubah Nama Voice Channel');
                    const inputName = new TextInputBuilder().setCustomId('input_name').setLabel('Nama Baru').setStyle(TextInputStyle.Short).setMaxLength(30).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(inputName));
                    return interaction.showModal(modal);
                }

                if (interaction.customId === 'tvc_limit') {
                    const modal = new ModalBuilder().setCustomId('modal_tvc_limit').setTitle('Atur Limit Member');
                    const inputLimit = new TextInputBuilder().setCustomId('input_limit').setLabel('Batas (0 - 99, 0 = Bebas)').setStyle(TextInputStyle.Short).setMaxLength(2).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(inputLimit));
                    return interaction.showModal(modal);
                }
            }
        }

        // 3. MODALS ROUTER
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modal_tvc_')) {
                const memberVoice = interaction.member.voice.channel;
                if (!memberVoice) return interaction.reply({ content: '❌ Kamu sudah keluar dari Voice Channel!', ephemeral: true });

                if (interaction.customId === 'modal_tvc_rename') {
                    const newName = interaction.fields.getTextInputValue('input_name');
                    await memberVoice.setName(newName).catch(() => {});
                    return interaction.reply({ content: `✅ Nama Voice diubah ke **${newName}**!`, ephemeral: true });
                }

                if (interaction.customId === 'modal_tvc_limit') {
                    let limit = parseInt(interaction.fields.getTextInputValue('input_limit'));
                    if (isNaN(limit) || limit < 0 || limit > 99) limit = 0;
                    await memberVoice.setUserLimit(limit).catch(() => {});
                    return interaction.reply({ content: `✅ Batas member diubah ke **${limit === 0 ? 'Tanpa Batas' : limit}**.`, ephemeral: true });
                }
            }
        }
    }
};
