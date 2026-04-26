const { DataTypes } = require('sequelize');
const { sequelize } = require('../managers/dbManager');

const Giveaway = sequelize.define('Giveaway', {
    messageId: { type: DataTypes.STRING, primaryKey: true },
    channelId: { type: DataTypes.STRING, allowNull: false },
    guildId: { type: DataTypes.STRING, allowNull: false },
    prize: { type: DataTypes.STRING, allowNull: false },
    winnersCount: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    endTime: { type: DataTypes.DATE, allowNull: false },
    hostId: { type: DataTypes.STRING, allowNull: false },
    ended: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
    tableName: 'giveaways',
    timestamps: false
});

module.exports = Giveaway;
