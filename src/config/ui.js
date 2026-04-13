const { ActivityType } = require('discord.js');

module.exports = {
    colors: {
        primary: '#00FFFF', // Aqua
        economy: '#FFD700',
        success: '#00FF00',
        error: '#FF0000',
        dark: '#2b2d31',
        accent: '#FF69B4'   // Pink Pastel
    },

    // --- KONFIGURASI BANNER LOKAL ---
    banners: {
        about: './assets/banner_about.png',
        ping: './assets/banner_ping.png',
        stats: './assets/banner_stats.png',
        music: './assets/banner_music.png',
        ticket: './assets/banner_ticket.png',
        minecraft: './assets/banner_minecraft.png',
        rank: './assets/rank_card.png',
        economy: './assets/banner_economy.png'
    },

    // --- KONFIGURASI EMOJI KUSTOM ---
    emojis: {
        success: '✅',
        error: '❌',
        loading: '<:Loading:1484706038849732708>',
        coin: '<:NauraCoins:1484705998349402173>',
        wallet: '<:Lootbox:1484706031324889208>',
        bank: '<:NauraBank:1484706000488497273>',
        counting: '🔢',      
        tod_truth: '📝',     
        tod_dare: '😈',      
        tod_spin: '🔄',      
        progressDot: '🔵',    
        progressLine: '─',    
        musicPlayPause: '<:PlayPause:1484705975998091375>', 
        musicSkip: '<:Skip:1484705981152755712>',
        musicStop: '<:Stop:1484705983778525315>',
        musicLoop: '<:Loop:1484705967991034010>',
        musicVolDown: '<:VolumeDown:1484874588524646621>',
        musicVolUp: '<:VolumeUp:1484874537110864034>',
        musicAutoplay: '<:AutoPlay:1484705985980268744>',
        musicLyrics: '<:Lyrics:1484705972919337070>',
        musicShuffle: '<:Shuffle:1484705970469867641>',
        music247: '<:Afk:1484706070688698398>'
    },

    // --- KONFIGURASI STATUS BOT (PRESENCE) ---
    activities: [
        { name: 'Vermilion Server', type: ActivityType.Watching },
        { name: 'Sistem Naura Versi 1.0.0', type: ActivityType.Playing },
        { name: 'Instruksi Developer Aryan', type: ActivityType.Listening },
        { name: 'Perintah dari Ryaa', type: ActivityType.Watching }
    ],

    // ==========================================
    // 🛡️ SISTEM GETTER CERDAS (ANTI-CRASH)
    // ==========================================
    
    // Mengecek emoji. Jika tidak ada, kembalikan emoji default 💠
    getEmoji(name) {
        return this.emojis[name] || '💠';
    },

    // Mengecek warna. Jika tidak ada, kembalikan Aqua (Primary)
    getColor(name) {
        return this.colors[name] || this.colors.primary;
    },

    // Mengecek banner. Jika tidak ada, kembalikan null agar Discord tidak error saat melampirkan file
    getBanner(name) {
        return this.banners[name] || null;
    }
};
