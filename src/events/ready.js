const { Events } = require('discord.js');
const ui = require('../config/ui');
const botActivity = require('../config/bot-activity');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`\x1b[32m[🤖 SYSTEM]\x1b[0m Naura Hoshino Online! Terhubung sebagai \x1b[36m${client.user.tag}\x1b[0m`);

        // Initialize the music manager jika file dan fungsi tersedia
        if (client.musicManager && typeof client.musicManager.initialize === 'function') {
            client.musicManager.initialize();
            console.log('\x1b[36m[🎵 MUSIC]\x1b[0m Music Manager siap!');
        }

        // ==========================================
        // 🔄 ROTASI STATUS BOT (DARI BOT-ACTIVITY.JS)
        // ==========================================
        const activities = botActivity.activities;

        if (activities && activities.length > 0) {
            let currentIndex = 0;

            setInterval(() => {
                const activity = activities[currentIndex];
                client.user.setPresence({
                    activities: [{
                        name: activity.name,
                        type: activity.type,
                        url: activity.url || null
                    }],
                    status: activity.status || 'online'
                });

                currentIndex = (currentIndex + 1) % activities.length;
            }, 15000); // Berganti setiap 15 detik

            console.log('\x1b[35m[✨ PRESENCE]\x1b[0m Rotasi status Naura berhasil diaktifkan.');
        } else {
            console.log('\x1b[33m[⚠️ PRESENCE]\x1b[0m Tidak ada daftar status yang ditemukan di konfigurasi bot-activity.js.');
        }
    },
};
