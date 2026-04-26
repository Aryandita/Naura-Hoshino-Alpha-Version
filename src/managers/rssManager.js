const Parser = require('rss-parser');
const parser = new Parser();
const SocialAlert = require('../models/SocialAlert');
const { logError } = require('./logger');

class RssManager {
    constructor(client) {
        this.client = client;
    }

    init() {
        console.log('\x1b[43m\x1b[30m 📡 RSS ALERT \x1b[0m \x1b[33mMesin Notifikasi Sosial Media diaktifkan.\x1b[0m');
        
        this.checkAllFeeds();
        setInterval(() => this.checkAllFeeds(), 600000); 
    }

    async checkAllFeeds() {
        try {
            // PERBAIKAN: Jika DB mati, kembalikan array kosong agar tidak crash
            const alerts = await SocialAlert.findAll().catch(() => []);
            if (!alerts || alerts.length === 0) return;

            for (const alert of alerts) {
                try {
                    const feed = await parser.parseURL(alert.feedUrl);
                    if (!feed.items || feed.items.length === 0) continue;

                    const latestPost = feed.items[0];

                    if (alert.lastPostLink !== latestPost.link) {
                        alert.lastPostLink = latestPost.link;
                        await alert.save().catch(() => {}); // Penahan error save

                        const channel = this.client.channels.cache.get(alert.discordChannelId);
                        if (!channel) continue;

                        let icon = '📢';
                        if (alert.platform === 'youtube') icon = '🔴';
                        else if (alert.platform === 'tiktok') icon = '🎵';

                        const message = `${icon} **POSTINGAN BARU!**\n**${feed.title}** baru saja mengunggah sesuatu yang baru!\n\nLangsung cek di sini:\n${latestPost.link}`;

                        await channel.send(message);
                    }
                } catch (feedError) {}
            }
        } catch (error) {
            console.error('\x1b[41m\x1b[37m 💥 ERROR \x1b[0m \x1b[31mRSS Manager gagal mengakses Database.\x1b[0m');
        }
    }
}

module.exports = RssManager;
