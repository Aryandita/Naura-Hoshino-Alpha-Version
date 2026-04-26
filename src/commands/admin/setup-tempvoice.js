const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelSelectMenuBuilder,
    ChannelType
} = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-tempvoice')
        .setDescription('🎙️ [ADMIN] Setup Temp Voice interaktif (Menu Formulir)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        let [db] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guild.id } });
        let currentSettings = db.settings || {};
        
        let session = {
            categoryId: currentSettings.tempvoice?.categoryId || null,
            triggerChannelId: currentSettings.tempvoice?.triggerChannelId || null,
            panelChannelId: currentSettings.tempvoice?.panelChannelId || null
        };

        const generateDashboard = () => {
            const embed = new EmbedBuilder()
                .setColor(ui.getColor('primary'))
                .setTitle('🎙️ Setup Temp Voice (Voice Master)')
                .setDescription('Gunakan menu di bawah ini untuk mengatur Ruang Suara Sementara.\n\n**Konfigurasi Saat Ini:**\n' +
                    `> 📁 **Kategori Penampung:** ${session.categoryId ? `<#${session.categoryId}>` : '*Belum diatur*'}\n` +
                    `> 🚪 **Channel Pemicu (Join to Create):** ${session.triggerChannelId ? `<#${session.triggerChannelId}>` : '*Belum diatur*'}\n` +
                    `> 🎛️ **Channel Kontrol Panel:** ${session.panelChannelId ? `<#${session.panelChannelId}>` : '*Belum diatur*'}`
                )
                .setFooter({ text: 'Naura Interactive Setup' });

            const rowCategory = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId('stv_select_category').setPlaceholder('1️⃣ Pilih Kategori untuk Ruangan Baru').addChannelTypes(ChannelType.GuildCategory)
            );
            const rowTrigger = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId('stv_select_trigger').setPlaceholder('2️⃣ Pilih Voice Channel Pemicu (Join to Create)').addChannelTypes(ChannelType.GuildVoice)
            );
            const rowPanel = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId('stv_select_panel').setPlaceholder('3️⃣ Pilih Text Channel untuk Kontrol Panel').addChannelTypes(ChannelType.GuildText)
            );

            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('stv_save').setLabel('Simpan & Kirim Panel').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(!session.categoryId || !session.triggerChannelId || !session.panelChannelId),
                new ButtonBuilder().setCustomId('stv_cancel').setLabel('Batalkan').setStyle(ButtonStyle.Danger)
            );

            return { embeds: [embed], components: [rowCategory, rowTrigger, rowPanel, rowBtns], ephemeral: true };
        };

        const response = await interaction.reply(generateDashboard());
        const collector = response.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Sesi ini bukan milikmu.', ephemeral: true });

            if (i.isChannelSelectMenu() && i.customId === 'stv_select_category') {
                session.categoryId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isChannelSelectMenu() && i.customId === 'stv_select_trigger') {
                session.triggerChannelId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isChannelSelectMenu() && i.customId === 'stv_select_panel') {
                session.panelChannelId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isButton() && i.customId === 'stv_cancel') {
                collector.stop();
                await i.update({ content: '❌ Setup dibatalkan.', embeds: [], components: [] });
            }

            if (i.isButton() && i.customId === 'stv_save') {
                currentSettings.tempvoice = {
                    enabled: true,
                    categoryId: session.categoryId,
                    triggerChannelId: session.triggerChannelId,
                    panelChannelId: session.panelChannelId
                };
                db.settings = currentSettings;
                db.changed('settings', true);
                await db.save();

                const panelChannel = interaction.guild.channels.cache.get(session.panelChannelId);
                if (!panelChannel) return i.reply({ content: 'Channel panel tidak ditemukan.', ephemeral: true });

                const dot = (ui.getEmoji && ui.getEmoji('progressDot')) || '•';
                const lockEmoji = (ui.getEmoji && ui.getEmoji('lock')) || '🔒';
                const unlockEmoji = (ui.getEmoji && ui.getEmoji('unlock')) || '🔓';
                const renameEmoji = (ui.getEmoji && ui.getEmoji('rename')) || '✏️';
                const limitEmoji = (ui.getEmoji && ui.getEmoji('limit')) || '👥';
                const hideEmoji = (ui.getEmoji && ui.getEmoji('hide')) || '👻';
                const unhideEmoji = (ui.getEmoji && ui.getEmoji('unhide')) || '👁️';
                const stageEmoji = (ui.getEmoji && ui.getEmoji('stage')) || '🎤';
                const waitingEmoji = (ui.getEmoji && ui.getEmoji('waiting')) || '⏳';
                const moveEmoji = (ui.getEmoji && ui.getEmoji('move')) || '➡️';

                const controlEmbed = new EmbedBuilder()
                    .setColor(ui.getColor('primary') || '#2b2d31')
                    .setAuthor({ name: '🎛️ Voice Control Panel', iconURL: interaction.guild.iconURL() })
                    .setDescription(`Kelola **Ruang Suara Pribadi** milikmu menggunakan tombol interaktif di bawah ini.\n*(Pastikan kamu sedang berada di dalam Voice Channel milikmu)*\n\n` + 
                        `**Manajemen Akses:**\n` +
                        `${dot} ${lockEmoji} / ${unlockEmoji} : Kunci / Buka akses ruangan.\n` +
                        `${dot} ${hideEmoji} / ${unhideEmoji} : Sembunyikan / Tampilkan ruangan.\n\n` +
                        `**Mode Spesial:**\n` +
                        `${dot} ${stageEmoji} **Stage Mode**: Bisukan (Mute) semua orang selain kamu.\n` +
                        `${dot} ${waitingEmoji} **Waiting Room**: Buat ruang tunggu untuk tamu.\n` +
                        `${dot} ${moveEmoji} **Move**: Tarik orang dari Ruang Tunggu ke sini.\n\n` +
                        `**Lainnya:**\n` +
                        `${dot} ${renameEmoji} **Rename** | ${limitEmoji} **Limit**`)
                    .setFooter({ text: 'Akses Ditolak: Hanya pemilik channel yang bisa menggunakan panel ini.' });

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('tvc_lock').setEmoji(lockEmoji).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tvc_unlock').setEmoji(unlockEmoji).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tvc_hide').setEmoji(hideEmoji).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tvc_unhide').setEmoji(unhideEmoji).setStyle(ButtonStyle.Secondary)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('tvc_stage').setLabel('Stage Mode').setEmoji(stageEmoji).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('tvc_waiting').setLabel('Waiting Room').setEmoji(waitingEmoji).setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('tvc_move').setLabel('Move User').setEmoji(moveEmoji).setStyle(ButtonStyle.Success)
                );

                const row3 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('tvc_rename').setLabel('Rename').setEmoji(renameEmoji).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tvc_limit').setLabel('Limit').setEmoji(limitEmoji).setStyle(ButtonStyle.Secondary)
                );

                await panelChannel.send({ embeds: [controlEmbed], components: [row1, row2, row3] });
                
                collector.stop();
                await i.update({ content: `✅ Pengaturan Temp Voice disimpan dan panel dikirim ke <#${session.panelChannelId}>!`, embeds: [], components: [] });
            }
        });
    }
};