const { GoogleGenerativeAI } = require('@google/generative-ai');
const ui = require('../config/ui');

class AIManager {
    constructor() {
        // Inisialisasi Gemini AI
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // Mengatur Kepribadian (Prompt System) Naura Hoshino
        this.model = this.genAI.getGenerativeModel({ 
            model: 'gemini-2.5-flash',
            systemInstruction: "Nama kamu adalah Naura Hoshino, asisten Discord virtual yang ceria, ramah, dan sangat pintar. Kamu diciptakan dan dikelola oleh Aryandita. Kamu suka menggunakan emoji dalam setiap kalimat. Gunakan bahasa Indonesia yang santai, gaul, namun tetap sopan dan sangat membantu."
        });

        // Menyimpan memori percakapan per-user agar Naura bisa nyambung saat diajak ngobrol panjang
        this.sessions = new Map(); 
    }

    async handleMessage(message, prompt) {
        const userId = message.author.id;

        // Jika user ini belum pernah ngobrol, buat sesi memori baru
        if (!this.sessions.has(userId)) {
            const chatSession = this.model.startChat({
                history: [],
                generationConfig: { maxOutputTokens: 800 }, // Batasi panjang jawaban
            });
            this.sessions.set(userId, chatSession);
        }

        const chat = this.sessions.get(userId);

        try {
            // Indikator bot sedang "mengetik" di Discord
            await message.channel.sendTyping();
            
            // Kirim pesan ke Gemini dan tunggu balasan
            const result = await chat.sendMessage(prompt);
            let response = result.response.text();

            // Discord memiliki batas maksimal 2000 karakter per pesan
            if (response.length > 2000) {
                response = response.substring(0, 1995) + '...';
            }
            
            // Balas pesan user
            await message.reply(response);

        } catch (error) {
            console.error('\x1b[31m[AI ERROR]\x1b[0m Gagal merespons:', error);
            await message.reply(`${ui.emojis.error} Aduh, kepala Naura tiba-tiba pusing. Coba tanya lagi nanti ya!`);
        }
    }
}

module.exports = new AIManager();