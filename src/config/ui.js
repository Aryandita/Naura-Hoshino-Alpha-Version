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
        levelUp: './assets/levelbg.png',
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
        // 💎 UMUM & EKONOMI
        success: '<a:done:1492712310173732954>',
        error: '<a:error2:1492712275771920536>',
        loading: '<a:Loading1:1492696844646613042>',
        coin: '<:NauraCoins:1484705998349402173>',
        wallet: '<:Lootbox:1484706031324889208>',
        bank: '<:NauraBank:1484706000488497273>',
        dot: '<a:Arrow:1492696901051744298>',

        // 🌟 SLOT EMOJI UNTUK MENU HELP (Silakan isi ID-nya nanti)
        help_core: '⚙️',
        help_eco: '💰',
        help_music: '🎵',
        help_game: '🎮',
        help_admin: '🛡️',

        // 🌐 MENU CORE / STATS / PING / ABOUT
        support: '💬',
        dashboard: '🌐',
        invite: '✨',
        server_info: '🖥️',
        ram_info: '🧠',
        software_info: '⚙️',
        system_reach: '📈',
        about_title: '🎀',
        network_ping: '🌐',
        database_ping: '🗄️',
        pong: '🏓',

        /// TEMPVOICE PANEL
        lock: '<a:Lock:1493979607337275532>',
        unlock: '<a:Unlock:1493981701502799893>',
        rename: '<a:Rename1:1493979591319097455>',
        limit: '<:Limit:1493981697749024870>',
        hide: '<a:Hide:1493979601528033443>',
        unhide: '<a:Unhide:1493979596301926420>',
        stage: '<a:Stage:1493982052675092692>',
        waiting: '<a:Stage:1493982052675092692>',
        move: '<:798008booster:1493982970443468870>',


        // 🎮 MINIGAMES
        counting: '🔢',
        tod_truth: '📝',
        tod_dare: '😈',
        tod_spin: '🔄',

        // 🎵 MUSIC PANEL & PROGRESS BAR
        nowplaying: '<a:DiscSpinner1:1492696912145678488>',
        progressDot: '<:DotMusic:1488166056768835596>',
        progressLineBefore: '<:BeforeDot:1488166108081950882>',
        progressLineAfter: '<:AfterDot:1488166236004159509>',
        favorite: '<a:SpinHeart:1492696848643915796>',
        filter: '<:Filter:1484705994020753529>',

        // 🎤 MUSIC INFO
        musicListener: '<a:Listener:1492696916050444449>',
        musicArtist: '<:Artis:1484706029244518561>',

        // 🕹️ MUSIC MEDIA CONTROLS
        musicPlayPause: '<:PlayPause:1484705975998091375>',
        musicSkip: '<:Skip:1484705981152755712>',
        musicStop: '<:Stop:1484705983778525315>',
        musicLoop: '<:Loop:1484705967991034010>',
        musicVolDown: '<:VolumeDown:1484874588524646621>',
        musicVolUp: '<:VolumeUp:1484874537110864034>',
        musicAutoplay: '<:AutoPlay:1484705985980268744>',
        musicLyrics: '<:Lyrics:1484705972919337070>',
        musicShuffle: '<:Shuffle:1484705970469867641>',
        music247: '<a:Moon:1492696850602524682>',

        // 🎛️ MUSIC FILTERS (DSP)
        normal: '<:MusicDisc:1484706066662031483>',
        bassboost: '<:BassBoost:1493476326634684517>',
        nightcore: '<:NightCore:1493476329658515497>',
        vaporwave: '<:vaporwave:1493478233448910878>'
    },

    // --- KONFIGURASI STATUS BOT (PRESENCE) ---
    activities: [
        { name: 'Ryaa bekerja dan bermain 🎮', type: ActivityType.Watching },
        { name: 'Minigame bersama dengan member ✨', type: ActivityType.Playing },
        { name: 'Musik bersama dengan member', type: ActivityType.Listening },
        { name: 'Ryaa dan Naura nobar film 🎞️', type: ActivityType.Watching }
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