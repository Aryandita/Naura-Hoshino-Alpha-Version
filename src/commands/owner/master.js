const { SlashCommandBuilder, EmbedBuilder, ActivityType, ChannelType, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

const OWNER_ID = '795241173009825853'; 

module.exports = {
    data: new SlashCommandBuilder()
        .setName('master')
        .setDescription('👑 [OWNER ONLY] Panel Kontrol Pusat Master Ryaa')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        .addSubcommand(sub => sub.setName('restart').setDescription('Merestart sistem inti Naura.'))
        .addSubcommand(sub => sub.setName('setpfp').setDescription('Mengganti foto profil Naura.')
            .addAttachmentOption(opt => opt.setName('gambar').setDescription('Upload gambar').setRequired(true)))
        .addSubcommand(sub => sub.setName('setactivity').setDescription('Mengubah status aktivitas Naura.')
            .addStringOption(opt => opt.setName('tipe').setDescription('Tipe aktivitas').setRequired(true).addChoices({ name: 'Playing', value: 'Playing' }, { name: 'Watching', value: 'Watching' }, { name: 'Listening', value: 'Listening' }, { name: 'Streaming', value: 'Streaming' }))
            .addStringOption(opt => opt.setName('teks').setDescription('Teks aktivitas').setRequired(true)))
        
        // 🎫 SETUP TICKET
        .addSubcommand(sub => sub.setName('setup_ticket').setDescription('Setup sistem tiket.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel panel tiket').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addChannelOption(opt => opt.setName('kategori').setDescription('Kategori untuk tiket baru').addChannelTypes(ChannelType.GuildCategory).setRequired(true)))

        .addSubcommand(sub => sub.setName('setup_minecraft').setDescription('Setup status server Minecraft.')
            .addStringOption(opt => opt.setName('ip').setDescription('IP Server Minecraft').setRequired(true))
            .addIntegerOption(opt => opt.setName('port').setDescription('Port').setRequired(false)))
        
        // 🔊 SETUP TEMP VOICE
        .addSubcommand(sub => sub.setName('setup_tempvoice').setDescription('Auto-Setup Kategori, Voice, dan Panel TempVoice.'))

        .addSubcommand(sub => sub.setName('setup_sticky').setDescription('Setup pesan lengket.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel target').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addStringOption(opt => opt.setName('pesan').setDescription('Isi pesan').setRequired(true)))
        .addSubcommand(sub => sub.setName('setup_announcement').setDescription('Setup channel pengumuman.')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel pengumuman').addChannelTypes(ChannelType.GuildText).setRequired(true)))
        .addSubcommand(sub => sub.setName('setup_autorole').setDescription('Setup role otomatis.')
            .addRoleOption(opt => opt.setName('role').setDescription('Role').setRequired(true)))
        .addSubcommand(sub => sub.setName('setup_autoreply').setDescription('Setup balasan otomatis.')
            .addStringOption(opt => opt.setName('trigger').setDescription('Kata pemicu').setRequired(true))
            .addStringOption(opt => opt.setName('response').setDescription('Balasan').setRequired(true))),

    async execute(interaction) {
        if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ Hmph! Kamu bukan Masterku!', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guildId;

        let guildData = await GuildSettings.findOne({ guildId: guildId });
        if (!guildData) guildData = new GuildSettings({ guildId: guildId });

        const embedSuccess = new EmbedBuilder().setColor('#00ffcc');

        try {
            if (subcommand === 'restart') {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#ffcc00').setDescription('🔄 Memulai ulang sistem...')] });
                process.exit(0); 
            }
            else if (subcommand === 'setpfp') {
                const image = interaction.options.getAttachment('gambar');
                await interaction.client.user.setAvatar(image.url);
                return interaction.editReply({ embeds: [embedSuccess.setDescription('✅ Foto profil diperbarui!')] });
            }
            else if (subcommand === 'setactivity') {
                const type = interaction.options.getString('tipe');
                const text = interaction.options.getString('teks');
                interaction.client.user.setActivity(text, { type: ActivityType[type] });
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ Status diubah menjadi: **${type} ${text}**`)] });
            }
            
            // ==========================================
            // 🎫 TICKET LOGIC
            // ==========================================
            else if (subcommand === 'setup_ticket') {
                const channel = interaction.options.getChannel('channel');
                const kategori = interaction.options.getChannel('kategori');

                guildData.ticket = { channelId: channel.id, categoryId: kategori.id };
                await guildData.save();

                const ticketEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('🎫 Pusat Bantuan Server')
                    .setDescription('Butuh bantuan? Silakan klik tombol di bawah untuk membuat tiket. Master/Admin akan segera merespons!');
                
                const ticketBtn = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('ticket_create').setLabel('Buat Tiket').setEmoji('📩').setStyle(ButtonStyle.Primary)
                );

                await channel.send({ embeds: [ticketEmbed], components: [ticketBtn] });
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ Sistem Tiket berhasil dikonfigurasi di <#${channel.id}>.`)] });
            }

            else if (subcommand === 'setup_minecraft') {
                const ip = interaction.options.getString('ip');
                const port = interaction.options.getInteger('port') || 25565;
                guildData.minecraft = { ip: ip, port: port };
                await guildData.save();
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ Server Minecraft didaftarkan!\n> IP: **${ip}:${port}**`)] });
            }
            
            // ==========================================
            // 🔊 TEMP VOICE LOGIC
            // ==========================================
            else if (subcommand === 'setup_tempvoice') {
                const guild = interaction.guild;
                const category = await guild.channels.create({ name: '🔊 Temporary Voice', type: ChannelType.GuildCategory });
                const controlChannel = await guild.channels.create({
                    name: '🎛️・voice-control', type: ChannelType.GuildText, parent: category.id,
                    topic: 'Panel kontrol untuk mengatur Voice Channel pribadimu.'
                });
                const voiceChannel = await guild.channels.create({ name: '➕ Join to Create', type: ChannelType.GuildVoice, parent: category.id });

                const embedPanel = new EmbedBuilder()
                    .setColor('#00ffcc')
                    .setTitle('🎛️ Voice Control Panel')
                    .setDescription('Masuk ke channel **➕ Join to Create** untuk membuat Voice Channel pribadimu.\nGunakan tombol di bawah ini untuk mengatur ruangamu.');

                const btnRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('tvc_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('tvc_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('tvc_rename').setLabel('Ubah Nama').setEmoji('✏️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('tvc_limit').setLabel('Atur Limit').setEmoji('👥').setStyle(ButtonStyle.Secondary)
                );

                await controlChannel.send({ embeds: [embedPanel], components: [btnRow] });

                guildData.tempVoice = { channelId: voiceChannel.id, categoryId: category.id };
                await guildData.save();

                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Sistem Temp Voice berhasil dibuat!**\nCek <#${controlChannel.id}>.`)] });
            }

            else if (subcommand === 'setup_sticky') {
                const channel = interaction.options.getChannel('channel');
                guildData.stickyMessage = { channelId: channel.id, message: interaction.options.getString('pesan') };
                await guildData.save();
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ Sticky dipasang di <#${channel.id}>.`)] });
            }
            else if (subcommand === 'setup_announcement') {
                const channel = interaction.options.getChannel('channel');
                guildData.announcementChannel = channel.id;
                await guildData.save();
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ Channel pengumuman ditetapkan ke <#${channel.id}>`)] });
            }
            else if (subcommand === 'setup_autorole') {
                const role = interaction.options.getRole('role');
                guildData.autoRole = role.id;
                await guildData.save();
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ Auto-Role diaktifkan untuk <@&${role.id}>`)] });
            }
            else if (subcommand === 'setup_autoreply') {
                const trigger = interaction.options.getString('trigger').toLowerCase();
                const response = interaction.options.getString('response');
                if (!guildData.autoReplies) guildData.autoReplies = [];
                const existingIndex = guildData.autoReplies.findIndex(r => r.trigger === trigger);
                if (existingIndex !== -1) guildData.autoReplies[existingIndex].response = response;
                else guildData.autoReplies.push({ trigger: trigger, response: response });
                await guildData.save();
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ Auto-Reply ditambahkan untuk kata: **${trigger}**`)] });
            }
        } catch (error) {
            console.error(error);
            return interaction.editReply({ content: '❌ Terjadi kesalahan.', embeds: [] });
        }
    }
};