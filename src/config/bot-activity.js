const { ActivityType, PresenceUpdateStatus } = require('discord.js');

module.exports = {
    ownerId: '795241173009825853',
    activities: [

        /// ============================================
        /// WATCHING ACTIVITY
        /// ============================================

        {
            name: 'Member bermain bersama di server ✨',
            type: ActivityType.Watching,
            status: PresenceUpdateStatus.Online
        },

        {
            name: 'Ryaa ngoding 💻',
            type: ActivityType.Watching,
            status: PresenceUpdateStatus.Idle
        },

        {
            name: 'Menjaga Servermu tetap Aman 🛡️',
            type: ActivityType.Watching,
            status: PresenceUpdateStatus.DoNotDisturb
        },

        /// ============================================
        /// LISTENING ACTIVITY
        /// ============================================

        {
            name: 'Melodi Kesukaan Ryaa 🎧',
            type: ActivityType.Listening,
            status: PresenceUpdateStatus.Idle
        },

        {
            name: 'Keluh kesah Ryaa 💖',
            type: ActivityType.Listening,
            status: PresenceUpdateStatus.Idle
        },

        /// ============================================
        /// PLAYING ACTIVITY
        /// ============================================

        {
            name: 'Simulasi Kehidupan dengan Member 🎮',
            type: ActivityType.Playing,
            status: PresenceUpdateStatus.Online
        },

        {
            name: 'Naura Mengembangkan Algoritma Baru 💡',
            type: ActivityType.Playing,
            status: PresenceUpdateStatus.DoNotDisturb
        },

        {
            name: 'Berinteraksi dengan Member 💬',
            type: ActivityType.Playing,
            status: PresenceUpdateStatus.idle
        },

        {
            name: 'Menemani Ryaa Bermain Game 🎮',
            type: ActivityType.Playing,
            status: PresenceUpdateStatus.DoNotDisturb
        },

        /// ============================================
        /// STREAMING ACTIVITY
        /// ============================================

        {
            name: 'Streaming with Ryaa 🎀',
            type: ActivityType.Streaming,
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            status: PresenceUpdateStatus.DoNotDisturb
        },

        {
            name: 'Naura mencoba hal baru 🎀',
            type: ActivityType.Streaming,
            url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            status: PresenceUpdateStatus.Idle
        }

    ]
};