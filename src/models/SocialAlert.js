const { DataTypes } = require('sequelize');
const { sequelize } = require('../managers/dbManager');

const SocialAlert = sequelize.define('SocialAlert', {
    // Sequelize otomatis membuat kolom 'id' berjenis Integer Auto Increment sebagai Primary Key jika tidak didefinisikan.
    
    guildId: { type: DataTypes.STRING, allowNull: false },
    discordChannelId: { type: DataTypes.STRING, allowNull: false },
    platform: { type: DataTypes.STRING, allowNull: false }, // 'youtube', 'tiktok', dll
    name: { type: DataTypes.STRING, allowNull: false },
    feedUrl: { type: DataTypes.STRING, allowNull: false },
    lastPostLink: { type: DataTypes.STRING, allowNull: true }
}, {
    tableName: 'social_alerts',
    timestamps: true // Berguna untuk mengetahui kapan alert ini didaftarkan
});

module.exports = SocialAlert;
