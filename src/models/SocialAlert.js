const mongoose = require('mongoose');

const socialAlertSchema = new mongoose.Schema({
    guildId: { type: String, required: true },
    discordChannelId: { type: String, required: true },
    platform: { type: String, required: true }, // 'youtube', 'tiktok', dll
    name: { type: String, required: true }, // Nama channel/akun
    feedUrl: { type: String, required: true }, // Link RSS Feed rahasia
    lastPostLink: { type: String, default: null } // Menyimpan link postingan terakhir agar tidak spam
});

module.exports = mongoose.model('SocialAlert', socialAlertSchema);