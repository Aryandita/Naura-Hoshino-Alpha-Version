require('dotenv').config();

const env = {
    // 🤖 DISCORD CORE
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    PREFIX: process.env.PREFIX || 'n!',
    OWNER_IDS: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [],

    // 🗄️ MYSQL DATABASE
    DB_HOST: process.env.MYSQL_HOST || '127.0.0.1',
    DB_PORT: parseInt(process.env.MYSQL_PORT) || 3306,
    DB_USER: process.env.MYSQL_USER,
    DB_PASS: process.env.MYSQL_PASSWORD,
    DB_NAME: process.env.MYSQL_DATABASE,

    // 🛡️ MODMAIL
    STAFF_GUILD: process.env.STAFF_GUILD_ID,
    MODMAIL_CATEGORY: process.env.MODMAIL_CATEGORY_ID,

    // 🎵 LAVALINK
    LAVA_HOST: process.env.LAVALINK_HOST || 'localhost',
    LAVA_PORT: parseInt(process.env.LAVALINK_PORT) || 2333,
    LAVA_PASS: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    LAVA_SECURE: process.env.LAVALINK_SECURE === 'true',

    // 🔰 GEMINI AI
    GEMINI_API: process.env.GEMINI_API_KEY
};

// Pengecekan Wajib (Mencegah Bot Menyala Jika Config Kosong)
const requiredKeys = ['TOKEN', 'CLIENT_ID', 'DB_USER', 'DB_NAME'];
for (const key of requiredKeys) {
    if (!env[key]) {
        console.error(`\x1b[41m\x1b[37m 💥 FATAL ERROR \x1b[0m \x1b[31mVariabel ${key} belum diisi di dalam file .env! Bot dihentikan.\x1b[0m`);
        process.exit(1); 
    }
}

module.exports = env;
