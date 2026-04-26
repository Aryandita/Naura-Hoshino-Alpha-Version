const { EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType, PermissionFlagsBits, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');
const ModMail = require('../models/ModMail');
const env = require('../config/env');
const ui = require('../config/ui');
const redisManager = require('../managers/redisManager');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction, client) {
        
        // 🚧 GLOBAL MAINTENANCE LOCKDOWN
        // Mencegah user biasa berinteraksi jika bot sedang dalam mode perbaikan
        if (client.maintenanceMode && !env.OWNER_IDS.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: `${ui.getEmoji ? ui.getEmoji('error') : '❌'} **Maintenance Mode Aktif:** Naura sedang diperbaiki oleh Developer Aryan. Silakan coba lagi nanti ya!`, 
                ephemeral: true 
            });
        }

        // ==========================================
        // 1. 🤖 COMMANDS ROUTER (SLASH COMMANDS)
        // ==========================================
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;
            
            // ==========================================
            // 🛡️ REDIS COOLDOWN SYSTEM (ANTI-SPAM)
            // ==========================================
            if (process.env.REDIS_URL && redisManager.client.isReady) {
                const cooldownKey = `cooldown:${interaction.user.id}`;
                const onCooldown = await redisManager.getCache(cooldownKey);
                
                // Jika sedang cooldown dan bukan Developer Aryan
                if (onCooldown && (!env.OWNER_IDS || !env.OWNER_IDS.includes(interaction.user.id))) {
                    return interaction.reply({
                        content: `⏳ **Sistem Pendingin Aktif:** Kamu terlalu cepat memberikan perintah. Silakan tarik napas dan tunggu beberapa detik.`,
                        ephemeral: true
                    });
                }
                
                // Set cooldown global 3 detik per command
                await redisManager.setCache(cooldownKey, { active: true }, 3);
            }
            
            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[COMMAND ERROR] ${interaction.commandName}:`, error);
                
                const errEmbed = new EmbedBuilder()
                    .setColor(ui.getColor ? ui.getColor('error') : '#FF0000')
                    .setDescription(`${ui.getEmoji ? ui.getEmoji('error') : '❌'} Terjadi kesalahan internal saat mengeksekusi perintah ini!`);
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
                } else {
                    await interaction.reply({ embeds: [errEmbed], ephemeral: true }).catch(() => {});
                }
            }
            return;
        }

        // ==========================================
        // 2. 🔘 TOMBOL ROUTER (INTERACTIVE BUTTONS)
        // ==========================================
        if (interaction.isButton()) {
            
            // ------------------------------------------
            // 🎭 REACTION / BUTTON ROLES LOGIC
            // ------------------------------------------
            if (interaction.customId.startsWith('role_assign_')) {
                const roleId = interaction.customId.replace('role_assign_', '');
                const role = interaction.guild.roles.cache.get(roleId);
                
                if (!role) {
                    return interaction.reply({ content: '❌ Role ini sudah dihapus atau tidak ditemukan di server.', ephemeral: true });
                }

                try {
                    if (interaction.member.roles.cache.has(roleId)) {
                        await interaction.member.roles.remove(roleId);
                        return interaction.reply({ content: `✅ Berhasil **mencopot** role <@&${roleId}> dari profilmu.`, ephemeral: true });
                    } else {
                        await interaction.member.roles.add(roleId);
                        return interaction.reply({ content: `✅ Berhasil **mengambil** role <@&${roleId}>!`, ephemeral: true });
                    }
                } catch (error) {
                    console.error('[ROLE ASSIGN ERROR]', error);
                    return interaction.reply({ content: '❌ Gagal memberikan role. Pastikan peran bot Naura berada di atas role tersebut dalam hierarki server!', ephemeral: true });
                }
            }

            // ------------------------------------------
            // 🎫 TICKET SYSTEM LOGIC
            // ------------------------------------------
            if (interaction.customId === 'ticket_create') {
                const guildData = await GuildSettings.findOne({ where: { guildId: interaction.guild.id } });
                
                if (!guildData || !guildData.settings?.ticket?.categoryId) {
                    return interaction.reply({ content: '❌ Sistem tiket belum dikonfigurasi oleh Admin.', ephemeral: true });
                }

                const existingTicket = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
                if (existingTicket) {
                    return interaction.reply({ content: `❌ Kamu sudah memiliki tiket aktif di <#${existingTicket.id}>!`, ephemeral: true });
                }

                const supportRoleId = guildData.settings.ticket.supportRoleId;

                const ticketChannel = await interaction.guild.channels.create({
                    name: `ticket-${interaction.user.username}`,
                    type: ChannelType.GuildText,
                    parent: guildData.settings.ticket.categoryId,
                    permissionOverwrites: [
                        { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
                        { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                        { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }
                    ]
                });

                const embedTicket = new EmbedBuilder()
                    .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
                    .setTitle('🎫 Tiket Bantuan')
                    .setDescription(`Halo <@${interaction.user.id}>!\nTim Support (<@&${supportRoleId}>) akan segera merespons tiketmu. Silakan jelaskan kendalamu di bawah ini.\n\n*Tekan tombol merah jika masalah sudah selesai.*`);

                const actionRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('Tutup Tiket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({ content: `<@${interaction.user.id}> | <@&${supportRoleId}>`, embeds: [embedTicket], components: [actionRow] });
                return interaction.reply({ content: `✅ Tiket berhasil dibuat! Buka <#${ticketChannel.id}>`, ephemeral: true });
            }

            if (interaction.customId === 'ticket_close_confirm') {
                const embed = new EmbedBuilder().setColor('#FF0000').setDescription('Apakah kamu yakin ingin menutup dan menghapus tiket ini secara permanen?');
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_close_execute').setLabel('Ya, Hapus').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('Batal').setStyle(ButtonStyle.Secondary)
                );
                return interaction.reply({ embeds: [embed], components: [row] });
            }

            if (interaction.customId === 'ticket_close_execute') {
                await interaction.reply('🔒 *Tiket akan dihapus dalam 3 detik...*');
                setTimeout(() => interaction.channel.delete().catch(() => {}), 3000);
            }

            if (interaction.customId === 'ticket_close_cancel') {
                await interaction.message.delete().catch(() => {});
            }

            // ------------------------------------------
            // 🎛️ TEMP VOICE CONTROL LOGIC (KYTHIA STYLE)
            // ------------------------------------------
            if (interaction.customId.startsWith('tvc_')) {
                const memberVoice = interaction.member.voice.channel;
                
                if (!memberVoice) {
                    return interaction.reply({ content: '❌ Akses Ditolak: Kamu harus berada di dalam Voice Channel tersebut!', ephemeral: true });
                }
                
                if (!memberVoice.permissionsFor(interaction.member).has(PermissionFlagsBits.ManageChannels) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                    return interaction.reply({ content: '❌ Akses Ditolak: Hanya pemilik ruangan (atau Admin) yang bisa menggunakan kontrol ini.', ephemeral: true });
                }

                try {
                    if (interaction.customId === 'tvc_lock') {
                        await memberVoice.permissionOverwrites.edit(interaction.guild.id, { [PermissionFlagsBits.Connect]: false });
                        return interaction.reply({ content: '🔒 Ruangan berhasil **dikunci**.', ephemeral: true });
                    }
                    if (interaction.customId === 'tvc_unlock') {
                        await memberVoice.permissionOverwrites.edit(interaction.guild.id, { [PermissionFlagsBits.Connect]: null });
                        return interaction.reply({ content: '🔓 Ruangan berhasil **dibuka**.', ephemeral: true });
                    }
                    if (interaction.customId === 'tvc_hide') {
                        await memberVoice.permissionOverwrites.edit(interaction.guild.id, { [PermissionFlagsBits.ViewChannel]: false });
                        return interaction.reply({ content: '👻 Ruangan **disembunyikan**.', ephemeral: true });
                    }
                    if (interaction.customId === 'tvc_unhide') {
                        await memberVoice.permissionOverwrites.edit(interaction.guild.id, { [PermissionFlagsBits.ViewChannel]: null });
                        return interaction.reply({ content: '👁️ Ruangan kembali **terlihat**.', ephemeral: true });
                    }

                    // ✨ STAGE MODE (Mute All Except Owner)
                    if (interaction.customId === 'tvc_stage') {
                        const isMuted = memberVoice.permissionOverwrites.cache.get(interaction.guild.id)?.deny.has(PermissionFlagsBits.Speak);
                        if (isMuted) {
                            await memberVoice.permissionOverwrites.edit(interaction.guild.id, { Speak: null });
                            return interaction.reply({ content: '🎤 **Stage Mode NONAKTIF**: Semua orang bisa berbicara kembali.', ephemeral: true });
                        } else {
                            await memberVoice.permissionOverwrites.edit(interaction.guild.id, { Speak: false });
                            await memberVoice.permissionOverwrites.edit(interaction.user.id, { Speak: true });
                            return interaction.reply({ content: '🤫 **Stage Mode AKTIF**: Semua member di-mute. Hanya kamu yang bisa berbicara.', ephemeral: true });
                        }
                    }

                    // ✨ WAITING ROOM CREATION
                    if (interaction.customId === 'tvc_waiting') {
                        const waitingName = `⏳ Wait - ${interaction.user.username}`;
                        const existingWaiting = interaction.guild.channels.cache.find(c => c.name === waitingName && c.parentId === memberVoice.parentId);

                        if (existingWaiting) {
                            await existingWaiting.delete().catch(()=>{});
                            return interaction.reply({ content: '🗑️ Waiting Room milikmu telah **dihapus**.', ephemeral: true });
                        } else {
                            await interaction.guild.channels.create({
                                name: waitingName,
                                type: ChannelType.GuildVoice,
                                parent: memberVoice.parentId,
                                permissionOverwrites: [
                                    { id: interaction.guild.id, allow: [PermissionFlagsBits.Connect], deny: [PermissionFlagsBits.Speak] },
                                    { id: interaction.user.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak] }
                                ]
                            });
                            return interaction.reply({ content: '⏳ **Waiting Room berhasil dibuat!** Orang lain kini bisa menunggu di sana jika ruanganmu dikunci.', ephemeral: true });
                        }
                    }

                    // ✨ MOVE USER (Dropdown Trigger)
                    if (interaction.customId === 'tvc_move') {
                        const waitingName = `⏳ Wait - ${interaction.user.username}`;
                        const waitingRoom = interaction.guild.channels.cache.find(c => c.name === waitingName && c.parentId === memberVoice.parentId);

                        if (!waitingRoom) return interaction.reply({ content: '❌ Kamu belum mengaktifkan Waiting Room. Klik tombol **Waiting Room** terlebih dahulu!', ephemeral: true });
                        if (waitingRoom.members.size === 0) return interaction.reply({ content: '👀 Saat ini tidak ada siapapun di dalam Waiting Room-mu.', ephemeral: true });

                        const options = waitingRoom.members.map(m => ({
                            label: m.user.username,
                            value: m.id,
                            description: 'Pindahkan ke ruanganku'
                        }));

                        const selectMenu = new StringSelectMenuBuilder()
                            .setCustomId('tvc_move_select')
                            .setPlaceholder('Pilih user untuk ditarik ke dalam...')
                            .addOptions(options.slice(0, 25));

                        return interaction.reply({ components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });
                    }

                    // MODALS TRIGGER
                    if (interaction.customId === 'tvc_rename') {
                        const modal = new ModalBuilder().setCustomId('modal_tvc_rename').setTitle('✏️ Ubah Nama Ruangan');
                        const inputName = new TextInputBuilder().setCustomId('input_name').setLabel('Masukkan nama baru:').setStyle(TextInputStyle.Short).setMaxLength(30).setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(inputName));
                        return interaction.showModal(modal);
                    }
                    if (interaction.customId === 'tvc_limit') {
                        const modal = new ModalBuilder().setCustomId('modal_tvc_limit').setTitle('👥 Atur Batas Pengguna');
                        const inputLimit = new TextInputBuilder().setCustomId('input_limit').setLabel('Batas maksimal (0 untuk Bebas):').setStyle(TextInputStyle.Short).setMaxLength(2).setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(inputLimit));
                        return interaction.showModal(modal);
                    }
                } catch (error) {
                    console.error('[TEMP-VOICE ERROR]', error);
                    return interaction.reply({ content: '❌ Gagal menerapkan pengaturan. Pastikan bot memiliki izin yang cukup.', ephemeral: true });
                }
            }
        }

        // ==========================================
        // 3. 📋 SELECT MENU ROUTER (DROPDOWNS)
        // ==========================================
        if (interaction.isStringSelectMenu()) {
            
            // ------------------------------------------
            // 📩 MODMAIL SERVER SELECTION
            // ------------------------------------------
            if (interaction.customId === 'modmail_select_guild') {
                const targetGuildId = interaction.values[0];
                const guild = client.guilds.cache.get(targetGuildId);
                
                if (!guild) return interaction.reply({ content: '❌ Server tidak ditemukan.', ephemeral: true });

                const guildData = await GuildSettings.findOne({ where: { guildId: targetGuildId } });
                const categoryId = guildData?.settings?.modmail?.categoryId;

                if (!categoryId) return interaction.reply({ content: '❌ Konfigurasi modmail server tersebut telah rusak/dihapus admin.', ephemeral: true });

                let existingThread = await ModMail.findOne({ where: { userId: interaction.user.id, closed: false } });
                if (existingThread) {
                    return interaction.reply({ content: `❌ Kamu sudah memiliki sesi Modmail yang aktif! Selesaikan dulu sesi sebelumnya.`, ephemeral: true });
                }

                try {
                    const mailChannel = await guild.channels.create({
                        name: `mail-${interaction.user.username}`,
                        type: ChannelType.GuildText,
                        parent: categoryId,
                        topic: `User: ${interaction.user.tag} | ID: ${interaction.user.id}`
                    });

                    await ModMail.create({ userId: interaction.user.id, channelId: mailChannel.id });

                    const staffEmbed = new EmbedBuilder()
                        .setColor('#00FFFF')
                        .setTitle('🆕 Sesi Modmail Baru')
                        .setDescription(`Menerima koneksi baru dari **${interaction.user.tag}** (<@${interaction.user.id}>).\nKetik pesan di channel ini untuk membalas ke DM-nya.\n\nKetik \`n!close\` untuk mengakhiri sesi.`)
                        .setThumbnail(interaction.user.displayAvatarURL());

                    await mailChannel.send({ content: '@here', embeds: [staffEmbed] });

                    const successEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setDescription(`✅ **Berhasil Terhubung!**\nKamu sekarang sedang berbicara dengan Staff dari **${guild.name}**.\n\nSilakan ketik pesanmu langsung di DM ini, Naura akan meneruskannya ke mereka.`);
                    
                    await interaction.update({ embeds: [successEmbed], components: [] });
                } catch (error) {
                    return interaction.update({ content: '❌ Gagal membuat sesi di server tersebut (Bot kekurangan izin Manage Channels).', embeds: [], components: [] });
                }
            }

            // ------------------------------------------
            // ➡️ TEMP VOICE MOVE USER
            // ------------------------------------------
            if (interaction.customId === 'tvc_move_select') {
                const targetId = interaction.values[0];
                const targetMember = await interaction.guild.members.fetch(targetId).catch(()=>null);
                const ownerVoice = interaction.member.voice.channel;

                if (!targetMember || !targetMember.voice.channel) return interaction.reply({ content: '❌ User tersebut sudah meninggalkan Voice Channel.', ephemeral: true });
                if (!ownerVoice) return interaction.reply({ content: '❌ Kamu tidak berada di voice channel.', ephemeral: true });

                try {
                    await ownerVoice.permissionOverwrites.edit(targetId, { Connect: true, Speak: true });
                    await targetMember.voice.setChannel(ownerVoice);
                    return interaction.reply({ content: `✅ Berhasil menarik **${targetMember.user.username}** ke dalam ruanganmu.`, ephemeral: true });
                } catch (error) {
                    return interaction.reply({ content: '❌ Gagal memindahkan user. Pastikan Naura memiliki izin Administrator/Move Members.', ephemeral: true });
                }
            }
        }

        // ==========================================
        // 4. 📝 MODALS ROUTER (FORM SUBMISSIONS)
        // ==========================================
        if (interaction.isModalSubmit()) {
            if (interaction.customId.startsWith('modal_tvc_')) {
                const memberVoice = interaction.member.voice.channel;
                if (!memberVoice) return interaction.reply({ content: '❌ Kamu sudah keluar dari Voice Channel!', ephemeral: true });

                try {
                    if (interaction.customId === 'modal_tvc_rename') {
                        const newName = interaction.fields.getTextInputValue('input_name');
                        await memberVoice.setName(newName);
                        return interaction.reply({ content: `✅ Nama diubah menjadi **${newName}**! *(Limit Discord: 2x per 10 menit)*`, ephemeral: true });
                    }
                    if (interaction.customId === 'modal_tvc_limit') {
                        let limit = parseInt(interaction.fields.getTextInputValue('input_limit'));
                        if (isNaN(limit) || limit < 0 || limit > 99) limit = 0;
                        await memberVoice.setUserLimit(limit);
                        return interaction.reply({ content: `✅ Kapasitas dibatasi menjadi **${limit === 0 ? 'Tanpa Batas' : limit + ' Orang'}**.`, ephemeral: true });
                    }
                } catch (error) {
                    if (error.code === 50024 || error.message.includes('rate limit')) {
                        return interaction.reply({ content: `⚠️ **Rate Limit Discord:** Kamu mengganti nama terlalu cepat! Coba lagi dalam 10 menit.`, ephemeral: true });
                    }
                    return interaction.reply({ content: `❌ Gagal menyimpan perubahan ke server Discord.`, ephemeral: true });
                }
            }
        }

    }
};