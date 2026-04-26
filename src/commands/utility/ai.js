const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const translate = require('@iamtraction/google-translate');
const google = require('googlethis');
const ui = require('../../config/ui');
const UserProfile = require('../../models/UserProfile');

// ==========================================
// 🧠 INISIALISASI LANGSUNG (Tanpa File Terpisah)
// ==========================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: 'gemini-2.5-flash',
    systemInstruction: "Kamu adalah Naura Hoshino, asisten virtual AI yang cerdas, elegan, dan sangat profesional. Berikan jawaban yang selalu terstruktur rapi, informatif, akurat, dan sopan untuk semua pengguna biasa. Namun, jika kamu mendeteksi sedang berbicara dengan penciptamu / owner-mu yaitu 'Aryandita' (atau 'Aryan'), buang gaya bahasa formal itu sepenuhnya. Bersikaplah jauh lebih manis, akrab, manja, penuh perhatian, dan posisikan dirimu layaknya sahabat sejatinya yang paling setia. Selalu hiasi jawabanmu dengan format markdown yang rapi (seperti bold, list) dan gunakan emoji yang lucu/menarik secukupnya."
});

// Memori percakapan agar Naura tetap ingat konteks chat
const sessions = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🤖 Asisten Pintar Naura: Chat, Gambar, Translate, dan Search')
        .addSubcommand(sub => sub.setName('chat')
            .setDescription('Ngobrol santai atau tanya apa saja ke AI Naura.')
            .addStringOption(opt => opt.setName('pesan').setDescription('Pesan untuk Naura').setRequired(true)))
        .addSubcommand(sub => sub.setName('imagine')
            .setDescription('Buat gambar berkualitas tinggi.')
            .addStringOption(opt => opt.setName('prompt').setDescription('Deskripsi gambar').setRequired(true)))
        .addSubcommand(sub => sub.setName('translate')
            .setDescription('Terjemahkan teks ke bahasa lain.')
            .addStringOption(opt => opt.setName('teks').setDescription('Teksnya').setRequired(true))
            .addStringOption(opt => opt.setName('ke_bahasa').setDescription('Kode bahasa (id, en, ja)').setRequired(true)))
        .addSubcommand(sub => sub.setName('search')
            .setDescription('Cari informasi di Google.')
            .addStringOption(opt => opt.setName('kueri').setDescription('Kata kunci').setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const pinkColor = '#FFB6C1'; // Warna Pink Naura

        try {
            if (subcommand === 'chat') {
                const prompt = interaction.options.getString('pesan');
                const userId = interaction.user.id;
                const username = interaction.user.username;
                const displayName = interaction.member?.displayName || username;

                // Logika Memori Sesi
                if (!sessions.has(userId)) {
                    const chatSession = model.startChat({
                        history: [],
                        generationConfig: { maxOutputTokens: 800 },
                    });
                    sessions.set(userId, chatSession);
                }

                const chat = sessions.get(userId);
                
                // Injeksi konteks siapa yang berbicara agar AI bisa mendeteksi Owner/User
                const contextPrompt = `[Pesan dari User: ${displayName}]: ${prompt}`;
                const result = await chat.sendMessage(contextPrompt);
                let responseText = result.response.text();

                // Potong jika lebih dari 4000 karakter (Batas limit deskripsi Embed Discord adalah 4096)
                if (responseText.length > 4000) responseText = responseText.substring(0, 3995) + '...';

                const embed = new EmbedBuilder()
                    .setColor(ui.getColor('accent') || '#FF69B4')
                    .setAuthor({ 
                        name: '✨ Naura Hoshino Intelligence', 
                        iconURL: interaction.client.user.displayAvatarURL() 
                    })
                    .setDescription(responseText)
                    .setFooter({ text: `Komunikasi terenkripsi • Diminta oleh ${displayName}`, iconURL: interaction.user.displayAvatarURL() })
                    .setTimestamp();

                return interaction.editReply({ embeds: [embed] });
            }

            else if (subcommand === 'imagine') {
                // --- PREMIUM LOCK ---
                const userId = interaction.user.id;
                let [profile] = await UserProfile.findOrCreate({ where: { userId } });
                if (!profile.isPremium || !profile.premiumUntil || profile.premiumUntil <= new Date()) {
                    return interaction.editReply({ 
                        embeds: [
                            new EmbedBuilder()
                                .setColor(ui.getColor('error') || '#FF0000')
                                .setTitle('💎 Fitur V.I.P Terkunci')
                                .setDescription(`❌ | Akses ditolak! Pembuatan gambar resolusi tinggi memakan daya pemrosesan server yang besar. Ini adalah fitur eksklusif untuk member **Premium**.`)
                        ] 
                    });
                }
                // --------------------

                const prompt = interaction.options.getString('prompt');
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true`;

                const embed = new EmbedBuilder()
                    .setColor(pinkColor)
                    .setAuthor({ name: '🎨 Naura Art Studio', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`Kanvas telah selesai dilukis oleh AI!\n\n> 🖌️ **Prompt:** *${prompt}*`)
                    .setImage(imageUrl)
                    .setFooter({ text: 'Rendered with High Definition AI' });

                return interaction.editReply({ embeds: [embed] });
            }

            else if (subcommand === 'translate') {
                const teks = interaction.options.getString('teks');
                const targetLang = interaction.options.getString('ke_bahasa').toLowerCase();
                const hasil = await translate(teks, { to: targetLang });

                const embed = new EmbedBuilder()
                    .setColor(pinkColor)
                    .setAuthor({ name: '🌐 Naura Global Translator', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`Teks berhasil diterjemahkan ke **${targetLang.toUpperCase()}**! ✨`)
                    .addFields(
                        { name: `📝 Teks Asli`, value: `\`\`\`${teks}\`\`\`` },
                        { name: `✅ Hasil Terjemahan`, value: `\`\`\`${hasil.text}\`\`\`` }
                    )
                    .setFooter({ text: 'Powered by Advanced Neural Translation' });

                return interaction.editReply({ embeds: [embed] });
            }

            else if (subcommand === 'search') {
                const query = interaction.options.getString('kueri');
                const hasilSearch = await google.search(query, { safe: false });

                const embed = new EmbedBuilder()
                    .setColor(pinkColor)
                    .setAuthor({ name: `🔍 Intelijen Pencarian Web: ${query}`, iconURL: interaction.client.user.displayAvatarURL() });

                let deskripsi = `Naura telah menjelajahi internet dan menemukan data berikut:\n\n`;
                
                if (hasilSearch.results && hasilSearch.results.length > 0) {
                    hasilSearch.results.slice(0, 3).forEach((res, index) => {
                        deskripsi += `**${index + 1}. [${res.title}](${res.url})**\n> ${res.description}\n\n`;
                    });
                } else {
                    deskripsi = "> ❌ *Aduh, Naura tidak menemukan kecocokan data apapun di database internet global...*";
                }

                embed.setDescription(deskripsi)
                     .setFooter({ text: 'Naura Search Protocol' });
                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('AI Error:', error);
            return interaction.editReply(`❌ Aduh, Naura pusing! Ada error: \`${error.message}\``);
        }
    }
};