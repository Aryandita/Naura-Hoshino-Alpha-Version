const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType, AttachmentBuilder } = require('discord.js');
const os = require('os');
const { version: djsVersion } = require('discord.js');
const ui = require('../../config/ui');

const SUPPORT_SERVER = 'https://dsc.gg/naura-hoshino';
const DASHBOARD_URL = 'http://92.118.206.166:30398';
const INVITE_LINK = 'https://discord.com/api/oauth2/authorize?client_id=1483665745727721543&permissions=8&scope=bot%20applications.commands';

function formatUptime(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    return `${days}h ${hours}m ${minutes}s`;
}

function createNavButtons() {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Support Server').setURL(SUPPORT_SERVER).setStyle(ButtonStyle.Link).setEmoji('💬'),
        new ButtonBuilder().setLabel('Web Dashboard').setURL(DASHBOARD_URL).setStyle(ButtonStyle.Link).setEmoji('🌐'),
        new ButtonBuilder().setLabel('Invite Naura').setURL(INVITE_LINK).setStyle(ButtonStyle.Link).setEmoji('✨')
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('core')
        .setDescription('⚙️ Menu Utama & Informasi Sistem Inti Naura Hoshino')
        .addSubcommand(sub => sub.setName('ping').setDescription('🏓 Cek kecepatan respons (latensi) Naura.'))
        .addSubcommand(sub => sub.setName('stats').setDescription('📊 Lihat statistik server, RAM, dan sistem Naura.'))
        .addSubcommand(sub => sub.setName('about').setDescription('👧🏻 Kenalan lebih dekat dengan Naura Hoshino!'))
        .addSubcommand(sub => sub.setName('help').setDescription('📚 Buka pusat bantuan dan daftar perintah lengkap.')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const client = interaction.client;
        const loadingEmoji = ui.emojis?.loading || '⏳';

        if (subcommand === 'ping') {
            const sent = await interaction.reply({ content: `${loadingEmoji} Menghitung latensi jaringan...`, fetchReply: true });
            const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
            const websocketLatency = Math.round(client.ws.ping);

            const bannerAttachment = new AttachmentBuilder(ui.banners.ping, { name: 'banner_ping.png' });

            const embed = new EmbedBuilder()
                .setColor(ui.colors.primary || '#00FFFF')
                .setAuthor({ name: '🏓 Pong! Koneksi Stabil', iconURL: client.user.displayAvatarURL() })
                .addFields(
                    { name: '📡 Latensi Bot (API)', value: `\`${roundtripLatency} ms\``, inline: true },
                    { name: '🌐 Latensi Discord (WS)', value: `\`${websocketLatency} ms\``, inline: true }
                )
                .setImage('attachment://banner_ping.png')
                .setFooter({ text: 'Sistem Naura Hoshino Ultimate' });

            return interaction.editReply({ content: null, embeds: [embed], components: [createNavButtons()], files: [bannerAttachment] });
        }

        else if (subcommand === 'stats') {
            await interaction.deferReply();
            const totalMemory = (os.totalmem() / 1024 / 1024).toFixed(2);
            const usedMemory = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
            
            const bannerAttachment = new AttachmentBuilder(ui.banners.stats, { name: 'banner_stats.png' });

            const embed = new EmbedBuilder()
                .setColor(ui.colors.kythiaDark || '#2b2d31')
                .setAuthor({ name: '📊 Statistik Sistem Naura', iconURL: client.user.displayAvatarURL() })
                .addFields(
                    { name: '👩🏻‍💻 Developer Info', value: `> **Nama Bot:** ${client.user.tag}\n> **Diciptakan oleh:** Aryandita Praftian`, inline: false },
                    { name: '🖥️ Status Server', value: `> **Uptime:** ${formatUptime(client.uptime)}\n> **Jaringan:** ${client.guilds.cache.size} Guilds | ${client.users.cache.size} Users`, inline: false },
                    { name: '⚙️ Spesifikasi Mesin', value: `> **RAM Terpakai:** ${usedMemory} MB / ${totalMemory} MB\n> **Mesin:** Node.js ${process.version} | Djs v${djsVersion}\n> **Platform:** ${os.type()} ${os.release()}`, inline: false }
                )
                .setImage('attachment://banner_stats.png')
                .setFooter({ text: 'Sistem Operasi Stabil' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed], components: [createNavButtons()], files: [bannerAttachment] });
        }

        else if (subcommand === 'about') {
            const bannerAttachment = new AttachmentBuilder(ui.banners.about, { name: 'banner_about.png' });

            const embed = new EmbedBuilder()
                .setColor(ui.colors.accent || '#FF69B4')
                .setAuthor({ name: '🎀 Tentang Naura Hoshino', iconURL: client.user.displayAvatarURL() })
                .setDescription(
                    `Halo! Namaku **Naura Hoshino**! Aku adalah asisten virtual multi-fungsi cerdas yang dirancang khusus untuk menemani harimu di Discord.\n\n` +
                    `Aku bukan sekadar bot biasa, lho! Aku punya mesin otak *AI (Google Gemini)*, sistem pemutar musik revolusioner, serta ekosistem RPG ekonomi yang siap membuat server ini menjadi hidup.\n\n` +
                    `**Visi Naura:** Menjadi asisten paling setia dan imut di seluruh jaringan Discord! ✨\n` +
                    `*(Psst... Aku sangat menyayangi Aryan si pembuatku!)*`
                )
                .setImage('attachment://banner_about.png')
                .setFooter({ text: 'Naura v1.0.0' });

            return interaction.reply({ embeds: [embed], components: [createNavButtons()], files: [bannerAttachment] });
        }
        
        // ... (Logika help bisa Anda sesuaikan polanya seperti di atas) ...
    }
};