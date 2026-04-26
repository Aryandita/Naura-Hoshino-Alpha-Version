const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const https = require('https');
const ui = require('../../config/ui');
const { logError } = require('../../managers/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('downloader')
        .setDescription('📥 Unduh video & foto kualitas tertinggi (YT, IG, TikTok, X, dll).')
        .addStringOption(opt => 
            opt.setName('url')
                .setDescription('Masukkan link postingan (Video/Foto)')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Tahan balasan agar bot punya waktu merender media
        await interaction.deferReply(); 

        // Membersihkan URL dari karakter '<' atau '>' jika user menggunakan markdown Discord
        const rawUrl = interaction.options.getString('url');
        const url = rawUrl.replace(/[<>]/g, '').trim();

        if (!url.startsWith('http')) {
            return interaction.editReply(`${ui.getEmoji('error')} URL tidak valid! Harap masukkan link yang benar (http/https).`);
        }

        try {
            // ==========================================
            // 🚀 MESIN COBALT API (V10 LATEST & NO-JWT)
            // ==========================================
            // Menggunakan daftar instance publik terbaru yang aktif
            const instances = [
                'https://api.cobalt.tools',
                'https://co.pussthecat.org',
                'https://cobalt.owo.vc',
                'https://cobalt-api.kwiatechu.com',
                'https://dl.khub.win',
                'https://cobalt.zura.aa.am'
            ];

            const httpsAgent = new https.Agent({  
                rejectUnauthorized: false 
            });

            let data = null;
            let lastErrorMsg = null;

            // Mencari server yang aktif dan merespons dengan baik
            for (const instance of instances) {
                try {
                    const frontendDomain = instance.replace('api.', '');

                    const response = await axios.post(instance, {
                        url: url
                    }, {
                        headers: {
                            'Accept': 'application/json',
                            'Content-Type': 'application/json',
                            'Origin': frontendDomain,
                            'Referer': `${frontendDomain}/`,
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
                        },
                        httpsAgent: httpsAgent,
                        timeout: 15000,
                        validateStatus: () => true 
                    });

                    // Pastikan responsnya valid dan bukan error
                    if (response.status >= 200 && response.status < 300 && response.data) {
                        if (response.data.status !== 'error') {
                            data = response.data;
                            break; 
                        }
                    }
                    
                    // Tangkap pesan error API jika ada (seperti post is private)
                    if (response.data && (response.data.error || response.data.text)) {
                        lastErrorMsg = response.data.error?.code || response.data.text;
                    }
                } catch (err) {
                    lastErrorMsg = err.message;
                }
            }

            // Menerjemahkan pesan error jika semua server gagal
            if (!data) {
                const errStr = String(lastErrorMsg).toLowerCase();
                if (errStr.includes('private') || errStr.includes('login')) {
                    return interaction.editReply(`${ui.getEmoji('error')} Tautan bersifat **Private** atau membutuhkan otentikasi login. Media tidak bisa diambil.`);
                }
                return interaction.editReply(`${ui.getEmoji('error')} Gagal memproses tautan. Semua server sedang sibuk atau diblokir sementara.`);
            }

            const attachments = [];
            const actionRow = new ActionRowBuilder();
            let linkManualText = '';

            // ==========================================
            // 🔍 LOGIKA EKSTRAKSI (FOTO CAROUSEL & VIDEO)
            // ==========================================
            if (data.status === 'picker') {
                // Tarik maksimal 10 foto (Sesuai batas limit attachment Discord)
                for (let i = 0; i < Math.min(data.picker.length, 10); i++) {
                    attachments.push(data.picker[i].url);
                }
            } else if (data.url) {
                // ==========================================
                // 📥 PENGECEKAN UKURAN & BUFFER (MENCEGAH TUNNEL FILE)
                // ==========================================
                await interaction.editReply(`${ui.getEmoji('loading')} *Menganalisis ukuran media terbaik untukmu...*`);

                let sizeMB = 0;
                let shouldBuffer = true;

                try {
                    // Pengecekan ukuran file (HEAD request) sebelum mengunduh penuh
                    const headRes = await axios.head(data.url, { timeout: 8000 });
                    const contentLength = headRes.headers['content-length'];
                    
                    if (contentLength) {
                        sizeMB = parseInt(contentLength, 10) / (1024 * 1024);
                        if (sizeMB > 25) {
                            shouldBuffer = false; // Hindari download jika file melebihi limit 25MB Discord
                        }
                    }
                } catch (headErr) {
                    // Abaikan jika HEAD gagal, coba download secara default
                }

                if (shouldBuffer) {
                    try {
                        await interaction.editReply(`${ui.getEmoji('loading')} *Sedang menyedot media ke server Naura (${sizeMB > 0 ? sizeMB.toFixed(1) + 'MB' : 'Ukuran Unknown'})...*`);

                        const fileResponse = await axios.get(data.url, {
                            responseType: 'arraybuffer',
                            timeout: 30000 
                        });
                        
                        const buffer = Buffer.from(fileResponse.data);
                        const contentType = fileResponse.headers['content-type'] || '';
                        
                        let ext = 'mp4'; 
                        if (contentType.includes('image/jpeg')) ext = 'jpg';
                        else if (contentType.includes('image/png')) ext = 'png';
                        else if (contentType.includes('image/webp')) ext = 'webp';

                        // 🛠️ MENGHINDARI BUG TUNNEL: Memaksa menamai ekstensi
                        const fileAttachment = new AttachmentBuilder(buffer, { name: `naura_media.${ext}` });
                        attachments.push(fileAttachment);

                    } catch (downloadErr) {
                        console.error('Gagal buffer media:', downloadErr.message);
                        shouldBuffer = false; // Fallback jika RAM penuh/download gagal
                    }
                }

                // Jika gagal di-buffer atau file > 25MB
                if (!shouldBuffer) {
                    linkManualText += `\n\n⚠️ **Media terlalu besar / durasi panjang** untuk diunggah langsung ke Discord. Silakan unduh manual.`;
                }
                
                // Mencegah error Discord API 50035 (URL Button Kepanjangan)
                if (data.url.length <= 512) {
                    actionRow.addComponents(
                        new ButtonBuilder()
                            .setLabel('Download / Buka Manual')
                            .setURL(data.url)
                            .setStyle(ButtonStyle.Link)
                    );
                } else {
                    linkManualText += `\n\n🔗 **Link Alternatif:** [Klik di Sini untuk Media](${data.url})`;
                }

            } else {
                return interaction.editReply(`${ui.getEmoji('error')} Platform tidak didukung atau postingan bersifat Private.`);
            }

            // ==========================================
            // ✉️ PENGIRIMAN MEDIA KE DISCORD
            // ==========================================
            const embed = new EmbedBuilder()
                .setColor(ui.getColor('primary') || '#2b2d31')
                .setTitle(`📥 Ekstraksi Media Selesai!`)
                .setDescription(`**Sumber Link:** [Klik untuk melihat tautan asli](${url})\n**Resolusi File:** Original / Kualitas Tertinggi${linkManualText}`)
                .setFooter({ text: 'Naura Hyper-Speed Downloader' })
                .setTimestamp();

            const replyPayload = { 
                content: `${ui.getEmoji('success')} Berhasil diunduh!`, 
                embeds: [embed]
            };

            if (attachments.length > 0) {
                replyPayload.files = attachments;
            }

            if (actionRow.components.length > 0) {
                replyPayload.components = [actionRow];
            }

            await interaction.editReply(replyPayload);

        } catch (error) {
            logError('Downloader Internal Error', error);
            await interaction.editReply(`${ui.getEmoji('error')} Gagal mengekstrak media karena kesalahan teknis yang tidak terduga.`);
        }
    }
};