const { ActivityType } = require('discord.js');

module.exports = {
    ownerId: '795241173009825853', // Isi dengan ID Discord kamu (Ryaa)
    status: {
        rotateDefault: [
            // Tampil di Discord: "Watching N!help | Menunggu Perintah ✨"
            { 
                name: 'N!help | Menunggu Perintah ✨', 
                type: ActivityType.Watching 
            },
            
            // Tampil di Discord: "Listening to Arahan dari Master Ryaa 🎧"
            { 
                name: 'Arahan dari Master Ryaa 🎧', 
                type: ActivityType.Listening 
            },

            // Tampil di Discord: "Playing Mini-games bersama Member 🎲"
            { 
                name: 'Mini-games bersama Member 🎲', 
                type: ActivityType.Playing 
            },

            // Tampil di Discord: "Watching Sistem Keamanan Server 🛡️"
            { 
                name: 'Sistem Keamanan Server 🛡️', 
                type: ActivityType.Watching 
            },

            // Tampil di Discord: "Streaming Belajar & Bermain bersama Ryaa 🎀"
            { 
                name: 'Belajar & Bermain bersama Ryaa 🎀', 
                type: ActivityType.Streaming, 
                url: 'https://www.youtube.com/live/XtFvoAXGHlo?si=4zeUok8z6L2GvFAX' 
            }
        ]
    }
}