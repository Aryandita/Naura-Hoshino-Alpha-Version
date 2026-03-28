const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { GoogleGenAI } = require('@google/genai');
const translate = require('@iamtraction/google-translate');
const google = require('googlethis');
const ui = require('../../config/ui'); // Sesuaikan path jika berbeda

// Inisialisasi Otak Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('🤖 Asisten Pintar Naura: Chat, Gambar, Translate, dan Search')
        
        // 1. Subcommand: CHAT
        .addSubcommand(sub => sub.setName('chat')
            .setDescription('Ngobrol santai atau tanya apa saja ke AI Naura.')
            .addStringOption(opt => opt.setName('pesan').setDescription('Pesan yang ingin disampaikan').setRequired(true)))
        
        // 2. Subcommand: IMAGINE (Gambar)
        .addSubcommand(sub => sub.setName('imagine')
            .setDescription('Buat gambar berkualitas tinggi dari teks (Prompt Bahasa Inggris lebih baik).')
            .addStringOption(opt => opt.setName('prompt').setDescription('Deskripsikan gambar yang kamu inginkan').setRequired(true)))
        
        // 3. Subcommand: TRANSLATE
        .addSubcommand(sub => sub.setName('translate')
            .setDescription('Terjemahkan teks ke bahasa apa pun.')
            .addStringOption(opt => opt.setName('teks').setDescription('Teks yang ingin diterjemahkan').setRequired(true))
            .addStringOption(opt => opt.setName('ke_bahasa').setDescription('Kode bahasa (contoh: en, ja, id, ko, dll)').setRequired(true)))
        
        // 4. Subcommand: SEARCH
        .addSubcommand(sub => sub.setName('search')
            .setDescription('Cari informasi langsung dari internet.')
            .addStringOption(opt => opt.setName('kueri').setDescription('Kata kunci pencarian').setRequired(true))),

    async execute(interaction) {
        // Karena proses AI butuh waktu berpikir, kita harus menahan respons Discord (Defer)
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const loadingEmoji = ui.emojis?.loading || '⏳';

        try {
            // ==========================================
            // 🧠 1. LOGIKA CHAT AI (Gemini Flash)
            // ==========================================
            if (subcommand === 'chat') {
                const pesan = interaction.options.getString('pesan');
                
                // Minta AI merespons dengan model tercepat
                const response = await ai.models.generateContent({
                    model: 'gemini-2.5-flash',
                    contents: `Kamu adalah asisten Discord bernama Naura Hoshino. Jawablah pesan ini dengan santai, ramah, dan membantu: ${pesan}`
                });

                const embed = new EmbedBuilder()
                    .setColor(ui.colors?.primary || '#00FFFF')
                    .setAuthor({ name: 'Naura AI Assistant', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`**Pertanyaan:** ${pesan}\n\n**Jawaban:**\n${response.text}`)
                    .setFooter({ text: 'Ditenagai oleh Google Gemini' });

                return interaction.editReply({ embeds: [embed] });
            }

            // ==========================================
            // 🎨 2. LOGIKA IMAGINE (Teks ke Gambar)
            // ==========================================
            else if (subcommand === 'imagine') {
                const prompt = interaction.options.getString('prompt');
                
                // Menggunakan Pollinations API (Gratis, tanpa kunci, sangat cepat)
                const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&enhance=true`;

                const embed = new EmbedBuilder()
                    .setColor(ui.colors?.primary || '#00FFFF')
                    .setTitle('🎨 Naura Studio Art')
                    .setDescription(`**Prompt:** \`${prompt}\``)
                    .setImage(imageUrl)
                    .setFooter({ text: 'Gambar dihasilkan oleh AI' });

                return interaction.editReply({ embeds: [embed] });
            }

            // ==========================================
            // 🌍 3. LOGIKA TRANSLATE (Penerjemah)
            // ==========================================
            else if (subcommand === 'translate') {
                const teks = interaction.options.getString('teks');
                const targetLang = interaction.options.getString('ke_bahasa').toLowerCase();

                const hasil = await translate(teks, { to: targetLang });

                const embed = new EmbedBuilder()
                    .setColor(ui.colors?.success || '#00FF00')
                    .setAuthor({ name: 'Naura Translator', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d7/Google_Translate_logo.svg/512px-Google_Translate_logo.svg.png' })
                    .addFields(
                        { name: `Dari: [Auto-Detect: ${hasil.from.language.iso}]`, value: `\`\`\`${teks}\`\`\``, inline: false },
                        { name: `Ke: [${targetLang.toUpperCase()}]`, value: `\`\`\`${hasil.text}\`\`\``, inline: false }
                    );

                return interaction.editReply({ embeds: [embed] });
            }

            // ==========================================
            // 🔍 4. LOGIKA WEB SEARCH (Pencarian Google)
            // ==========================================
            else if (subcommand === 'search') {
                const query = interaction.options.getString('kueri');
                
                // Melakukan pencarian di Google
                const options = { page: 0, safe: false, parse_ads: false };
                const hasilSearch = await google.search(query, options);

                if (!hasilSearch.results || hasilSearch.results.length === 0) {
                    return interaction.editReply(`❌ Maaf, aku tidak menemukan informasi apa pun tentang **${query}** di internet.`);
                }

                const embed = new EmbedBuilder()
                    .setColor(ui.colors?.primary || '#00FFFF')
                    .setAuthor({ name: 'Naura Web Search', iconURL: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1024px-Google_%22G%22_logo.svg.png' })
                    .setTitle(`🔍 Hasil Pencarian: ${query}`)
                    .setFooter({ text: 'Naura terhubung dengan internet' });

                // Ambil 3 hasil pencarian teratas
                const topResults = hasilSearch.results.slice(0, 3);
                let deskripsi = '';

                topResults.forEach((res, index) => {
                    deskripsi += `**${index + 1}. [${res.title}](${res.url})**\n> ${res.description}\n\n`;
                });

                // Tambahkan Kotak Pengetahuan (Knowledge Panel) jika ada (Misal: Cuaca, tokoh penting)
                if (hasilSearch.knowledge_panel.title) {
                    deskripsi = `💡 **Info Singkat:** *${hasilSearch.knowledge_panel.description}*\n\n` + deskripsi;
                }

                embed.setDescription(deskripsi);
                return interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('AI Command Error:', error);
            return interaction.editReply(`❌ Ups, otakku sedang mengalami gangguan teknis saat memproses itu. Coba lagi nanti!`);
        }
    }
};