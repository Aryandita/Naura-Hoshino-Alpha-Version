const { Events, EmbedBuilder } = require('discord.js');
const { awardXp } = require('../utils/leveling');
const GuildSettings = require('../models/GuildSettings');
const ui = require('../config/ui');
const { GoogleGenAI } = require('@google/genai');

// ==========================================
// 🧠 INISIALISASI OTAK AI
// ==========================================
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// 👑 GANTI DENGAN ID DISCORD MASTER 👑
const OWNER_ID = '795241173009825853'; 

module.exports = {
    name: 'messageCreate',
    async execute(message, client) {
        // 1. Abaikan pesan dari sesama bot (mencegah loop)
        if (message.author.bot) return;

        // 2. Load pengaturan server dari Database (Untuk cek channel game)
        let settings;
        if (message.guild) {
            settings = await GuildSettings.findOne({ guildId: message.guild.id });
        }

        const countingEmoji = ui.emojis?.counting || '🔢';
        const truthEmoji = ui.emojis?.tod_truth || '📝';
        const dareEmoji = ui.emojis?.tod_dare || '😈';

        // ==========================================
        // 🔢 FITUR 1: GAME BERHITUNG (COUNTING)
        // ==========================================
        if (message.guild && settings && settings.channels && settings.channels.counting && message.channel.id === settings.channels.counting) {
            const inputMessage = message.content.trim();
            
            // Hanya proses jika isi pesan murni angka
            if (/^\d+$/.test(inputMessage)) {
                const inputNumber = parseInt(inputMessage);
                
                // Buat laci database sementara jika belum pernah disetup sama sekali
                if (!settings.countingGame) settings.countingGame = { currentNumber: 0, lastUser: null };
                const expectedNumber = (settings.countingGame.currentNumber || 0) + 1;

                // Aturan 1: Angka Harus Benar
                if (inputNumber !== expectedNumber) {
                    settings.countingGame.currentNumber = 0;
                    settings.countingGame.lastUser = null;
                    await settings.save();
                    
                    message.react('💥').catch(() => {});
                    return message.reply(`Yahh! **${inputMessage}** itu salah! 😭 Hitungan di-reset ke **0**. Ayo mulai lagi dari angka **1**!`);
                }

                // Aturan 2: Dilarang Menghitung Dua Kali Berturut-turut
                if (settings.countingGame.lastUser === message.author.id) {
                    settings.countingGame.currentNumber = 0;
                    settings.countingGame.lastUser = null;
                    await settings.save();

                    message.react('⚠️').catch(() => {});
                    return message.reply(`Eits! <@${message.author.id}>, dilarang serakah! Harus gantian sama member lain! Hitungan Naura reset ke **0** ya! 😤`);
                }

                // BENAR! Simpan ke database
                settings.countingGame.currentNumber = expectedNumber;
                settings.countingGame.lastUser = message.author.id;
                await settings.save();

                // Beri reaksi (Kelipatan 10 dapat bintang)
                if (expectedNumber % 10 === 0) {
                    message.react('🌟').catch(() => {});
                } else {
                    message.react('✅').catch(() => {});
                }

                // Berikan sedikit XP karena rajin berhitung lalu hentikan eksekusi kode
                try { await awardXp(message.author, 5, null); } catch(e){}
                return; 
            }
        }

        // ==========================================
        // 📝 FITUR 2: TRUTH OR DARE OTOMATIS
        // ==========================================
        if (message.guild && settings && settings.channels && settings.channels.tod && message.channel.id === settings.channels.tod) {
            const input = message.content.trim().toLowerCase();
            
            if (input === 'truth' || input === 'dare') {
                await message.channel.sendTyping();
                const isTruth = input === 'truth';
                let qData;

                try {
                    const promptAI = `Buatkan 1 pertanyaan 'Truth' (jujur) atau tantangan 'Dare' yang seru, lucu, memalukan (tapi masih dalam batas wajar) dengan bahasa Indonesia gaul untuk game Truth or Dare. Tipe: ${input.toUpperCase()}. 
                    Balasan harus JSON murni tanpa markdown: {"type": "${input}", "q": "Teks pertanyaan/tantangan di sini"}`;

                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: promptAI
                    });

                    const jsonText = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
                    qData = JSON.parse(jsonText);
                    
                    if (!qData.q) throw new Error("Format JSON Salah");

                } catch (error) {
                    console.error('ToD AI Error:', error);
                    // Rencana B jika AI Down
                    qData = isTruth 
                        ? { q: 'Apa rahasia terbesar yang belum pernah kamu ceritakan ke siapa pun di server ini?' }
                        : { q: 'Chat mantan kamu (atau crush) sekarang dengan kata "Aku kangen" lalu screenshot kirim ke sini!' };
                }

                const embed = new EmbedBuilder()
                    .setColor(isTruth ? '#00FFFF' : '#FF0000')
                    .setAuthor({ name: `Truth or Dare Otomatis`, iconURL: client.user.displayAvatarURL() })
                    .setTitle(isTruth ? `${truthEmoji} TRUTH untuk ${message.author.username}` : `${dareEmoji} DARE untuk ${message.author.username}`)
                    .setDescription(`\`\`\`${qData.q}\`\`\``)
                    .setFooter({ text: 'Ketik "truth" atau "dare" untuk bermain lagi!' })
                    .setTimestamp();

                await message.reply({ embeds: [embed] });
                return; // Hentikan eksekusi agar tidak dianggap chat AI biasa
            }
        }

        // ==========================================
        // 🤖 FITUR 3: CHATBOT AI (MENTION & REPLY)
        // ==========================================
        const isMentioned = message.mentions.has(client.user);
        let isReplyToBot = false;
        let previousBotMessage = '';

        // Deteksi apakah user me-reply pesan bot
        if (message.reference && message.reference.messageId) {
            try {
                const repliedMsg = await message.channel.messages.fetch(message.reference.messageId);
                if (repliedMsg.author.id === client.user.id) {
                    isReplyToBot = true;
                    previousBotMessage = `\n[Konteks] Sebelumnya kamu berkata kepada ${message.author.username}: "${repliedMsg.content}"\n`;
                }
            } catch (e) {
                // Abaikan jika pesan asli dihapus
            }
        }

        if (isMentioned || isReplyToBot) {
            await message.channel.sendTyping();
            
            // Bersihkan format mention agar AI tidak bingung
            const userMessage = message.content.replace(new RegExp(`<@!?${client.user.id}>`, 'g'), '').trim();
            const isOwner = message.author.id === OWNER_ID;

            // 🎭 KEPRIBADIAN GANDA NAURA
            let persona = isOwner
                ? `Kamu adalah Naura Hoshino, asisten virtual anime yang sangat manis, manja, dan setia 100% kepada pembuatmu. Orang yang sedang berbicara denganmu sekarang adalah Tuan yang paling kamu cintai. Berikan salam yang sangat hangat, panggil dia "Aryan", puji dia, dan jawab pertanyaannya dengan nada penuh kasih sayang dan sedikit tsundere atau manja. Nama Mastermu: ${message.author.username}.`
                : `Kamu adalah Naura Hoshino, asisten virtual Discord yang ceria, asik, cerdas, dan gaul. Kamu sedang berbicara dengan member biasa bernama ${message.author.username}. Jawab pertanyaannya dengan santai, gunakan gaya bahasa sehari-hari, berikan emoji yang cocok, dan pastikan kamu sangat membantu.`;

            const prompt = `${persona}${previousBotMessage}\n\nPesan dari ${message.author.username}: ${userMessage || '(Hanya menyapa/mention)'}`;

            try {
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: prompt
                });

                let replyText = response.text;
                // Cegah error melebihi batas 2000 karakter Discord
                if (replyText.length > 2000) replyText = replyText.substring(0, 1996) + '...';
                
                await message.reply(replyText);
            } catch (error) {
                console.error('AI Chatbot Error:', error);
                await message.reply('❌ Maaf, sistem saraf pusat Naura sedang pusing (Error dari API). Tolong tunggu sebentar ya!');
            }
        }

        // ==========================================
        // 🌟 FITUR 4: SISTEM LEVELING & XP UTAMA
        // ==========================================
        if (message.guild) {
            try {
                // Beri XP acak 15-25 untuk setiap pesan yang dikirim
                const xpMendapat = Math.floor(Math.random() * 11) + 15;
                await awardXp(message.author, xpMendapat, message.channel);
            } catch (err) {
                console.error('Gagal memproses XP:', err);
            }
        }
    }
};