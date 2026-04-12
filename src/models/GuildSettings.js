const { DataTypes } = require('sequelize');
const { sequelize } = require('../managers/dbManager');

const GuildSettings = sequelize.define('GuildSettings', {
    guildId: { 
        type: DataTypes.STRING, 
        allowNull: false, 
        primaryKey: true 
    },
    
    // Menggabungkan pengaturan ke dalam objek JSON
    music: { 
        type: DataTypes.JSON, 
        defaultValue: {
            twentyFourSeven: false,
            defaultVolume: 100,
            textChannel: null,
            voiceChannel: null
        }
    },
    
    settings: {
        type: DataTypes.JSON,
        defaultValue: {
            ticket: { channelId: null, categoryId: null },
            minecraft: { ip: null, port: null },
            tempVoice: { channelId: null, categoryId: null },
            stickyMessage: { channelId: null, message: null },
            announcementChannel: null,
            autoRole: null,
            autoReplies: []
        }
    },

    system: {
        type: DataTypes.JSON,
        defaultValue: { prefix: 'n!', language: 'id' }
    },
    
    channels: {
        type: DataTypes.JSON,
        defaultValue: { counting: null, tod: null }
    },

    isPremium: { type: DataTypes.BOOLEAN, defaultValue: false },
    premiumUntil: { type: DataTypes.DATE, allowNull: true },
    
    countingGame: {
        type: DataTypes.JSON,
        defaultValue: { currentNumber: 0, lastUser: null }
    }
    
}, {
    tableName: 'guild_settings',
    timestamps: false
});

module.exports = GuildSettings;
