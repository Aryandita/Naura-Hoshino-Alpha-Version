require('dotenv').config();

const env = {
    // Discord
    TOKEN: process.env.DISCORD_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    // Mengubah string "id1,id2" menjadi array ['id1', 'id2']
    OWNER_IDS: process.env.OWNER_IDS ? process.env.OWNER_IDS.split(',') : [],

    // Database MySQL
    DB_HOST: process.env.MYSQL_HOST || 'localhost',
    DB_USER: process.env.MYSQL_USER,
    DB_PASS: process.env.MYSQL_PASSWORD,
    DB_NAME: process.env.MYSQL_DATABASE,

    // ModMail
    STAFF_GUILD: process.env.STAFF_GUILD_ID,
    MODMAIL_CATEGORY: process.env.MODMAIL_CATEGORY_ID,

    // Lavalink
    LAVA_HOST: process.env.LAVALINK_HOST || 'localhost',
    LAVA_PORT: parseInt(process.env.LAVALINK_PORT) || 2333,
    LAVA_PASS: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    LAVA_SECURE: process.env.LAVALINK_SECURE === 'true'
};

// 🛡️ Sistem Validasi: Cek apakah ada data krusial yang kosong
const requiredKeys = ['TOKEN', 'DB_USER', 'DB_NAME', 'STAFF_GUILD'];
for (const key of requiredKeys) {
    if (!env[key]) {
        console.error(`\x1b[31m[❌ FATAL ERROR]\x1b[0m Variabel ${key} belum diisi di dalam file .env! Bot dihentikan.`);
        process.exit(1); // Matikan proses bot
    }
}

module.exports = env;
