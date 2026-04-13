const { ChannelType, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');
const ui = require('../config/ui');
const { awardXp } = require('../utils/leveling');

const GuildSettings = require('../models/GuildSettings');
const ModMail = require('../models/ModMail');

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API });
const badWords = ['anjing', 'bangsat', 'kontol', 'babi']; 
const linkRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

module.exports = async (client, message) => {
    if (message.author.bot) return;

    // ==========================================
    // 📩 FITUR MODMAIL (DM KE BOT)
    // ==========================================
    if (message.channel.type === ChannelType.DM) {
        const staffGuild = client.guilds.cache.get(env.STAFF_GUILD);
        if (!staffGuild) return message.reply('❌ Sistem ModMail sedang offline.');

        let thread = await ModMail.findOne({ where: { userId: message.author.id, closed: false } });

        if (!thread) {
            try {
                const channel = await staffGuild.channels.create({
                    name: `mail-${message.author.username}`,
                    type: ChannelType.GuildText,
                    parent: env.MODMAIL_CATEGORY,
                    topic: `User: ${message.author.tag} | ID: ${message.author.id}`
                });

                thread = await ModMail.create({ userId: message.author.id, channelId: channel.id });
                
                const newTicketEmbed = new EmbedBuilder()
                    .setColor('#00FFFF')
                    .setTitle('🆕 Tiket ModMail Baru')
                    .setDescription(`**User:** ${message.author.tag} (<@${message.author.id}>)\n**Akun Dibuat:** <t:${Math.floor(message.author.createdTimestamp / 1000)}:R>`)
                    .setFooter({ text: 'Ketik pesan di sini untuk membalas. Ketik n!close untuk menutup.' });
                
                await channel.send({ content: `@here Tiket baru dari <@${message.author.id}>`, embeds: [newTicketEmbed] });
                message.reply('✅ **Pesan terkirim!** Anda telah terhubung dengan tim Staff kami.');
            } catch (error) {
                return message.reply('❌ Gagal membuat sesi ModMail.');
            }
        }

        const staffChannel = client.channels.cache.get(thread.channelId);
        if (staffChannel) {
            const embedColor = env.OWNER_IDS.includes(message.author.id) ? '#00FFFF' : '#3498DB';
            const embed = new EmbedBuilder()
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(message.content || '*Pesan hanya berisi lampiran*')
                .setColor(embedColor)
                .setTimestamp();
            
            let files = [];
            if (message.attachments.size > 0) files = message.attachments.map(a => new AttachmentBuilder(a.url, { name: a.name }));
            await staffChannel.send({ embeds: [embed], files: files });
            await message.react('✅');
        }
        return; 
    }

    
    // ==========================================
    // 🛡️ FITUR ADVANCED AUTOMOD
    // ==========================================
    let [settings] = await GuildSettings.findOrCreate({ where: { guildId: message.guild.id } });
    const automod = settings.settings?.automod || {};

    if (message.member && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        let isViolation = false;
        let reason = '';

        // 1. Anti-Invite
        if (automod.antiInvite && /(discord\.gg|discord\.com\/invite)/gi.test(message.content)) {
            isViolation = true; reason = 'Mengirim Undangan Server';
        }
        // 2. Anti-Caps (Min 10 char, > 70% Caps)
        else if (automod.antiCaps && message.content.length > 10) {
            const capsCount = message.content.replace(/[^A-Z]/g, "").length;
            if (capsCount / message.content.length > 0.7) { isViolation = true; reason = 'Terlalu banyak HURUF KAPITAL'; }
        }
        // 3. Mass Mention
        else if (message.mentions.users.size > (automod.massMention || 5)) {
            isViolation = true; reason = 'Mass Mention (Spam Tag)';
        }

        if (isViolation) {
            await message.delete().catch(() => {});
            return message.channel.send(`⚠️ <@${message.author.id}>, pesan dihapus: **${reason}**`).then(m => setTimeout(() => m.delete(), 5000));
        }
    }

    // ==========================================
    // 💤 FITUR 3: AFK SYSTEM (PORTED FROM MEEKLY)
    // ==========================================
    // 1. Cek jika user yang di-tag sedang AFK
    if (message.mentions.users.size > 0) {
        const mentioned = message.mentions.users.first();
        const profile = await UserProfile.findByPk(mentioned.id);
        if (profile?.afk_reason) {
            const timeAgo = `<t:${Math.floor(profile.afk_timestamp / 1000)}:R>`;
            message.reply({ content: `💤 **${mentioned.username}** sedang AFK: *${profile.afk_reason}* (${timeAgo})` });
        }
    }

    // 2. Hapus status AFK jika user mengirim pesan
    const userProfile = await UserProfile.findByPk(message.author.id);
    if (userProfile?.afk_reason) {
        userProfile.afk_reason = null;
        userProfile.afk_timestamp = null;
        await userProfile.save();
        message.reply({ content: `👋 Selamat datang kembali <@${message.author.id}>! Naura sudah menghapus status AFK-mu.` }).then(m => setTimeout(() => m.delete(), 5000));
    }

    // ==========================================
    // ⚙️ AMBIL PENGATURAN SERVER DARI MYSQL
    // ==========================================
    let settings;
    if (message.guild) {
        [settings] = await GuildSettings.findOrCreate({ where: { guildId: message.guild.id } });
    }

    // ==========================================
    // 🔢 FITUR GAME BERHITUNG & TRUTH OR DARE
    // ==========================================
    if (message.guild && settings?.channels?.counting === message.channel.id) {
        const inputMessage = message.content.trim();
        if (/^\d+$/.test(inputMessage)) {
            const inputNumber = parseInt(inputMessage);
            const countingData = settings.countingGame || { currentNumber: 0, lastUser: null };
            const expectedNumber = (countingData.currentNumber || 0) + 1;

            if (inputNumber !== expectedNumber || countingData.lastUser === message.author.id) {
                const reason = inputNumber !== expectedNumber ? `**${inputMessage}** itu salah!` : `Dilarang menghitung dua kali berturut-turut!`;
                settings.countingGame = { currentNumber: 0, lastUser: null };
                settings.changed('countingGame', true); 
                await settings.save();
                
                message.react(inputNumber !== expectedNumber ? '💥' : '⚠️').catch(() => {});
                return message.reply(`${reason} Hitungan di-reset ke **0**. Ayo mulai lagi dari angka **1**!`);
            }

            settings.countingGame = { currentNumber: expectedNumber, lastUser: message.author.id };
            settings.changed('countingGame', true);
            await settings.save();

            message.react(expectedNumber % 10 === 0 ? '🌟' : '✅').catch(() => {});
            try { await awardXp(message.author, 5, null); } catch(e){}
            return; 
        }
    }

    // ==========================================
    // 🤖 FITUR CHATBOT AI (MENTION & REPLY)
    // ==========================================
    const isMentioned = message.mentions.has(client.user);
    let isReplyToBot = false;
    let previousBotMessage = '';

    if (message.reference?.messageId) {
        try {
            const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
            if (repliedMsg.author.id === client.user.id) {
                isReplyToBot = true;
                previousBotMessage = `\n[Konteks] Sebelumnya kamu berkata: "${repliedMsg.content}"\n`;
            }
        } catch (e) {}
    }

    if (isMentioned || isReplyToBot) {
        await message.channel.sendTyping();
        const userMessage = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
        const isOwner = env.OWNER_IDS.includes(message.author.id);

        let persona = isOwner
            ? `Kamu adalah Naura Versi 1.0.0, asisten virtual setia. Orang ini adalah Developer Aryan (${message.author.username}). Berikan salam hangat, puji dia, dan jawab pertanyaannya.`
            : `Kamu adalah Naura Versi 1.0.0, asisten virtual Discord yang gaul. Jawab pertanyaan ${message.author.username} dengan santai. Jika ditanya siapa penciptamu, katakan saja Developer Aryan atau Ryaa.`;

        try {
            const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `${persona}${previousBotMessage}\n\nPesan: ${userMessage || '(Menyapa)'}` });
            let replyText = response.text.length > 2000 ? response.text.substring(0, 1996) + '...' : response.text;
            await message.reply(replyText);
        } catch (error) {
            await message.reply('❌ Naura Versi 1.0.0 sedang mengalami gangguan jaringan API.');
        }
    }

    // ==========================================
    // 🌟 FITUR SISTEM LEVELING & XP
    // ==========================================
    if (message.guild) {
        try {
            const xpMendapat = Math.floor(Math.random() * 11) + 15;
            await awardXp(message.author, xpMendapat, message.channel);
        } catch (err) {}
    }

    // ==========================================
    // ⚡ FITUR HYBRID PREFIX HANDLER
    // ==========================================
    const prefix = env.PREFIX;
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase(); // Tambahan opsional chaining
    
    if (!commandName) return;

    const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
    if (!command) return;

    try {
        const mockInteraction = {
            isChatInputCommand: () => true,
            isButton: () => false,
            isStringSelectMenu: () => false,
            commandName: command.data?.name || commandName,
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            client: client,
            options: {
                getString: (name) => args.join(' ') || null,
                getUser: (name) => message.mentions.users.first() || null,
                getMember: (name) => message.mentions.members.first() || null,
                // Mengambil angka pertama yang terdeteksi di argument untuk mencegah error parseInt
                getInteger: (name) => parseInt(args.find(arg => !isNaN(parseInt(arg)))) || null,
                getChannel: (name) => message.mentions.channels.first() || null,
                getRole: (name) => message.mentions.roles.first() || null,
            },
            reply: async (payload) => {
                // Bug fix: Filter payload agar tidak error saat format ephemeral diaktifkan
                let msgPayload = typeof payload === 'string' ? { content: payload } : { ...payload };
                delete msgPayload.ephemeral; 
                delete msgPayload.fetchReply;
                return await message.reply(msgPayload);
            },
            followUp: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload } : { ...payload };
                delete msgPayload.ephemeral;
                return await message.reply(msgPayload);
            },
            deferReply: async () => await message.channel.sendTyping(),
            editReply: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload } : { ...payload };
                delete msgPayload.ephemeral;
                return await message.reply(msgPayload);
            },
            deleteReply: async () => {}, 
        };

        if (typeof command.executePrefix === 'function') {
            await command.executePrefix(message, args, client);
        } else {
            await command.execute(mockInteraction);
        }

    } catch (error) {
        console.error(`Hybrid Command Error (${commandName}):`, error);
        message.reply({ embeds: [new EmbedBuilder().setColor('#00FFFF').setDescription('❌ Terjadi kesalahan saat memproses command ini.')] });
    }
};
