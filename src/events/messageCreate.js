const { ChannelType, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits, Collection } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const env = require('../config/env');
const ui = require('../config/ui');
const { awardXp } = require('../utils/leveling');

const UserProfile = require('../models/UserProfile');
const GuildSettings = require('../models/GuildSettings');
const ModMail = require('../models/ModMail');

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API });
const badWords = ['anjing', 'bangsat', 'kontol', 'babi']; 
const linkRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

module.exports = async (client, message) => {
    // Abaikan pesan dari bot
    if (message.author.bot) return;

    // Pastikan Snipe Collection tersedia (Fitur Meekly)
    if (!client.snipes) client.snipes = new Collection();

    // ==========================================
    // 📩 FITUR 1: MODMAIL (DM KE BOT)
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
                    .setColor(ui.getColor('primary'))
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
            const embedColor = env.OWNER_IDS.includes(message.author.id) ? ui.getColor('primary') : '#3498DB';
            const embed = new EmbedBuilder()
                .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                .setDescription(message.content || '*Pesan hanya berisi lampiran*')
                .setColor(embedColor)
                .setTimestamp();
            
            let files = [];
            if (message.attachments.size > 0) files = message.attachments.map(a => new AttachmentBuilder(a.url, { name: a.name }));
            await staffChannel.send({ embeds: [embed], files: files });
            await message.react(ui.getEmoji('success'));
        }
        return; 
    }

    // ==========================================
    // 📤 FITUR 2: MODMAIL (STAFF MEMBALAS KE DM)
    // ==========================================
    const thread = await ModMail.findOne({ where: { channelId: message.channel.id, closed: false } });
    if (thread) {
        if (message.content.toLowerCase() === 'n!close') {
            thread.closed = true;
            await thread.save();
            try {
                const user = await client.users.fetch(thread.userId);
                await user.send({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setTitle('🔒 Tiket Ditutup').setDescription('Sesi ModMail ini telah diselesaikan oleh Staff.')] });
            } catch (e) {}
            await message.channel.send('Merapikan channel dalam 5 detik...');
            setTimeout(() => message.channel.delete().catch(() => {}), 5000);
            return;
        }

        try {
            const user = await client.users.fetch(thread.userId);
            const replyEmbed = new EmbedBuilder()
                .setAuthor({ name: 'Balasan dari Tim Support', iconURL: client.user.displayAvatarURL() })
                .setDescription(message.content || '*Pesan hanya berisi lampiran*')
                .setColor(ui.getColor('primary'))
                .setFooter({ text: `Staff: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                .setTimestamp();

            let files = [];
            if (message.attachments.size > 0) files = message.attachments.map(a => new AttachmentBuilder(a.url, { name: a.name }));

            await user.send({ embeds: [replyEmbed], files: files });
            await message.react('📨');
        } catch (error) {
            await message.channel.send({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription('❌ Gagal mengirim pesan ke user (DM tertutup).')] });
        }
        return; 
    }

    // ==========================================
    // ⚙️ DEKLARASI PENGATURAN DATABASE (TUNGGAL)
    // ==========================================
    let settings;
    if (message.guild) {
        [settings] = await GuildSettings.findOrCreate({ where: { guildId: message.guild.id } });
    }

    // ==========================================
    // 🛡️ FITUR 3: ADVANCED AUTOMOD
    // ==========================================
    if (message.guild && message.member && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
        const automod = settings?.settings?.automod || {};
        let isViolation = false;
        let violationType = '';
        const content = message.content.toLowerCase();

        // 1. Kata Kasar
        if (badWords.some(word => content.includes(word))) {
            isViolation = true; violationType = 'Menggunakan Kata Kasar';
        } 
        // 2. Anti-Invite
        else if (automod.antiInvite && /(discord\.gg|discord\.com\/invite)/gi.test(content)) {
            isViolation = true; violationType = 'Mengirim Undangan Server';
        }
        // 3. Anti-Link (Pengecualian CDN Discord)
        else if (linkRegex.test(content) && !content.includes('tenor.com') && !content.includes('discordapp.') && !content.includes('discord.com')) {
            isViolation = true; violationType = 'Mengirim Link Ilegal';
        }
        // 4. Anti-Caps (Hanya jika panjang > 10 dan 70% kapital)
        else if (automod.antiCaps && message.content.length > 10) {
            const capsCount = message.content.replace(/[^A-Z]/g, "").length;
            if (capsCount / message.content.length > 0.7) { 
                isViolation = true; violationType = 'Terlalu banyak HURUF KAPITAL'; 
            }
        }
        // 5. Mass Mention
        else if (message.mentions.users.size > (automod.massMention || 5)) {
            isViolation = true; violationType = 'Mass Mention (Spam Tag)';
        }

        if (isViolation) {
            await message.delete().catch(() => {});
            const warningMsg = await message.channel.send(`⚠️ <@${message.author.id}>, pesan Anda dihapus karena: **${violationType}**.`);
            setTimeout(() => warningMsg.delete().catch(() => {}), 5000);
            return; 
        }
    }

    // ==========================================
    // 💤 FITUR 4: AFK SYSTEM
    // ==========================================
    // Cek jika member yang dimention sedang AFK
    if (message.mentions.users.size > 0) {
        const mentioned = message.mentions.users.first();
        const profile = await UserProfile.findByPk(mentioned.id);
        if (profile && profile.afk_reason) {
            const timeAgo = `<t:${Math.floor(new Date(profile.afk_timestamp).getTime() / 1000)}:R>`;
            message.reply({ content: `💤 **${mentioned.username}** sedang AFK: *${profile.afk_reason}* (${timeAgo})` })
                .then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        }
    }

    // Hapus AFK pengirim pesan jika mereka sedang AFK
    const userProfile = await UserProfile.findByPk(message.author.id);
    if (userProfile && userProfile.afk_reason) {
        userProfile.afk_reason = null;
        userProfile.afk_timestamp = null;
        await userProfile.save();
        message.reply({ content: `👋 Selamat datang kembali <@${message.author.id}>! Naura sudah menghapus status AFK-mu.` })
            .then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
    }

    // ==========================================
    // 🔢 FITUR 5: GAME BERHITUNG & TRUTH OR DARE
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

            message.react(expectedNumber % 10 === 0 ? '🌟' : ui.getEmoji('success')).catch(() => {});
            try { await awardXp(message.author, 5, null); } catch(e){}
            return; 
        }
    }

    if (message.guild && settings?.channels?.tod === message.channel.id) {
        const input = message.content.trim().toLowerCase();
        if (input === 'truth' || input === 'dare') {
            await message.channel.sendTyping();
            const isTruth = input === 'truth';
            let qData;

            try {
                const promptAI = `Buatkan 1 pertanyaan 'Truth' atau tantangan 'Dare' gaul. Tipe: ${input.toUpperCase()}. JSON: {"type": "${input}", "q": "Teks"}`;
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: promptAI });
                qData = JSON.parse(response.text.replace(/```json/gi, '').replace(/```/gi, '').trim());
            } catch (error) {
                qData = isTruth ? { q: 'Apa rahasia terbesarmu?' } : { q: 'Chat mantan sekarang juga!' };
            }

            const embed = new EmbedBuilder()
                .setColor(isTruth ? ui.getColor('primary') : ui.getColor('error'))
                .setAuthor({ name: `Truth or Dare`, iconURL: client.user.displayAvatarURL() })
                .setTitle(isTruth ? `${ui.getEmoji('tod_truth')} TRUTH untuk ${message.author.username}` : `${ui.getEmoji('tod_dare')} DARE untuk ${message.author.username}`)
                .setDescription(`\`\`\`${qData.q}\`\`\``);

            await message.reply({ embeds: [embed] });
            return; 
        }
    }

    // ==========================================
    // 🤖 FITUR 6: CHATBOT AI (MENTION & REPLY)
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
    // 🌟 FITUR 7: SISTEM LEVELING & XP
    // ==========================================
    if (message.guild) {
        try {
            const xpMendapat = Math.floor(Math.random() * 11) + 15;
            await awardXp(message.author, xpMendapat, message.channel);
        } catch (err) {}
    }

    // ==========================================
    // ⚡ FITUR 8: HYBRID PREFIX HANDLER
    // ==========================================
    const prefix = env.PREFIX || 'n!';
    if (!message.content.startsWith(prefix)) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift()?.toLowerCase();
    
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
                getInteger: (name) => parseInt(args.find(arg => !isNaN(parseInt(arg)))) || null,
                getChannel: (name) => message.mentions.channels.first() || null,
                getRole: (name) => message.mentions.roles.first() || null,
            },
            reply: async (payload) => {
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
        message.reply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription('❌ Terjadi kesalahan saat memproses command ini.')] });
    }
};
