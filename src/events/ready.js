const { Events, ActivityType } = require('discord.js');
const env = require('../config/env');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client) {
        console.log(`\x1b[32m[🤖 SYSTEM]\x1b[0m Naura Versi 1.0.0 Online! Terhubung sebagai \x1b[36m${client.user.tag}\x1b[0m`);

        // Daftar status yang akan diputar secara otomatis
        const activities = [
            { name: 'Ryaa ngoding 🖥', type: ActivityType.Watching },
            { name: 'Economy & Minigames 🎮', type: ActivityType.Playing },
            { name: 'Instruksi Ryaa 💫', type: ActivityType.Listening },
            { name: 'Kehidupan Ryaa 💌', type: ActivityType.Watching }
        ];

        let i = 0;
        setInterval(() => {
            const activity = activities[i % activities.length];
            client.user.setPresence({
                activities: [activity],
                status: 'online', 
            });
            i++;
        }, 15000); // Ganti status setiap 15 detik
    }
};
