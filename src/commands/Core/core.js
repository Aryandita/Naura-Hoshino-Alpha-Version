/**
 * @namespace: src/commands/Core/core.js
 * @type: Command
 * @copyright © 2026 Aryandita Praftian
 * @assistant Naura Hoshino
 * @version 1.1.0
 * @description Core system, statistics, and interactive help menu for Naura with Localization.
 */

const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder,
    AttachmentBuilder,
    ComponentType,
    version: djsVersion
} = require('discord.js');
const os = require('node:os');
const { sequelize } = require('../../managers/dbManager');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');
const env = require('../../config/env');

const locales = {
    id: require('./locales/id.json'),
    en: require('./locales/en.json')
};

// ==========================================
// 🔧 KONSTANTA & LINK BRANDING NAURA
// ==========================================
const LINKS = {
    SUPPORT: 'https://dsc.gg/naura-hoshino',
    DASHBOARD: 'http://92.118.206.166:30398',
    INVITE: 'https://discord.com/api/oauth2/authorize?client_id=1483665745727721543&permissions=8&scope=bot%20applications.commands'
};

// ==========================================
// 🛠️ FUNGSI UTILITAS LOKAL
// ==========================================
function formatUptime(ms) {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`;
}

function createNavButtons() {
    const supportEmoji = ui.getEmoji ? ui.getEmoji('support') : '💬';
    const dashboardEmoji = ui.getEmoji ? ui.getEmoji('dashboard') : '🌐';
    const inviteEmoji = ui.getEmoji ? ui.getEmoji('invite') : '✨';

    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setLabel('Support Server').setURL(LINKS.SUPPORT).setStyle(ButtonStyle.Link).setEmoji(supportEmoji),
        new ButtonBuilder().setLabel('Web Dashboard').setURL(LINKS.DASHBOARD).setStyle(ButtonStyle.Link).setEmoji(dashboardEmoji),
        new ButtonBuilder().setLabel('Invite Naura').setURL(LINKS.INVITE).setStyle(ButtonStyle.Link).setEmoji(inviteEmoji)
    );
}

// ==========================================
// 🚀 ROUTER COMMAND UTAMA
// ==========================================
module.exports = {
    data: new SlashCommandBuilder()
        .setName('core')
        .setDescription('⚙️ Pusat Informasi & Sistem Inti Naura Hoshino / Core System')
        .addSubcommand(sub => sub.setName('ping').setDescription('🏓 Cek respons latensi Discord, Database MySQL, & Lavalink.'))
        .addSubcommand(sub => sub.setName('stats').setDescription('📊 Lihat diagnostik spesifikasi server, RAM, dan OS Naura.'))
        .addSubcommand(sub => sub.setName('about').setDescription('👧🏻 Kenalan lebih dekat dengan Naura dan Developer Aryan!'))
        .addSubcommand(sub => sub.setName('help').setDescription('📚 Buka panduan perintah interaktif Naura.'))
        .addSubcommand(sub => sub.setName('language').setDescription('🌐 Ubah bahasa bot di server ini / Change bot language')
            .addStringOption(opt => opt.setName('lang').setDescription('Pilih bahasa / Select language').setRequired(true).addChoices(
                { name: 'Indonesian', value: 'id' },
                { name: 'English', value: 'en' }
            ))),

    aliases: ['ping', 'stats', 'about', 'help', 'language', 'lang'],

    async executePrefix(message, args, client) {
        const prefix = env.PREFIX || 'n!';
        const cmdName = message.content.slice(prefix.length).trim().split(/ +/)[0].toLowerCase();
        
        let subcommand = cmdName === 'core' ? (args[0] ? args[0].toLowerCase() : null) : cmdName;
        if (subcommand === 'lang') subcommand = 'language';

        let replyMsg = null;
        const mockInteraction = {
            client,
            user: message.author,
            createdTimestamp: message.createdTimestamp,
            deferReply: async () => {
                replyMsg = await message.reply({ content: `${ui.getEmoji ? ui.getEmoji('loading') : '⏳'} *Memproses...*` });
            },
            reply: async (payload) => {
                replyMsg = await message.reply(payload);
                return replyMsg;
            },
            editReply: async (payload) => {
                if (replyMsg) {
                    return await replyMsg.edit(payload);
                } else {
                    replyMsg = await message.reply(payload);
                    return replyMsg;
                }
            }
        };

        const guildId = message.guild ? message.guild.id : null;
        let langCode = 'id';
        if (guildId) {
            const settings = await GuildSettings.findOne({ where: { guildId } });
            if (settings && settings.system && settings.system.language) {
                langCode = settings.system.language;
            }
        }
        const lang = locales[langCode] || locales['id'];

        switch (subcommand) {
            case 'ping': return await handlePing(mockInteraction, client, lang);
            case 'stats': return await handleStats(mockInteraction, client, lang);
            case 'about': return await handleAbout(mockInteraction, client, lang);
            case 'help': return await handleHelp(mockInteraction, client, lang);
            case 'language': 
                let newLang = null;
                if (cmdName === 'core' && args[1]) newLang = args[1].toLowerCase();
                else if (cmdName !== 'core' && args[0]) newLang = args[0].toLowerCase();
                return await handleLanguage(mockInteraction, guildId, newLang, lang);
            default:
                return message.reply(lang.ERROR_INVALID_SUBCOMMAND || `${ui.getEmoji ? ui.getEmoji('error') : '❌'} Subcommand tidak valid.`);
        }
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const client = interaction.client;
        
        const guildId = interaction.guild ? interaction.guild.id : null;
        let langCode = 'id';
        if (guildId) {
            const settings = await GuildSettings.findOne({ where: { guildId } });
            if (settings && settings.system && settings.system.language) {
                langCode = settings.system.language;
            }
        }
        const lang = locales[langCode] || locales['id'];

        switch (subcommand) {
            case 'ping': return await handlePing(interaction, client, lang);
            case 'stats': return await handleStats(interaction, client, lang);
            case 'about': return await handleAbout(interaction, client, lang);
            case 'help': return await handleHelp(interaction, client, lang);
            case 'language':
                const newLang = interaction.options.getString('lang');
                return await handleLanguage(interaction, guildId, newLang, lang);
            default:
                return interaction.reply({ content: lang.ERROR_INVALID_SUBCOMMAND || `${ui.getEmoji ? ui.getEmoji('error') : '❌'} Subcommand tidak valid.`, ephemeral: true });
        }
    }
};

// ==========================================
// 🟢 1. PING SYSTEM (ADVANCED LATENCY)
// ==========================================
async function handlePing(interaction, client, lang) {
    const dot = ui.getEmoji ? ui.getEmoji('dot') : '<a:Arrow:1492696901051744298>';
    const loadingEmoji = ui.getEmoji ? ui.getEmoji('loading') : '⏳';
    
    let sent;
    if (interaction.reply && !interaction.deferred) {
        sent = await interaction.reply({ content: `${loadingEmoji} ${lang.PING_LOADING}`, fetchReply: true });
    } else {
        sent = await interaction.editReply({ content: `${loadingEmoji} ${lang.PING_LOADING}` });
    }
    
    const roundtripLatency = sent.createdTimestamp - interaction.createdTimestamp;
    const websocketLatency = Math.round(client.ws.ping);

    let dbPing = 'Offline';
    try {
        const dbStart = Date.now();
        await sequelize.authenticate();
        dbPing = `${Date.now() - dbStart}ms`;
    } catch (e) { dbPing = 'Error 🔴'; }

    let lavalinkPing = 'Offline 🔴';
    try {
        if (client.musicManager) {
            if (client.musicManager.shoukaku && client.musicManager.shoukaku.nodes.size > 0) {
                lavalinkPing = `${client.musicManager.shoukaku.nodes.first().ping}ms`;
            } else if (client.musicManager.nodes && client.musicManager.nodes.size > 0) {
                lavalinkPing = `${client.musicManager.nodes.first().ping}ms`;
            } else {
                lavalinkPing = 'Standby 🟡';
            }
        }
    } catch (e) {}

    const embed = new EmbedBuilder()
        .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
        .setAuthor({ name: 'Naura Telemetry System', iconURL: client.user.displayAvatarURL() })
        .setTitle(lang.PING_TITLE)
        .setDescription(lang.PING_DESC)
        .addFields(
            { name: lang.PING_NETWORK, value: `${dot} **${lang.PING_WS}:** \`${websocketLatency}ms\`\n${dot} **${lang.PING_API}:** \`${roundtripLatency}ms\``, inline: true },
            { name: lang.PING_DB_AUDIO, value: `${dot} **${lang.PING_MYSQL}:** \`${dbPing}\`\n${dot} **${lang.PING_LAVALINK}:** \`${lavalinkPing}\``, inline: true }
        )
        .setFooter({ text: 'Naura v1.1.0 Enterprise Edition' })
        .setTimestamp();

    const payload = { content: null, embeds: [embed], components: [createNavButtons()] };
    
    if (ui.banners && ui.banners.ping) {
        payload.files = [new AttachmentBuilder(ui.banners.ping, { name: 'banner.png' })];
        embed.setImage('attachment://banner.png');
    }

    if (interaction.editReply) return interaction.editReply(payload);
    return interaction.reply(payload);
}

// ==========================================
// 📊 2. STATS SYSTEM (HARDWARE DIAGNOSTIC)
// ==========================================
async function handleStats(interaction, client, lang) {
    if (interaction.deferReply && !interaction.deferred) await interaction.deferReply();
    const dot = ui.getEmoji ? ui.getEmoji('dot') : '<a:Arrow:1492696901051744298>';
    
    const totalMem = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
    const freeMem = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const usedMem = (totalMem - freeMem).toFixed(2);
    const botMem = (process.memoryUsage().rss / 1024 / 1024).toFixed(2);

    const cpuModel = os.cpus()[0].model.replace(/CPU|GHz|@|\(R\)|\(TM\)/g, '').trim();
    const cores = os.cpus().length;

    const embed = new EmbedBuilder()
        .setColor(ui.getColor ? ui.getColor('primary') : '#2b2d31')
        .setAuthor({ name: 'Naura Diagnostic Center', iconURL: client.user.displayAvatarURL() })
        .setTitle(lang.STATS_TITLE)
        .addFields(
            { name: lang.STATS_SERVER, value: `${dot} **${lang.STATS_PROCESSOR}:** ${cpuModel} (${cores} Cores)\n${dot} **${lang.STATS_OS}:** ${os.type()} ${os.arch()}\n${dot} **${lang.STATS_UPTIME}:** ${formatUptime(os.uptime() * 1000)}`, inline: false },
            { name: lang.STATS_RAM, value: `${dot} **${lang.STATS_RAM_SERVER}:** \`${usedMem}GB / ${totalMem}GB\`\n${dot} **${lang.STATS_RAM_BOT}:** \`${botMem} MB\``, inline: false },
            { name: lang.STATS_SOFTWARE, value: `${dot} **Node.js:** \`${process.version}\`\n${dot} **Discord.js:** \`v${djsVersion}\`\n${dot} **Engine:** \`Naura Core v1.1.0\``, inline: true },
            { name: lang.STATS_REACH, value: `${dot} **${lang.STATS_GUILDS}:** \`${client.guilds.cache.size}\`\n${dot} **${lang.STATS_USERS}:** \`${client.users.cache.size}\`\n${dot} **${lang.STATS_BOT_UPTIME}:** \`${formatUptime(client.uptime)}\``, inline: true }
        )
        .setFooter({ text: 'Engineered by Aryan' })
        .setTimestamp();

    const payload = { embeds: [embed], components: [createNavButtons()] };
    if (ui.banners && ui.banners.stats) {
        payload.files = [new AttachmentBuilder(ui.banners.stats, { name: 'banner.png' })];
        embed.setImage('attachment://banner.png');
    }

    if (interaction.editReply) return interaction.editReply(payload);
    return interaction.reply(payload);
}

// ==========================================
// 🎀 3. ABOUT SYSTEM
// ==========================================
async function handleAbout(interaction, client, lang) {
    const embed = new EmbedBuilder()
        .setColor(ui.getColor ? ui.getColor('accent') : '#FF69B4')
        .setAuthor({ name: 'System Identity', iconURL: client.user.displayAvatarURL() })
        .setTitle(lang.ABOUT_TITLE)
        .setDescription(lang.ABOUT_DESC)
        .setFooter({ text: 'Naura v1.1.0 Ultimate' });

    const payload = { embeds: [embed], components: [createNavButtons()] };
    if (ui.banners && ui.banners.about) {
        payload.files = [new AttachmentBuilder(ui.banners.about, { name: 'banner.png' })];
        embed.setImage('attachment://banner.png');
    }

    if (interaction.deferred || (interaction.editReply && !interaction.reply)) return interaction.editReply(payload);
    return interaction.reply(payload);
}

// ==========================================
// 📚 4. HELP SYSTEM (INTERACTIVE DROPDOWN)
// ==========================================
async function handleHelp(interaction, client, lang) {
    const categories = {
        core: {
            title: `${ui.getEmoji ? ui.getEmoji('help_core') : '⚙️'} ${lang.HELP_CAT_CORE_LABEL}`,
            desc: lang.HELP_CONTENT_CORE
        },
        economy: {
            title: `${ui.getEmoji ? ui.getEmoji('help_eco') : '💰'} ${lang.HELP_CAT_ECO_LABEL}`,
            desc: lang.HELP_CONTENT_ECO
        },
        music: {
            title: `${ui.getEmoji ? ui.getEmoji('help_music') : '🎵'} ${lang.HELP_CAT_MUSIC_LABEL}`,
            desc: lang.HELP_CONTENT_MUSIC
        },
        minigame: {
            title: `${ui.getEmoji ? ui.getEmoji('help_game') : '🎮'} ${lang.HELP_CAT_GAME_LABEL}`,
            desc: lang.HELP_CONTENT_GAME
        },
        admin: {
            title: `${ui.getEmoji ? ui.getEmoji('help_admin') : '🛡️'} ${lang.HELP_CAT_ADMIN_LABEL}`,
            desc: lang.HELP_CONTENT_ADMIN
        }
    };

    const embed = new EmbedBuilder()
        .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
        .setAuthor({ name: lang.HELP_TITLE, iconURL: client.user.displayAvatarURL() })
        .setTitle(lang.HELP_TITLE)
        .setDescription(lang.HELP_DESC)
        .setFooter({ text: lang.HELP_FOOTER });

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder(lang.HELP_PLACEHOLDER)
        .addOptions(
            { label: lang.HELP_CAT_CORE_LABEL, description: lang.HELP_CAT_CORE_DESC, value: 'core', emoji: ui.getEmoji ? ui.getEmoji('help_core') || '⚙️' : '⚙️' },
            { label: lang.HELP_CAT_ECO_LABEL, description: lang.HELP_CAT_ECO_DESC, value: 'economy', emoji: ui.getEmoji ? ui.getEmoji('help_eco') || '💰' : '💰' },
            { label: lang.HELP_CAT_MUSIC_LABEL, description: lang.HELP_CAT_MUSIC_DESC, value: 'music', emoji: ui.getEmoji ? ui.getEmoji('help_music') || '🎵' : '🎵' },
            { label: lang.HELP_CAT_GAME_LABEL, description: lang.HELP_CAT_GAME_DESC, value: 'minigame', emoji: ui.getEmoji ? ui.getEmoji('help_game') || '🎮' : '🎮' },
            { label: lang.HELP_CAT_ADMIN_LABEL, description: lang.HELP_CAT_ADMIN_DESC, value: 'admin', emoji: ui.getEmoji ? ui.getEmoji('help_admin') || '🛡️' : '🛡️' }
        );

    const row = new ActionRowBuilder().addComponents(selectMenu);
    
    let response;
    if (interaction.deferred || (interaction.editReply && !interaction.reply)) {
        response = await interaction.editReply({ embeds: [embed], components: [row, createNavButtons()] });
    } else {
        response = await interaction.reply({ embeds: [embed], components: [row, createNavButtons()], fetchReply: true });
    }

    if (!response || !response.createMessageComponentCollector) return;

    const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

    collector.on('collect', async i => {
        if (i.user.id !== interaction.user.id) {
            return i.reply({ content: lang.HELP_ERR_NOT_YOURS, ephemeral: true });
        }

        const selected = i.values[0];
        const categoryData = categories[selected];

        const updatedEmbed = EmbedBuilder.from(embed)
            .setTitle(categoryData.title)
            .setDescription(categoryData.desc);

        await i.update({ embeds: [updatedEmbed] });
    });

    collector.on('end', () => {
        const disabledMenu = ActionRowBuilder.from(row).components[0].setDisabled(true);
        const disabledRow = new ActionRowBuilder().addComponents(disabledMenu);
        interaction.editReply({ components: [disabledRow, createNavButtons()] }).catch(() => {});
    });
}

// ==========================================
// 🌐 5. LANGUAGE SYSTEM
// ==========================================
async function handleLanguage(interaction, guildId, newLang, currentLang) {
    if (!guildId) {
        const msg = "Only available in servers.";
        if (interaction.reply && !interaction.deferred) return interaction.reply({ content: msg, ephemeral: true });
        return interaction.editReply({ content: msg });
    }
    
    if (!newLang || !['id', 'en'].includes(newLang)) {
        if (interaction.reply && !interaction.deferred) return interaction.reply({ content: currentLang.LANG_NOT_FOUND, ephemeral: true });
        return interaction.editReply({ content: currentLang.LANG_NOT_FOUND });
    }

    let [settings] = await GuildSettings.findOrCreate({ where: { guildId } });
    
    if (!settings.system) settings.system = { prefix: 'n!', language: 'id' };
    settings.system = { ...settings.system, language: newLang };
    
    settings.changed('system', true);
    await settings.save();

    const successMsg = locales[newLang].LANG_SUCCESS;
    
    if (interaction.reply && !interaction.deferred) return interaction.reply({ content: successMsg });
    return interaction.editReply({ content: successMsg });
}