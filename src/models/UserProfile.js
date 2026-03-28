const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    
    economy: {
        wallet: { type: Number, default: 0 },
        bank: { type: Number, default: 0 }
        // lastDaily, lastWork, dll dihapus karena sekarang menggunakan objek cooldowns di bawah
    },
    
    inventory: { type: Array, default: [] },
    
    // 👇 SISTEM COOLDOWN TERPUSAT (INI YANG MEMPERBAIKI BUG SPAM) 👇
    cooldowns: { type: Object, default: {} },
    
    minigames: {
        mathScore: { type: Number, default: 0 },
        triviaScore: { type: Number, default: 0 },
        rpsWin: { type: Number, default: 0 },
        tttWin: { type: Number, default: 0 },
        wordleWin: { type: Number, default: 0 }
    },
    
    // 👇 SISTEM LEVELING 👇
    leveling: {
        xp: { type: Number, default: 0 },
        level: { type: Number, default: 1 },
        lastXp: { type: Date } // Untuk mencegah spam XP beruntun
    }
});

module.exports = mongoose.model('UserProfile', userProfileSchema);