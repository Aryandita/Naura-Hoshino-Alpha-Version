const { DataTypes } = require('sequelize');
const { sequelize } = require('../managers/dbManager');

const UserPlaylist = sequelize.define('UserPlaylist', {
    id: { 
        type: DataTypes.INTEGER, 
        autoIncrement: true, 
        primaryKey: true 
    },
    userId: { 
        type: DataTypes.STRING, 
        allowNull: false 
    },
    name: { 
        type: DataTypes.STRING, 
        allowNull: false,
        defaultValue: 'My Playlist'
    },
    tracks: { 
        type: DataTypes.JSON, 
        allowNull: false,
        defaultValue: []
    },
    spotifyUrl: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'user_playlists',
    timestamps: true
});

module.exports = UserPlaylist;
