const Parser = require('rss-parser');
const parser = new Parser();
const SocialAlert = require('../models/SocialAlert');
const { logError } = require('./logger');

class RssManager {
    constructor(client) {
        this.client = client;
    }

    // Fungsi untuk menyalakan mesin (Berputar setiap 10 menit)
    init() {
        console.log('\x1b[35m[📡 RSS ALERT]\x1b[0m Mesin Notifikasi Sosial Media diaktifkan.');
        
        // Cek langsung saat bot menyala
        this.checkAllFeeds();

        // Ulangi pengecekan setiap 10 menit (600.000 milidetik)
        setInterval(() => this.checkAllFeeds(), 600000); 
    }

    async checkAllFeeds() {
        try {
            const alerts = await SocialAlert.find();
            if (alerts.length === 0) return;

            for (const alert of alerts) {
                try {
                    // Tarik data terbaru dari platform target
                    const feed = await parser.parseURL(alert.feedUrl);
                    if (!feed.items || feed.items.length === 0) continue;

                    const latestPost = feed.items[0]; // Ambil postingan paling atas (terbaru)

                    // Jika link postingan terbaru BERBEDA dengan yang diingat database = ADA POST BARU!
                    if (alert.lastPostLink !== latestPost.link) {
                        
                        // Perbarui ingatan database agar tidak spam
                        alert.lastPostLink = latestPost.link;
                        await alert.save();

                        // Cari channel Discord tempat mengirim notifikasi
                        const channel = this.client.channels.cache.get(alert.discordChannelId);
                        if (!channel) continue;

                        // Rangkai pesan pengumuman
                        let icon = '📢';
                        if (alert.platform === 'youtube') icon = '🔴';
                        else if (alert.platform === 'tiktok') icon = '🎵';

                        const message = `${icon} **POSTINGAN BARU!**\n**${feed.title}** baru saja mengunggah sesuatu yang baru!\n\nLangsung cek di sini:\n${latestPost.link}`;

                        await channel.send(message);
                    }
                } catch (feedError) {
                    // Abaikan jika satu feed gagal (mungkin API sedang down), lanjut ke feed berikutnya
                }
            }
        } catch (error) {
            logError('RSS Manager Fatal Error', error);
        }
    }
}

module.exports = RssManager;