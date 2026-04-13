const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup')
        .setDescription('Pusat Pengaturan Sistem Naura')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // SUBCOMMAND: TICKET
        .addSubcommand(sub => sub
            .setName('ticket')
            .setDescription('Setup Sistem Tiket')
            .addChannelOption(opt => opt.setName('kategori').setDescription('Kategori tempat tiket dibuat').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
            .addChannelOption(opt => opt.setName('log').setDescription('Channel untuk transkrip & log tiket').addChannelTypes(ChannelType.GuildText).setRequired(true))
            .addRoleOption(opt => opt.setName('admin_role').setDescription('Role yang bisa melihat tiket').setRequired(true))
        )
        // SUBCOMMAND: TEMPVOICE
        .addSubcommand(sub => sub
            .setName('tempvoice')
            .setDescription('Setup Sistem Voice Channel Sementara')
            .addChannelOption(opt => opt.setName('trigger').setDescription('Voice Channel untuk "Join to Create"').addChannelTypes(ChannelType.GuildVoice).setRequired(true))
            .addChannelOption(opt => opt.setName('kategori').setDescription('Kategori tempat Room dibuat').addChannelTypes(ChannelType.GuildCategory).setRequired(true))
            .addBooleanOption(opt => opt.setName('status').setDescription('Aktifkan fitur ini?').setRequired(true))
        )
        // SUBCOMMAND: AUTOMOD
        .addSubcommand(sub => sub
            .setName('automod')
            .setDescription('Setup Keamanan Otomatis')
            .addBooleanOption(opt => opt.setName('anti_invite').setDescription('Blokir link undangan server lain?').setRequired(true))
            .addBooleanOption(opt => opt.setName('anti_caps').setDescription('Hapus pesan dengan huruf kapital berlebih?').setRequired(true))
            .addIntegerOption(opt => opt.setName('mass_mention').setDescription('Batas maksimal mention dalam satu pesan (Default: 5)').setRequired(false))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // Ambil data dari MySQL (atau buat jika belum ada)
        const [guildData] = await GuildSettings.findOrCreate({ where: { guildId } });
        let currentSettings = guildData.settings || {};

        const successEmbed = new EmbedBuilder()
            .setColor(ui.getColor('primary')) // Warna Aqua khas Aryan
            .setTimestamp()
            .setFooter({ text: 'Sistem Konfigurasi Naura Versi 1.0.0' });

        // --- LOGIKA SETUP TICKET ---
        if (sub === 'ticket') {
            const category = interaction.options.getChannel('kategori');
            const log = interaction.options.getChannel('log');
            const role = interaction.options.getRole('admin_role');

            currentSettings.ticket = {
                categoryId: category.id,
                logChannelId: log.id,
                roleAdminId: role.id
            };

            successEmbed.setTitle('🎫 Setup Tiket Berhasil')
                .setDescription(`Sistem tiket telah dikonfigurasi dan disimpan ke Database.\n\n${ui.getEmoji('progressDot')} **Kategori:** ${category.name}\n${ui.getEmoji('progressDot')} **Log Channel:** <#${log.id}>\n${ui.getEmoji('progressDot')} **Support Role:** <@&${role.id}>`);
        }

        // --- LOGIKA SETUP TEMPVOICE ---
        if (sub === 'tempvoice') {
            const trigger = interaction.options.getChannel('trigger');
            const category = interaction.options.getChannel('kategori');
            const status = interaction.options.getBoolean('status');

            currentSettings.tempVoice = {
                triggerChannelId: trigger.id,
                categoryId: category.id,
                enabled: status
            };

            successEmbed.setTitle('🔊 Setup TempVoice Berhasil')
                .setDescription(`Konfigurasi Voice Channel sementara telah diperbarui.\n\n${ui.getEmoji('progressDot')} **Trigger Channel:** ${trigger.name}\n${ui.getEmoji('progressDot')} **Category:** ${category.name}\n${ui.getEmoji('progressDot')} **Status:** ${status ? 'AKTIF' : 'NONAKTIF'}`);
        }

        // --- LOGIKA SETUP AUTOMOD ---
        if (sub === 'automod') {
            const invite = interaction.options.getBoolean('anti_invite');
            const caps = interaction.options.getBoolean('anti_caps');
            const mention = interaction.options.getInteger('mass_mention') || 5;

            currentSettings.automod = {
                antiInvite: invite,
                antiCaps: caps,
                massMention: mention,
                enabled: true
            };

            successEmbed.setTitle('🛡️ Setup Automod Berhasil')
                .setDescription(`Sistem keamanan otomatis Naura telah diperbarui.\n\n${ui.getEmoji('progressDot')} **Anti-Invite:** ${invite ? 'ON' : 'OFF'}\n${ui.getEmoji('progressDot')} **Anti-Caps:** ${caps ? 'ON' : 'OFF'}\n${ui.getEmoji('progressDot')} **Mass Mention Limit:** ${mention}`);
        }

        // SIMPAN KE MYSQL
        guildData.settings = currentSettings;
        guildData.changed('settings', true); // Memberitahu Sequelize bahwa JSON telah berubah
        await guildData.save();

        await interaction.reply({ embeds: [successEmbed] });
    }
};
