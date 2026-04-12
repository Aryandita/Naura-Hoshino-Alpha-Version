const { DataTypes } = require('sequelize');
const { sequelize } = require('../managers/dbManager');

const ModMail = sequelize.define('ModMail', {
    userId: { type: DataTypes.STRING, primaryKey: true },
    channelId: { type: DataTypes.STRING, unique: true }, // ID Channel di server staff
    closed: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'modmail_threads' });

module.exports = ModMail;
