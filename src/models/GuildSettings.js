const mongoose = require('mongoose');

const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    music: {
        twentyFourSeven: { type: Boolean, default: false },
        defaultVolume: { type: Number, default: 100 },
        textChannel: { type: String, default: null },
        voiceChannel: { type: String, default: null },
    	ticket: { channelId: String, categoryId: String },
    	minecraft: { ip: String, port: Number },
    	tempVoice: { channelId: String, categoryId: String },
    	stickyMessage: { channelId: String, message: String },
    	announcementChannel: String,
    	autoRole: String,
    	autoReplies: [{ trigger: String, response: String }]
    },
    system: {
        prefix: { type: String, default: 'n!' },
        language: { type: String, default: 'id' }
    }, // <-- Kurung kurawal penutup untuk 'system' dan koma ditambahkan di sini
    
    // --- PENGATURAN CHANNEL GAME OTOMATIS ---
    channels: {
        counting: { type: String, default: null },
        tod: { type: String, default: null }
    },
    
    // --- DATA STATE GAME ---
    countingGame: {
        currentNumber: { type: Number, default: 0 },
        lastUser: { type: String, default: null }
    }
});

module.exports = mongoose.model('GuildSettings', guildSettingsSchema);