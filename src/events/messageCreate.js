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

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        if (message.author.bot) return;

        // 🚧 GLOBAL MAINTENANCE LOCKDOWN
        if (client.maintenanceMode && !env.OWNER_IDS.includes(message.author.id)) return;

        if (!client.snipes) client.snipes = new Collection();

        // ==========================================
        // 📨 SISTEM MODMAIL (DINAMIS - DM TO STAFF & STAFF TO DM)
        // ==========================================
        if (message.channel.type === ChannelType.DM) {
            if (message.content.toLowerCase().startsWith('n!modmail') || message.content.toLowerCase().startsWith('/modmail')) return;

            let thread = await ModMail.findOne({ where: { userId: message.author.id, closed: false } });

            if (!thread) {
                return message.reply(`👋 Halo! Ketik \`n!modmail\` di sini untuk memilih dan menghubungi tim support dari server-server yang mengaktifkan layananku.`);
            }

            const staffChannel = client.channels.cache.get(thread.channelId);
            if (staffChannel) {
                const embed = new EmbedBuilder()
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setDescription(message.content || '*Hanya mengirim lampiran*')
                    .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
                    .setTimestamp();
                
                let files = [];
                if (message.attachments.size > 0) files = message.attachments.map(a => new AttachmentBuilder(a.url, { name: a.name }));
                
                await staffChannel.send({ embeds: [embed], files: files }).catch(() => {});
                await message.react(ui.getEmoji ? ui.getEmoji('success') : '✅').catch(() => {});
            }
            return; 
        }

        let staffThread = await ModMail.findOne({ where: { channelId: message.channel.id, closed: false } }).catch(() => null);
        
        if (staffThread) {
            if (message.content.toLowerCase() === 'n!close') {
                staffThread.closed = true;
                await staffThread.save();
                
                try {
                    const user = await client.users.fetch(staffThread.userId);
                    await user.send({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('🔒 Sesi Berakhir').setDescription(`Sesi percakapanmu dengan Staff **${message.guild.name}** telah ditutup.`)] });
                } catch (e) {}
                
                await message.channel.send('Merapikan channel dalam 5 detik...');
                setTimeout(() => message.channel.delete().catch(() => {}), 5000);
                return;
            }

            try {
                const user = await client.users.fetch(staffThread.userId);
                const replyEmbed = new EmbedBuilder()
                    .setAuthor({ name: `Balasan dari ${message.guild.name}`, iconURL: message.guild.iconURL() })
                    .setDescription(message.content || '*Hanya mengirim lampiran*')
                    .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
                    .setFooter({ text: `Staff: ${message.author.username}`, iconURL: message.author.displayAvatarURL() })
                    .setTimestamp();

                let files = [];
                if (message.attachments.size > 0) files = message.attachments.map(a => new AttachmentBuilder(a.url, { name: a.name }));

                await user.send({ embeds: [replyEmbed], files: files });
                await message.react('📨');
            } catch (error) {
                await message.channel.send({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('❌ Gagal mengirim pesan. DM User tertutup/diblokir.')] });
            }
            return; 
        }

        // ==========================================
        // 🛡️ SISTEM AUTOMOD
        // ==========================================
        let settings = null;
        if (message.guild) {
            try { [settings] = await GuildSettings.findOrCreate({ where: { guildId: message.guild.id } }); } catch(e){}
        }

        if (settings && message.guild && message.member && !message.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const automod = settings?.settings?.automod || {};
            
            // Bypass jika automod belum diaktifkan oleh admin
            if (automod.enabled) {
                let isViolation = false;
                let violationType = '';
                const content = message.content.toLowerCase();

                if (badWords.some(word => content.includes(word))) {
                    isViolation = true; violationType = 'Menggunakan Kata Kasar';
                } else if (automod.antiInvite && /(discord\.gg|discord\.com\/invite)/gi.test(content)) {
                    isViolation = true; violationType = 'Mengirim Undangan Server';
                } else if (linkRegex.test(content) && !content.includes('tenor.com') && !content.includes('discordapp.') && !content.includes('discord.com')) {
                    // Pengecualian Link Musik (Spotify, YouTube, Soundcloud)
                    if (!content.includes('spotify.com') && !content.includes('youtube.com') && !content.includes('youtu.be') && !content.includes('soundcloud.com')) {
                        isViolation = true; violationType = 'Mengirim Link Ilegal';
                    }
                } else if (automod.antiCaps && message.content.length > 10) {
                    const capsCount = message.content.replace(/[^A-Z]/g, "").length;
                    if (capsCount / message.content.length > 0.7) { 
                        isViolation = true; violationType = 'Terlalu banyak HURUF KAPITAL'; 
                    }
                } else if (message.mentions.users.size > (automod.massMention || 5)) {
                    isViolation = true; violationType = 'Mass Mention (Spam Tag)';
                }

                if (isViolation) {
                    await message.delete().catch(() => {});
                    
                    const UserLeveling = require('../models/UserLeveling');
                    let [profile] = await UserLeveling.findOrCreate({ where: { userId: message.author.id, guildId: message.guild.id } });
                    
                    profile.mannersPoint = (profile.mannersPoint !== undefined ? profile.mannersPoint : 100) - 25; 
                    
                    if (profile.mannersPoint <= 0) {
                        profile.mannersPoint = 0;
                        if (automod.punishRole) {
                            try {
                                await message.member.roles.add(automod.punishRole);
                                await message.channel.send(`🚨 **ISOLASI AKTIF!** <@${message.author.id}> Poin Tata Krama Anda telah habis (0/100). Anda telah diisolasi sebagai "Anak Nakal" dan dicabut aksesnya dari server!`);
                            } catch (e) {}
                        }
                    } else {
                        const warningMsg = await message.channel.send(`⚠️ <@${message.author.id}>, pesan dihapus karena: **${violationType}**. (Poin Tata Krama: **${profile.mannersPoint}/100**)`);
                        setTimeout(() => warningMsg.delete().catch(() => {}), 8000);
                    }
                    
                    await profile.save();
                    return; 
                }
            }
        }

        // ==========================================
        // 💤 SISTEM AFK
        // ==========================================
        if (message.mentions.users.size > 0) {
            const mentioned = message.mentions.users.first();
            const profile = await UserProfile.findByPk(mentioned.id).catch(()=>null);
            if (profile && profile.afk_reason) {
                const timeAgo = `<t:${Math.floor(new Date(profile.afk_timestamp).getTime() / 1000)}:R>`;
                message.reply({ content: `💤 **${mentioned.username}** sedang AFK: *${profile.afk_reason}* (${timeAgo})` })
                    .then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
            }
        }

        const userProfile = await UserProfile.findByPk(message.author.id).catch(()=>null);
        if (userProfile && userProfile.afk_reason) {
            userProfile.afk_reason = null;
            userProfile.afk_timestamp = null;
            await userProfile.save().catch(()=>{});
            message.reply({ content: `👋 Selamat datang kembali <@${message.author.id}>! Naura sudah menghapus status AFK-mu.` })
                .then(m => setTimeout(() => m.delete().catch(()=>null), 5000));
        }

       // ==========================================
        // 📥 AMBIL KONFIGURASI CHANNEL DARI DATABASE
        // ==========================================
        let guildChannels = {};
        if (settings && settings.settings && settings.settings.channels) {
            guildChannels = settings.settings.channels;
        }

        // ==========================================
        // 🔢 MINIGAME: COUNTING SYSTEM
        // ==========================================
        if (guildChannels.counting && message.channel.id === guildChannels.counting) {
            // Abaikan jika pesan bukan angka
            if (isNaN(message.content.trim())) {
                await message.delete().catch(() => {});
                return; // Pesan selain angka murni akan dihapus agar channel tetap rapi
            }
            
            // TODO: Integrasikan logika angka berurutan di sini nanti
            // Untuk sementara, kita biarkan logic angka masuk.
            await message.react('✅').catch(() => {});
            return; // Hentikan eksekusi agar tidak tercampur fitur lain
        }

        // ==========================================
        // 🧠 SISTEM OTOMATISASI AI (GEMINI) - DEDICATED CHANNEL
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

        // Cek apakah pesan dikirim di Dedicated AI Channel
        const isInAiChannel = guildChannels.ai && message.channel.id === guildChannels.ai;

        // AI akan merespons jika: Di-mention ATAU Membalas bot ATAU Berada di Channel AI Khusus
        if (isMentioned || isReplyToBot || isInAiChannel) {
            await message.channel.sendTyping();
            
            // Bersihkan mention dari teks agar AI tidak bingung
            let userMessage = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
            const isOwner = env.OWNER_IDS.includes(message.author.id);

            let persona = isOwner
                ? `Kamu adalah Naura Versi 1.0.0, asisten virtual setia. Master-mu adalah Developer Aryan (${message.author.username}). Berikan salam hangat dan jawab pertanyaannya secara efisien.`
                : `Kamu adalah Naura Versi 1.0.0, asisten virtual Discord yang cerdas dan ceria. Jawab pertanyaan ${message.author.username} dengan natural dan sedikit santai.`;

            try {
                const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `${persona}${previousBotMessage}\n\nPesan: ${userMessage || '(Menyapa)'}` });
                let replyText = response.text.length > 4000 ? response.text.substring(0, 3996) + '...' : response.text;
                
                const aiEmbed = new EmbedBuilder()
                    .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
                    .setAuthor({ name: 'Naura AI', iconURL: client.user.displayAvatarURL() })
                    .setDescription(replyText)
                    .setFooter({ text: `Powered by Gemini • Dipesan oleh ${message.author.username}`, iconURL: message.author.displayAvatarURL() });

                await message.reply({ embeds: [aiEmbed] });
            } catch (error) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(ui.getColor ? ui.getColor('error') : '#FF0000')
                    .setDescription('❌ Waduh, jaringan AI Naura sedang bermasalah nih. Coba lagi nanti ya!');
                await message.reply({ embeds: [errorEmbed] });
            }
            return; // Hentikan agar tidak diproses sebagai prefix/leveling
        }

        // ==========================================
        // ⚙️ EKSEKUSI PREFIX COMMAND & LEVELING XP
        // ==========================================
        const prefix = env.PREFIX || 'n!';
        
        if (!message.content.toLowerCase().startsWith(prefix.toLowerCase())) {
            if (message.guild) {
                await awardXp(message.author, message.guild, message.channel).catch(() => {});
            }
            return;
        }

        const args = message.content.slice(prefix.length).trim().split(/ +/);
        const commandName = args.shift()?.toLowerCase();
        
        if (!commandName) return;

        const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command) return;

        const loadingEmbed = new EmbedBuilder()
            .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
            .setDescription(`${ui.getEmoji ? ui.getEmoji('loading') : '⏳'} Memproses perintah \`${commandName}\`...`);
            
        const loadingMsg = await message.reply({ embeds: [loadingEmbed] });

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
                createdTimestamp: message.createdTimestamp, 
                options: {
                    getSubcommand: () => args[0]?.toLowerCase() || null, 
                    getString: (name) => {
                        let tempArgs = [...args];
                        if (tempArgs.length > 0 && ['balance', 'inventory', 'shop', 'buy', 'daily', 'weekly', 'work', 'lootbox', 'race', 'hack', 'steal', 'ping', 'stats', 'about', 'help', 'eval', 'sql', 'maintenance', 'reload', 'add', 'remove'].includes(tempArgs[0].toLowerCase())) {
                            tempArgs.shift(); 
                        }
                        return tempArgs.join(' ') || null;
                    },
                    getUser: (name) => message.mentions.users.first() || null,
                    getMember: (name) => message.mentions.members.first() || null,
                    getInteger: (name) => parseInt(args.find(arg => !isNaN(parseInt(arg)))) || null,
                    getChannel: (name) => message.mentions.channels.first() || null,
                    getRole: (name) => message.mentions.roles.first() || null,
                    getBoolean: (name) => {
                        const str = args.find(arg => ['true', 'false', 'on', 'off'].includes(arg.toLowerCase()));
                        return str ? ['true', 'on'].includes(str.toLowerCase()) : null;
                    },
                },
                reply: async (payload) => {
                    let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                    delete msgPayload.ephemeral; 
                    delete msgPayload.fetchReply;
                    try { return await loadingMsg.edit(msgPayload); } catch (e) { return await message.reply(msgPayload); }
                },
                followUp: async (payload) => {
                    let msgPayload = typeof payload === 'string' ? { content: payload } : { ...payload };
                    delete msgPayload.ephemeral;
                    return await message.channel.send(msgPayload);
                },
                deferReply: async () => {
                    await loadingMsg.edit({ embeds: [new EmbedBuilder().setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF').setDescription(`${ui.getEmoji ? ui.getEmoji('loading') : '🔄'} Mengambil data untuk \`${commandName}\`...`)] }).catch(() => {});
                },
                editReply: async (payload) => {
                    let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                    delete msgPayload.ephemeral;
                    try { return await loadingMsg.edit(msgPayload); } catch (e) { return await message.reply(msgPayload); }
                },
                deleteReply: async () => {
                    await loadingMsg.delete().catch(() => {});
                }, 
            };

            if (typeof command.executePrefix === 'function') {
                await loadingMsg.delete().catch(() => {});
                await command.executePrefix(message, args, client);
            } else if (!command.data && typeof command.execute === 'function') {
                await loadingMsg.delete().catch(() => {});
                await command.execute(client, message, args);
            } else {
                await command.execute(mockInteraction);
            }

        } catch (error) {
            console.error(`[HYBRID ERROR] Command (${commandName}):`, error);
            await loadingMsg.edit({ 
                content: null, 
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`❌ Terjadi kesalahan sistem saat mengeksekusi \`${commandName}\`.`)] 
            }).catch(() => {});
        }
    }
};