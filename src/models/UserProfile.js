const { DataTypes } = require('sequelize');
const { sequelize } = require('../managers/dbManager');

const UserProfile = sequelize.define('UserProfile', {
    userId: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        primaryKey: true // Menjadikan userId sebagai kunci utama
    },
    
    // --- ECONOMY (Dipisah agar mudah di-ranking/leaderboard) ---
    economy_wallet: { type: DataTypes.INTEGER, defaultValue: 0 },
    economy_bank: { type: DataTypes.INTEGER, defaultValue: 0 },
    
    // --- DATA FLEKSIBEL ---
    // MySQL mendukung tipe JSON untuk menyimpan array/object
    inventory: { type: DataTypes.JSON, defaultValue: [] },
    cooldowns: { type: DataTypes.JSON, defaultValue: {} },
    
    // --- MINIGAMES ---
    minigame_mathScore: { type: DataTypes.INTEGER, defaultValue: 0 },
    minigame_triviaScore: { type: DataTypes.INTEGER, defaultValue: 0 },
    minigame_rpsWin: { type: DataTypes.INTEGER, defaultValue: 0 },
    minigame_tttWin: { type: DataTypes.INTEGER, defaultValue: 0 },
    minigame_wordleWin: { type: DataTypes.INTEGER, defaultValue: 0 },

    isPremium: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: false 
    },
    premiumUntil: { 
        type: DataTypes.DATE, 
        allowNull: true 
    },
    
    // --- LEVELING ---
    leveling_xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    leveling_level: { type: DataTypes.INTEGER, defaultValue: 1 },
    leveling_lastXp: { type: DataTypes.DATE, allowNull: true }
}, {
    tableName: 'user_profiles',
    timestamps: false // Set true jika ingin kolom createdAt dan updatedAt otomatis
});

module.exports = UserProfile;
