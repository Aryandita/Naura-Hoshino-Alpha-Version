const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-automod')
        .setDescription('🛡️ [ADMIN] Konfigurasi sistem Automod & Isolasi (Poin Tata Krama).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addBooleanOption(opt => opt.setName('aktifkan').setDescription('Aktifkan sistem Automod & Poin Tata Krama?').setRequired(true)),

    async execute(interaction) {
        const aktifkan = interaction.options.getBoolean('aktifkan');

        await interaction.deferReply();

        let [settings] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guild.id } });
        let currentSettings = settings.settings || {};
        let automodSettings = currentSettings.automod || {};

        if (!aktifkan) {
            automodSettings.enabled = false;
            currentSettings.automod = automodSettings;
            settings.settings = currentSettings;
            settings.changed('settings', true);
            await settings.save();

            return interaction.editReply({ embeds: [
                new EmbedBuilder().setColor('#FF0000').setDescription('🛑 **Sistem Automod dinonaktifkan.**')
            ]});
        }

        let punishRole = interaction.guild.roles.cache.get(automodSettings.punishRole);
        
        if (!punishRole) {
            punishRole = interaction.guild.roles.cache.find(r => r.name === 'Anak Nakal');
        }

        if (!punishRole) {
            try {
                punishRole = await interaction.guild.roles.create({
                    name: 'Anak Nakal',
                    color: '#000001',
                    reason: 'Automod Punishment Role - Isolasi akses member'
                });

                const channels = interaction.guild.channels.cache.values();
                for (const channel of channels) {
                    if (channel.isTextBased() || channel.isVoiceBased()) {
                        await channel.permissionOverwrites.create(punishRole, {
                            ViewChannel: false,
                            SendMessages: false,
                            Connect: false
                        }).catch(() => {});
                    }
                }
            } catch (error) {
                return interaction.editReply({ embeds: [
                    new EmbedBuilder().setColor(ui.getColor ? ui.getColor('error') : '#FF0000').setDescription('❌ **Gagal membuat Role Anak Nakal!** Pastikan posisi bot berada di paling atas.')
                ]});
            }
        }

        automodSettings.enabled = true;
        automodSettings.punishRole = punishRole.id;
        automodSettings.antiInvite = true;
        automodSettings.antiSpam = true;
        automodSettings.antiCaps = true;
        
        currentSettings.automod = automodSettings;
        settings.settings = currentSettings;
        settings.changed('settings', true);
        await settings.save();

        const embed = new EmbedBuilder()
            .setColor(ui.getColor ? ui.getColor('success') : '#00FF00')
            .setTitle('🛡️ Automod & Poin Tata Krama Aktif!')
            .setDescription(`Semua konfigurasi pengamanan diaktifkan.\n\nSetiap member yang melanggar aturan (Link ilegal, Kasar, Spam, Tag berlebih) akan kehilangan **Poin Tata Krama**.\nJika poin mencapai 0, mereka akan otomatis diberikan role <@&${punishRole.id}> dan terisolasi dari seluruh channel!`)
            .setFooter({ text: 'Gunakan n!setup-automod untuk menonaktifkan' });

        await interaction.editReply({ embeds: [embed] });
    }
};
