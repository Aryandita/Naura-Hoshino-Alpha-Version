const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const UserProfile = require('../../models/UserProfile');
const ui = require('../../config/ui');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const triviaDBFallback = {
    pemula: [{ q: 'Apa ibukota negara Indonesia?', options: ['Jakarta', 'Bandung', 'Surabaya', 'Medan'], a: 'Jakarta' }, { q: 'Benda langit yang mengelilingi bumi adalah?', options: ['Matahari', 'Bulan', 'Bintang', 'Mars'], a: 'Bulan' }],
    lanjut: [{ q: 'Siapa penemu bola lampu pijar?', options: ['Albert Einstein', 'Thomas Edison', 'Nikola Tesla', 'Isaac Newton'], a: 'Thomas Edison' }, { q: 'Gunung tertinggi di Pulau Jawa adalah?', options: ['Gunung Merapi', 'Gunung Bromo', 'Gunung Semeru', 'Gunung Rinjani'], a: 'Gunung Semeru' }],
    master: [{ q: 'Tahun berapa VOC dibubarkan secara resmi?', options: ['1799', '1602', '1800', '1945'], a: '1799' }, { q: 'Gas apa yang paling banyak terdapat di atmosfer Bumi?', options: ['Oksigen', 'Karbondioksida', 'Nitrogen', 'Hidrogen'], a: 'Nitrogen' }],
    grandmaster: [{ q: 'Siapa nama asli Kapitan Pattimura?', options: ['Thomas Matulessy', 'Yohanis Matulessy', 'Martha Tiahahu', 'Anthony Matulessy'], a: 'Thomas Matulessy' }, { q: 'Berapa jumlah tulang pada tubuh manusia dewasa normal?', options: ['206', '208', '210', '212'], a: '206' }]
};

function generateMath(difficulty) {
    let num1, num2, num3, question, answer;
    switch (difficulty) {
        case 'pemula': num1 = Math.floor(Math.random() * 50) + 1; num2 = Math.floor(Math.random() * 50) + 1; if (Math.random() > 0.5) { question = `${num1} + ${num2}`; answer = num1 + num2; } else { question = `${num1} + ${num2} - ${Math.floor(num1 / 2)}`; answer = (num1 + num2) - Math.floor(num1 / 2); } break;
        case 'lanjut': num1 = Math.floor(Math.random() * 20) + 1; num2 = Math.floor(Math.random() * 15) + 1; question = `${num1} x ${num2}`; answer = num1 * num2; break;
        case 'master': num1 = Math.floor(Math.random() * 20) + 10; num2 = Math.floor(Math.random() * 10) + 2; num3 = Math.floor(Math.random() * 50) + 10; question = `(${num1} x ${num2}) + ${num3}`; answer = (num1 * num2) + num3; break;
        case 'grandmaster': num1 = Math.floor(Math.random() * 50) + 20; num2 = Math.floor(Math.random() * 30) + 10; num3 = Math.floor(Math.random() * 100) + 50; question = `${num1} x ${num2} - ${num3} + 125`; answer = (num1 * num2) - num3 + 125; break;
    }
    return { question, answer: answer.toString() };
}

const rewards = {
    pemula: { coin: 50, score: 10, time: 20000, color: '#00FF00' },
    lanjut: { coin: 150, score: 30, time: 15000, color: '#00FFFF' },
    master: { coin: 300, score: 50, time: 10000, color: '#FF00FF' },
    grandmaster: { coin: 1000, score: 100, time: 15000, color: '#FFD700' }
};

const wordleWords = ['MOBIL', 'MOTOR', 'LAMPU', 'BUNGA', 'PINTU', 'KAPAL', 'PESAN', 'SURAT', 'BULAN', 'KASUR', 'LEMAR', 'HUTAN', 'POHON', 'PASIR', 'SINGA', 'MACAN', 'ELANG', 'BEBEK', 'KATAK', 'BADAK', 'KAMAR', 'KASIR', 'PAGAR'];

// ==========================================
// 📚 DATABASE MINI-GAMES BARU
// ==========================================
const anagramDB = {
    mudah: ['PINTU', 'MEJA', 'KASUR', 'MOBIL', 'MOTOR', 'BOTOL', 'KIPAS', 'KAPAL', 'BUKU', 'PENA', 'SABUN', 'AYAM', 'SAPI', 'KUDA'],
    sulit: ['ASTRONOT', 'KOMPUTER', 'TELEVISI', 'MIKROSKOP', 'HELIKOPTER', 'METEOROLOGI', 'KONSTITUSI', 'UNIVERSITAS']
};

const tebakGambarDB = [
    { url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', clue: 'Hewan peliharaan yang mengeong', answer: 'kucing' },
    { url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', clue: 'Kendaraan roda empat', answer: 'mobil' },
    { url: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', clue: 'Perangkat elektronik lipat untuk bekerja', answer: 'laptop' },
    { url: 'https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=60', clue: 'Mamalia darat dengan leher paling panjang', answer: 'jerapah' }
];

const ttsDB = [
    { clue: "**1 Mendatar:** Ibukota negara Jepang\n**1 Menurun:** Alat untuk menulis dengan tinta", answer: "tokyo pena", id: 1 },
    { clue: "**1 Mendatar:** Mamalia darat terbesar yang punya belalai\n**1 Menurun:** Buah berduri yang di dalamnya kuning dan wangi", answer: "gajah durian", id: 2 },
    { clue: "**1 Mendatar:** Planet merah di tata surya kita\n**1 Menurun:** Makanan pokok orang Indonesia", answer: "mars nasi", id: 3 }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minigame')
        .setDescription('🎮 Mainkan berbagai macam kuis dan game asah otak Naura!')

        .addSubcommand(sub => sub.setName('math').setDescription('Kuis Matematika Kecepatan.').addStringOption(opt => opt.setName('kesulitan').setDescription('Tingkat Kesulitan').setRequired(true).addChoices({ name: '🟢 Pemula', value: 'pemula' }, { name: '🔵 Tingkat Lanjut', value: 'lanjut' }, { name: '🟣 Master', value: 'master' }, { name: '🟡 GrandMaster', value: 'grandmaster' })))

        .addSubcommand(sub => sub.setName('trivia').setDescription('Kuis Pengetahuan Umum AI.').addStringOption(opt => opt.setName('kesulitan').setDescription('Tingkat Kesulitan').setRequired(true).addChoices({ name: '🟢 Pemula', value: 'pemula' }, { name: '🔵 Tingkat Lanjut', value: 'lanjut' }, { name: '🟣 Master', value: 'master' }, { name: '🟡 GrandMaster', value: 'grandmaster' })))

        .addSubcommand(sub => sub.setName('rps').setDescription('Batu Gunting Kertas melawan Bot.').addIntegerOption(opt => opt.setName('taruhan').setDescription('Jumlah taruhan koin').setRequired(true)))

        .addSubcommand(sub => sub.setName('tictactoe').setDescription('Tic-Tac-Toe melawan AI Bot.').addIntegerOption(opt => opt.setName('taruhan').setDescription('Jumlah taruhan koin').setRequired(true)))

        .addSubcommand(sub => sub.setName('wordle').setDescription('Tebak kata rahasia 5 huruf (6 kesempatan).').addIntegerOption(opt => opt.setName('taruhan').setDescription('Jumlah taruhan koin').setRequired(true)))

        // ==========================================
        // ✨ SUBCOMMAND BARU: DUEL REAL-TIME
        // ==========================================
        .addSubcommand(sub => sub.setName('duel').setDescription('⚔️ Tantang pemain lain dalam duel matematika real-time!')
            .addUserOption(opt => opt.setName('lawan').setDescription('Pilih pemain yang ingin ditantang').setRequired(true))
            .addIntegerOption(opt => opt.setName('taruhan').setDescription('Jumlah koin taruhan (opsional)').setRequired(false)))

        // ==========================================
        // 🧩 SUBCOMMAND BARU: ASAH OTAK
        // ==========================================
        .addSubcommand(sub => sub.setName('tebakkata').setDescription('🔠 Tebak anagram kata yang diacak.').addStringOption(opt => opt.setName('kesulitan').setDescription('Tingkat Kesulitan').setRequired(true).addChoices({ name: '🟢 Mudah', value: 'mudah' }, { name: '🔴 Sulit', value: 'sulit' })))
        .addSubcommand(sub => sub.setName('tebakgambar').setDescription('🖼️ Tebak objek apa yang ada di dalam gambar.'))
        .addSubcommand(sub => sub.setName('tts').setDescription('📝 Teka Teki Silang Mini.'))

        // ==========================================
        // 🏆 PEMBARUAN LEADERBOARD
        // ==========================================
        .addSubcommand(sub => sub.setName('leaderboard').setDescription('🏆 Papan Peringkat Minigame.')
            .addStringOption(opt => opt.setName('kategori').setDescription('Kategori Peringkat').setRequired(true).addChoices(
                { name: '🧮 Matematika', value: 'math' },
                { name: '🧠 Trivia', value: 'trivia' },
                { name: '⚔️ Duel Master', value: 'duel' }
            ))),

    async execute(interaction) {
        await interaction.deferReply();
        await runMinigameLogic(interaction);
    },

    async executePrefix(message, args, client) {
        if (!args || args.length === 0) {
            return message.reply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`❌ Harap masukkan nama minigame! Contoh: \`n!minigame math pemula\``)] });
        }

        const subcommandName = args.shift().toLowerCase();

        const mockInteraction = {
            client: client,
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            options: {
                getSubcommand: () => subcommandName,
                getUser: () => message.mentions.users.first() || null,
                getString: (name) => args[0] || null,
                getInteger: (name) => parseInt(args[0]) || 0
            },
            deferReply: async () => { },
            editReply: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                delete msgPayload.ephemeral;
                return await message.reply(msgPayload);
            },
            reply: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                delete msgPayload.ephemeral;
                return await message.reply(msgPayload);
            },
            followUp: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                delete msgPayload.ephemeral;
                return await message.channel.send(msgPayload);
            },
            fetchReply: async () => {
                // Simplified mock for fetchReply if needed
                const sentMsg = await message.reply({ content: "⏳ Memproses minigame..." });
                return sentMsg;
            }
        };

        // Ganti fetchReply behavior untuk RPS dan wordle agar collector jalan di pesan yang sama
        let lastMsg = null;
        mockInteraction.editReply = async (payload) => {
            let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
            delete msgPayload.ephemeral;
            if (lastMsg) return await lastMsg.edit(msgPayload);
            lastMsg = await message.reply(msgPayload);
            return lastMsg;
        };
        mockInteraction.fetchReply = async () => lastMsg;

        await runMinigameLogic(mockInteraction);
    }
};

async function runMinigameLogic(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const user = interaction.user;

    // Memuat profil MySQL
    let [profile] = await UserProfile.findOrCreate({ where: { userId: user.id } });

    const coinEmoji = ui.emojis.coin || '🪙';
    const errorEmoji = ui.emojis.error || '❌';
    const sendError = (msg) => interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`${errorEmoji} ${msg}`)] });

    // ==========================================
    // ⚔️ SISTEM DUEL MULTIPLAYER REAL-TIME
    // ==========================================
    if (subcommand === 'duel') {
        const opponent = interaction.options.getUser('lawan');
        const taruhan = interaction.options.getInteger('taruhan') || 0;

        if (opponent.bot) return sendError('Kamu tidak bisa menantang mesin/bot!');
        if (opponent.id === user.id) return sendError('Kamu tidak bisa menantang dirimu sendiri!');

        const [opponentProfile] = await UserProfile.findOrCreate({ where: { userId: opponent.id } });

        // Cek saldo taruhan di MySQL
        if (taruhan > 0) {
            if (profile.economy_wallet < taruhan) return sendError(`Saldo koinmu tidak cukup untuk bertaruh sebesar **${taruhan.toLocaleString()}**!`);
            if (opponentProfile.economy_wallet < taruhan) return sendError(`Saldo <@${opponent.id}> tidak cukup untuk taruhan ini!`);
        }

        const inviteEmbed = new EmbedBuilder()
            .setColor(ui.colors.primary || '#00FFFF')
            .setTitle('⚔️ TANTANGAN DUEL ⚔️')
            .setDescription(`<@${user.id}> menantang <@${opponent.id}> untuk duel matematika kecepatan!\n\n**Taruhan:** ${taruhan.toLocaleString()} ${coinEmoji}\n\nApakah kamu berani menerima tantangan ini?`)
            .setFooter({ text: 'Tantangan ini akan kadaluarsa dalam 30 detik.' });

        const rowInvite = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('duel_accept').setLabel('Terima').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId('duel_decline').setLabel('Tolak').setStyle(ButtonStyle.Danger)
        );

        const response = await interaction.editReply({ content: `<@${opponent.id}>`, embeds: [inviteEmbed], components: [rowInvite] });

        const collectorInvite = response.createMessageComponentCollector({
            filter: i => i.user.id === opponent.id,
            time: 30000
        });

        collectorInvite.on('collect', async i => {
            if (i.customId === 'duel_decline') {
                await i.update({ content: `❌ <@${opponent.id}> lari dari tantangan duel.`, embeds: [], components: [] });
                return collectorInvite.stop();
            }

            // Jika diterima, proses game
            await i.deferUpdate();

            const n1 = Math.floor(Math.random() * 50) + 10;
            const n2 = Math.floor(Math.random() * 50) + 10;
            const answer = n1 + n2;

            // Menyiapkan 4 pilihan acak
            let options = [answer, answer + 5, answer - 3, answer + 10].sort(() => Math.random() - 0.5);

            const gameEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('⚡ PERTANDINGAN DIMULAI ⚡')
                .setDescription(`Siapa yang paling cepat menekan jawaban yang benar?!\n\n**SOAL:** Berapa hasil dari **${n1} + ${n2}**?`)
                .setFooter({ text: 'Cepat! Waktu terus berjalan (15 Detik)' });

            const rowGame = new ActionRowBuilder().addComponents(
                options.map(opt =>
                    new ButtonBuilder().setCustomId(`ans_${opt}`).setLabel(opt.toString()).setStyle(ButtonStyle.Primary)
                )
            );

            await interaction.editReply({ content: `🔥 **DUEL DIMULAI:** <@${user.id}> vs <@${opponent.id}> 🔥`, embeds: [gameEmbed], components: [rowGame] });

            const gameCollector = response.createMessageComponentCollector({
                componentType: ComponentType.Button,
                time: 15000
            });

            gameCollector.on('collect', async gi => {
                // Pastikan hanya mereka berdua yang bisa klik
                if (gi.user.id !== user.id && gi.user.id !== opponent.id) {
                    return gi.reply({ content: 'Kamu bukan peserta duel ini!', ephemeral: true });
                }

                const chosen = parseInt(gi.customId.split('_')[1]);
                const winner = gi.user;
                const loser = winner.id === user.id ? opponent : user;

                if (chosen === answer) {
                    gameCollector.stop('win');

                    // Menangani Database MySQL untuk pemenang dan pecundang
                    const [winProf] = await UserProfile.findOrCreate({ where: { userId: winner.id } });
                    const [loseProf] = await UserProfile.findOrCreate({ where: { userId: loser.id } });

                    winProf.minigame_duelScore += 10;
                    if (taruhan > 0) {
                        winProf.economy_wallet += taruhan;
                        loseProf.economy_wallet -= taruhan;
                    }

                    await winProf.save();
                    await loseProf.save();

                    const winEmbed = new EmbedBuilder()
                        .setColor('#00FF00')
                        .setTitle('🏆 PEMENANG DUEL')
                        .setDescription(`Tembakan cepat dari <@${winner.id}> tepat sasaran!\n\n**Jawaban Benar:** ${answer}\n\n**Hadiah Pemenang:**\n> +10 Poin Duel\n> ${taruhan > 0 ? `+${taruhan.toLocaleString()} ${coinEmoji}` : 'Tidak ada taruhan'}`);

                    await gi.update({ content: null, embeds: [winEmbed], components: [] });
                } else {
                    // Jika klik salah
                    await gi.reply({ content: `❌ Ups! Jawabanmu salah, kamu kehilangan kesempatan untuk menang!`, ephemeral: true });
                }
            });

            gameCollector.on('end', (collected, reason) => {
                if (reason === 'time') {
                    interaction.editReply({ content: '⏰ Pertandingan dibatalkan karena waktu habis, tidak ada yang menjawab.', embeds: [], components: [] }).catch(() => { });
                }
            });
        });

        collectorInvite.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: `⏰ <@${opponent.id}> terlalu lama merespons. Tantangan dibatalkan.`, embeds: [], components: [] }).catch(() => { });
            }
        });

        return; // Selesaikan eksekusi agar tidak masuk ke logika lain
    }

    // ==========================================
    // 🧠 KUIS TRIVIA (INFINITY AI GENERATOR)
    // ==========================================
    else if (subcommand === 'trivia') {
        const diff = interaction.options.getString('kesulitan');
        const conf = rewards[diff];
        let qData;

        try {
            const promptAI = `Buatkan 1 soal kuis trivia pengetahuan umum yang menarik, berbahasa Indonesia, secara acak dengan tingkat kesulitan: ${diff.toUpperCase()}. 
                Format balasan HARUS berupa JSON murni (tanpa tanda markdown \`\`\`json) dengan struktur persis seperti ini:
                {
                    "q": "Tulis pertanyaan di sini",
                    "options": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
                    "a": "Tulis jawaban yang benar di sini (harus sama persis dengan salah satu isi options)"
                }`;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: promptAI
            });

            const jsonText = response.text.replace(/```json/gi, '').replace(/```/gi, '').trim();
            qData = JSON.parse(jsonText);

            if (!qData.q || !qData.options || !qData.a || !qData.options.includes(qData.a)) {
                throw new Error('Format JSON dari AI rusak');
            }
        } catch (error) {
            console.error('Gagal generate soal dari AI, memakai soal cadangan:', error);
            const fallbackQuestions = triviaDBFallback[diff];
            qData = fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
        }

        const shuffledOptions = [...qData.options].sort(() => Math.random() - 0.5);
        const correctIndex = shuffledOptions.indexOf(qData.a);

        const embed = new EmbedBuilder()
            .setColor(conf.color)
            .setAuthor({ name: `Kuis Trivia AI [${diff.toUpperCase()}]`, iconURL: user.displayAvatarURL() })
            .setTitle(qData.q)
            .setDescription(`⏳ Pilih jawaban yang benar di bawah! Waktu: **${conf.time / 1000} detik**.\n\n> 💰 Hadiah: **${conf.coin}** ${coinEmoji}\n> 🏆 Skor: **+${conf.score}** Poin`)
            .setFooter({ text: 'Soal dibuat khusus oleh Naura AI' });

        const row = new ActionRowBuilder().addComponents(
            shuffledOptions.map((opt, index) =>
                new ButtonBuilder().setCustomId(`trivia_${index}`).setLabel(opt).setStyle(ButtonStyle.Primary)
            )
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: conf.time });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: '❌ Ini kuis milik orang lain!', ephemeral: true });

            const selectedIndex = parseInt(i.customId.split('_')[1]);

            const newRow = new ActionRowBuilder().addComponents(
                shuffledOptions.map((opt, index) => {
                    const btn = new ButtonBuilder().setCustomId(`done_${index}`).setLabel(opt).setDisabled(true);
                    if (index === correctIndex) btn.setStyle(ButtonStyle.Success);
                    else if (index === selectedIndex) btn.setStyle(ButtonStyle.Danger);
                    else btn.setStyle(ButtonStyle.Secondary);
                    return btn;
                })
            );

            if (selectedIndex === correctIndex) {
                profile.economy_wallet += conf.coin;
                profile.minigame_triviaScore += conf.score;
                await profile.save();
                await i.update({ content: `🎉 **TEPAT SEKALI!** Kamu mendapat **${conf.coin}** ${coinEmoji}!`, components: [newRow] });
            } else {
                await i.update({ content: `❌ **SALAH!** Jawaban yang benar adalah **${qData.a}**.`, components: [newRow] });
            }
            collector.stop('answered');
        });

        collector.on('end', (collected, reason) => {
            if (reason !== 'answered') {
                const disabledRow = new ActionRowBuilder().addComponents(
                    shuffledOptions.map((opt, index) => new ButtonBuilder().setCustomId(`exp_${index}`).setLabel(opt).setStyle(index === correctIndex ? ButtonStyle.Success : ButtonStyle.Secondary).setDisabled(true))
                );
                interaction.editReply({ content: `⏰ **WAKTU HABIS!**`, components: [disabledRow] }).catch(() => { });
            }
        });
    }

    // ==========================================
    // 🧮 KUIS MATEMATIKA
    // ==========================================
    else if (subcommand === 'math') {
        const diff = interaction.options.getString('kesulitan');
        const conf = rewards[diff];
        const mathData = generateMath(diff);

        const embed = new EmbedBuilder()
            .setColor(conf.color)
            .setAuthor({ name: `Kuis Matematika [${diff.toUpperCase()}]`, iconURL: user.displayAvatarURL() })
            .setTitle(`Berapa hasil dari:  **${mathData.question}** ?`)
            .setDescription(`⏳ Ketik jawabanmu di chat ini! Waktumu hanya **${conf.time / 1000} detik**.\n\n> 💰 Hadiah: **${conf.coin}** ${coinEmoji}\n> 🏆 Skor: **+${conf.score}** Poin`);

        await interaction.editReply({ embeds: [embed] });

        const filter = m => m.author.id === user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: conf.time, max: 1 });

        collector.on('collect', async m => {
            if (m.content.trim() === mathData.answer) {
                profile.economy_wallet += conf.coin;
                profile.minigame_mathScore += conf.score;
                await profile.save();
                m.reply(`✅ **BENAR!** Jawaban yang tepat adalah **${mathData.answer}**.\nKamu mendapatkan **${conf.coin}** ${coinEmoji} dan **${conf.score}** Poin Math!`);
            } else {
                m.reply(`❌ **SALAH!** Jawaban yang benar adalah **${mathData.answer}**.`);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) interaction.followUp(`⏰ Waktu habis, <@${user.id}>! Jawaban yang benar adalah **${mathData.answer}**.`);
        });
    }

    // ==========================================
    // ✂️ BATU GUNTING KERTAS (RPS)
    // ==========================================
    else if (subcommand === 'rps') {
        const taruhan = interaction.options.getInteger('taruhan');
        if (taruhan <= 0 || profile.economy_wallet < taruhan) return sendError(`Taruhan tidak valid atau saldo kurang!`);

        const embed = new EmbedBuilder()
            .setColor(ui.colors.primary || '#00FFFF')
            .setAuthor({ name: 'Batu Gunting Kertas', iconURL: user.displayAvatarURL() })
            .setDescription(`Kamu mempertaruhkan **${taruhan.toLocaleString()}** ${coinEmoji}.\nSilakan pilih gerakanmu dalam **15 detik**!`);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('rps_batu').setEmoji('🪨').setLabel('Batu').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('rps_gunting').setEmoji('✂️').setLabel('Gunting').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('rps_kertas').setEmoji('📄').setLabel('Kertas').setStyle(ButtonStyle.Success)
        );

        await interaction.editReply({ embeds: [embed], components: [row] });
        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 15000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: 'Ini game milik orang lain!', ephemeral: true });

            const userChoice = i.customId.split('_')[1];
            const choices = ['batu', 'gunting', 'kertas'];
            const botChoice = choices[Math.floor(Math.random() * choices.length)];

            let result = '';
            let color = '#FFD700';

            if (userChoice === botChoice) {
                result = `SERI! Kalian berdua memilih **${userChoice}**.\nKoin taruhan dikembalikan.`;
                color = '#FFFF00';
            } else if (
                (userChoice === 'batu' && botChoice === 'gunting') ||
                (userChoice === 'gunting' && botChoice === 'kertas') ||
                (userChoice === 'kertas' && botChoice === 'batu')
            ) {
                profile.economy_wallet += taruhan;
                profile.minigame_rpsWin += 1;
                result = `MENANG! Bot memilih **${botChoice}**.\nKamu memenangkan **${(taruhan * 2).toLocaleString()}** ${coinEmoji}!`;
                color = '#00FF00';
            } else {
                profile.economy_wallet -= taruhan;
                result = `KALAH! Bot memilih **${botChoice}**.\nKamu kehilangan taruhanmu.`;
                color = '#FF0000';
            }

            await profile.save();

            const resEmbed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`Pilihanmu: ${userChoice.toUpperCase()} | Pilihan Bot: ${botChoice.toUpperCase()}`)
                .setDescription(result);

            await i.update({ embeds: [resEmbed], components: [] });
            collector.stop();
        });

        collector.on('end', collected => {
            if (collected.size === 0) interaction.editReply({ content: `⏰ Waktu memilih habis! Taruhan dibatalkan.`, embeds: [], components: [] });
        });
    }

    // ==========================================
    // ⭕ TIC-TAC-TOE (Lawan Bot AI)
    // ==========================================
    else if (subcommand === 'tictactoe') {
        const taruhan = interaction.options.getInteger('taruhan');
        if (taruhan <= 0 || profile.economy_wallet < taruhan) return sendError(`Taruhan tidak valid atau saldo kurang!`);

        let board = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        const checkWin = (b) => {
            const wins = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
            for (let w of wins) {
                if (b[w[0]] === b[w[1]] && b[w[1]] === b[w[2]]) return b[w[0]];
            }
            if (b.every(c => c === 'X' || c === 'O')) return 'DRAW';
            return null;
        };

        const buildBoardUI = (b, disabled = false) => {
            const rows = [];
            for (let i = 0; i < 3; i++) {
                const row = new ActionRowBuilder();
                for (let j = 0; j < 3; j++) {
                    const idx = i * 3 + j;
                    const val = b[idx];
                    const btn = new ButtonBuilder().setCustomId(`ttt_${idx}`).setDisabled(disabled || val === 'X' || val === 'O');
                    if (val === 'X') btn.setLabel('❌').setStyle(ButtonStyle.Primary);
                    else if (val === 'O') btn.setLabel('⭕').setStyle(ButtonStyle.Danger);
                    else btn.setLabel('➖').setStyle(ButtonStyle.Secondary);
                    row.addComponents(btn);
                }
                rows.push(row);
            }
            return rows;
        };

        await interaction.editReply({
            content: `🕹️ **Tic-Tac-Toe** | Taruhan: **${taruhan.toLocaleString()}** ${coinEmoji}\nKamu adalah ❌. Lawan AI bot ⭕!`,
            components: buildBoardUI(board)
        });
        const message = await interaction.fetchReply();
        const collector = message.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== user.id) return i.reply({ content: 'Ini papan milik orang lain!', ephemeral: true });

            const pos = parseInt(i.customId.split('_')[1]);
            board[pos] = 'X';
            let status = checkWin(board);

            if (!status) {
                const emptySpots = board.filter(s => s !== 'X' && s !== 'O');
                if (emptySpots.length > 0) {
                    const botMove = emptySpots[Math.floor(Math.random() * emptySpots.length)];
                    board[botMove] = 'O';
                    status = checkWin(board);
                }
            }

            if (status) {
                let msg = '';
                if (status === 'X') {
                    profile.economy_wallet += taruhan;
                    profile.minigame_tttWin += 1;
                    msg = `🏆 **KAMU MENANG!** Kamu mendapatkan **${(taruhan * 2).toLocaleString()}** ${coinEmoji}.`;
                } else if (status === 'O') {
                    profile.economy_wallet -= taruhan;
                    msg = `💀 **KAMU KALAH!** Bot AI memenangkan taruhanmu.`;
                } else {
                    msg = `🤝 **SERI!** Permainan imbang, koin dikembalikan.`;
                }
                await profile.save();
                await i.update({ content: msg, components: buildBoardUI(board, true) });
                collector.stop();
            } else {
                await i.update({ components: buildBoardUI(board) });
                collector.resetTimer();
            }
        });

        collector.on('end', collected => {
            if (checkWin(board) === null) {
                profile.economy_wallet -= taruhan;
                profile.save();
                interaction.editReply({ content: `⏰ **WAKTU HABIS!** Kamu dianggap WO dan kehilangan taruhan.`, components: buildBoardUI(board, true) }).catch(() => { });
            }
        });
    }

    // ==========================================
    // 🟩 WORDLE (Tebak Kata 5 Huruf)
    // ==========================================
    else if (subcommand === 'wordle') {
        const taruhan = interaction.options.getInteger('taruhan');
        if (taruhan <= 0 || profile.economy_wallet < taruhan) return sendError(`Taruhan tidak valid atau saldo kurang!`);

        const targetWord = wordleWords[Math.floor(Math.random() * wordleWords.length)];
        let attempts = 0;
        const maxAttempts = 6;
        let gridHistory = [];

        profile.economy_wallet -= taruhan;
        await profile.save();

        const embed = new EmbedBuilder()
            .setColor('#2b2d31')
            .setTitle('🟩 🟨 ⬛ Naura Wordle (ID)')
            .setDescription(`Aku telah memikirkan **Kata 5 Huruf** (Bahasa Indonesia).\nKetik tebakanmu di chat ini!\n\n**Kesempatan:** ${maxAttempts - attempts}\n**Taruhan:** ${taruhan.toLocaleString()} ${coinEmoji} (Menang = 3x Lipat)`)
            .setFooter({ text: 'Ketik 5 huruf sekarang...' });

        await interaction.editReply({ embeds: [embed] });

        const filter = m => m.author.id === user.id && m.content.length === 5;
        const collector = interaction.channel.createMessageCollector({ filter, time: 60000 });

        collector.on('collect', async m => {
            const guess = m.content.toUpperCase();
            attempts++;

            let resultRow = '';
            let targetArr = targetWord.split('');
            let guessArr = guess.split('');
            let statusArr = ['⬛', '⬛', '⬛', '⬛', '⬛'];

            for (let i = 0; i < 5; i++) {
                if (guessArr[i] === targetArr[i]) {
                    statusArr[i] = '🟩';
                    targetArr[i] = null;
                    guessArr[i] = null;
                }
            }
            for (let i = 0; i < 5; i++) {
                if (guessArr[i] !== null && targetArr.includes(guessArr[i])) {
                    statusArr[i] = '🟨';
                    targetArr[targetArr.indexOf(guessArr[i])] = null;
                }
            }

            resultRow = statusArr.join(' ');
            gridHistory.push(`\`${guess}\` | ${resultRow}`);

            if (guess === targetWord) {
                profile.economy_wallet += (taruhan * 3);
                profile.minigame_wordleWin += 1;
                await profile.save();

                const winEmbed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('🎉 TEPAT SEKALI!')
                    .setDescription(`Target Kata: **${targetWord}**\n\n${gridHistory.join('\n')}\n\nKamu memenangkan **${(taruhan * 3).toLocaleString()}** ${coinEmoji}!`);

                await interaction.followUp({ embeds: [winEmbed] });
                collector.stop('win');
                return;
            }

            if (attempts >= maxAttempts) {
                const loseEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle('💀 KESEMPATAN HABIS!')
                    .setDescription(`Target Kata yang benar adalah: **${targetWord}**\n\n${gridHistory.join('\n')}\n\nKamu kehilangan taruhanmu.`);

                await interaction.followUp({ embeds: [loseEmbed] });
                collector.stop('lose');
                return;
            }

            const updateEmbed = new EmbedBuilder()
                .setColor('#2b2d31')
                .setTitle('🟩 🟨 ⬛ Naura Wordle')
                .setDescription(`**Riwayat Tebakan:**\n${gridHistory.join('\n')}\n\nSisa kesempatan: **${maxAttempts - attempts}**`);

            await interaction.editReply({ embeds: [updateEmbed] });
            collector.resetTimer();
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.followUp(`⏰ Waktu menebak habis! Kata yang benar adalah **${targetWord}**.`);
            }
        });
    }

    // ==========================================
    // 🔠 TEBAK KATA (ANAGRAM)
    // ==========================================
    else if (subcommand === 'tebakkata') {
        const diff = interaction.options.getString('kesulitan');
        const words = anagramDB[diff];
        const targetWord = words[Math.floor(Math.random() * words.length)];

        let shuffledWord = targetWord;
        while (shuffledWord === targetWord) {
            shuffledWord = targetWord.split('').sort(() => Math.random() - 0.5).join(' ');
        }

        const conf = diff === 'mudah' ? rewards.pemula : rewards.lanjut;
        const rewardCoin = Math.floor(conf.coin * 1.5);

        const embed = new EmbedBuilder()
            .setColor(conf.color)
            .setTitle(`🔠 Tebak Kata [${diff.toUpperCase()}]`)
            .setDescription(`Susun kembali huruf-huruf berikut menjadi kata yang benar:\n\n**${shuffledWord}**\n\n⏳ Ketik jawabanmu dalam waktu **${conf.time / 1000} detik**!\n> 💰 Hadiah: **${rewardCoin}** ${coinEmoji}`);

        await interaction.editReply({ embeds: [embed] });

        const filter = m => m.author.id === user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: conf.time, max: 1 });

        collector.on('collect', async m => {
            if (m.content.trim().toUpperCase() === targetWord) {
                profile.economy_wallet += rewardCoin;
                await profile.save();
                m.reply(`✅ **BENAR!** Kata yang tepat adalah **${targetWord}**.\nKamu mendapatkan **${rewardCoin}** ${coinEmoji}!`);
            } else {
                m.reply(`❌ **SALAH!** Kata yang benar adalah **${targetWord}**.`);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) interaction.followUp(`⏰ Waktu habis! Kata yang benar adalah **${targetWord}**.`);
        });
    }

    // ==========================================
    // 🖼️ TEBAK GAMBAR
    // ==========================================
    else if (subcommand === 'tebakgambar') {
        const gameData = tebakGambarDB[Math.floor(Math.random() * tebakGambarDB.length)];
        const rewardCoin = 250;

        const embed = new EmbedBuilder()
            .setColor(ui.getColor ? ui.getColor('primary') : '#00FFFF')
            .setTitle('🖼️ Tebak Gambar Objek')
            .setDescription(`Ketik apa objek yang ada pada gambar di atas!\n\n💡 **Klu:** ${gameData.clue}\n\n⏳ Waktu: **20 detik**\n> 💰 Hadiah: **${rewardCoin}** ${coinEmoji}`)
            .setImage(gameData.url);

        await interaction.editReply({ embeds: [embed] });

        const filter = m => m.author.id === user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 20000, max: 1 });

        collector.on('collect', async m => {
            if (m.content.trim().toLowerCase() === gameData.answer.toLowerCase()) {
                profile.economy_wallet += rewardCoin;
                await profile.save();
                m.reply(`✅ **BENAR!** Objek itu adalah **${gameData.answer}**.\nKamu mendapatkan **${rewardCoin}** ${coinEmoji}!`);
            } else {
                m.reply(`❌ **SALAH!** Jawaban yang benar adalah **${gameData.answer}**.`);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) interaction.followUp(`⏰ Waktu habis! Jawaban yang benar adalah **${gameData.answer}**.`);
        });
    }

    // ==========================================
    // 📝 TEKA TEKI SILANG MINI
    // ==========================================
    else if (subcommand === 'tts') {
        const gameData = ttsDB[Math.floor(Math.random() * ttsDB.length)];
        const rewardCoin = 400;

        const embed = new EmbedBuilder()
            .setColor('#FF00FF')
            .setTitle('📝 Teka Teki Silang Mini')
            .setDescription(`Jawablah kedua klu di bawah ini secara berurutan, pisahkan dengan **spasi**.\n*(Contoh jawaban: \`buku pensil\`)*\n\n${gameData.clue}\n\n⏳ Waktu: **25 detik**\n> 💰 Hadiah: **${rewardCoin}** ${coinEmoji}`);

        await interaction.editReply({ embeds: [embed] });

        const filter = m => m.author.id === user.id;
        const collector = interaction.channel.createMessageCollector({ filter, time: 25000, max: 1 });

        collector.on('collect', async m => {
            if (m.content.trim().toLowerCase() === gameData.answer.toLowerCase()) {
                profile.economy_wallet += rewardCoin;
                await profile.save();
                m.reply(`✅ **BENAR!** Kamu menyelesaikan TTS ini.\nKamu mendapatkan **${rewardCoin}** ${coinEmoji}!`);
            } else {
                m.reply(`❌ **SALAH!** Jawaban yang tepat adalah: **${gameData.answer}**.`);
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) interaction.followUp(`⏰ Waktu habis! Jawaban yang benar adalah **${gameData.answer}**.`);
        });
    }

    // ==========================================
    // 🏆 LEADERBOARD MINIGAMES (KINI MENDUKUNG DUEL)
    // ==========================================
    else if (subcommand === 'leaderboard') {
        const category = interaction.options.getString('kategori');

        const isMath = category === 'math';
        const isTrivia = category === 'trivia';
        const isDuel = category === 'duel';

        let title = '';
        if (isMath) title = '🧮 Top 10 GrandMaster Matematika';
        else if (isTrivia) title = '🧠 Top 10 GrandMaster Trivia';
        else if (isDuel) title = '⚔️ Top 10 Jawara Duel Naura';

        const allUsers = await UserProfile.findAll();
        const sortedUsers = allUsers
            .filter(u => {
                if (isMath) return u.minigame_mathScore > 0;
                if (isTrivia) return u.minigame_triviaScore > 0;
                if (isDuel) return u.minigame_duelScore > 0;
            })
            .sort((a, b) => {
                if (isMath) return b.minigame_mathScore - a.minigame_mathScore;
                if (isTrivia) return b.minigame_triviaScore - a.minigame_triviaScore;
                if (isDuel) return b.minigame_duelScore - a.minigame_duelScore;
            })
            .slice(0, 10);

        if (sortedUsers.length === 0) return sendError('Belum ada yang mencetak skor di kategori kuis ini.');

        let descString = `> Inilah daftar pemain kuis terbaik di server!\n\n`;
        sortedUsers.forEach((u, i) => {
            let medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
            let score = 0;
            if (isMath) score = u.minigame_mathScore;
            else if (isTrivia) score = u.minigame_triviaScore;
            else if (isDuel) score = u.minigame_duelScore;

            descString += `${medal} **#${i + 1}** | <@${u.userId}>\n> 🏆 Skor: **${score.toLocaleString()}** Poin\n\n`;
        });

        const embed = new EmbedBuilder()
            .setColor(ui.colors.primary || '#00FFFF')
            .setAuthor({ name: title, iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(descString)
            .setFooter({ text: 'Naura Minigames Leaderboard (v1.0.0)' });

        return interaction.editReply({ embeds: [embed] });
    }
}