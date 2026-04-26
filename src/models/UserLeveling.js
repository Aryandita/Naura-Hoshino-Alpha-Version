const { DataTypes } = require('sequelize');
const { sequelize } = require('../managers/dbManager');

const UserLeveling = sequelize.define('UserLeveling', {
    userId: { type: DataTypes.STRING, allowNull: false },
    guildId: { type: DataTypes.STRING, allowNull: false },
    xp: { type: DataTypes.INTEGER, defaultValue: 0 },
    level: { type: DataTypes.INTEGER, defaultValue: 1 },
    voiceMinutes: { type: DataTypes.INTEGER, defaultValue: 0 },
    messageCount: { type: DataTypes.INTEGER, defaultValue: 0 },
    mannersPoint: { type: DataTypes.INTEGER, defaultValue: 100 },
    // Menyimpan waktu terakhir aktif untuk kalkulasi cooldown dan voice
    lastActivity: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, {
    indexes: [{ unique: true, fields: ['userId', 'guildId'] }]
});

module.exports = UserLeveling;