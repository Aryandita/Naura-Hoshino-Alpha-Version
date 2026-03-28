const langData = require('../config/lang.json');
require('dotenv').config();

// Mengambil bahasa dari .env, default ke 'id' jika tidak diatur
function getLang() {
    return process.env.BOT_LANG || 'id'; 
}

/**
 * Fungsi utama untuk mengambil teks dari lang.json
 * @param {string} path - Path ke teks (contoh: 'system.booting')
 * @param {object} variables - Variabel dinamis untuk direplace (contoh: { count: 5 })
 */
function t(path, variables = {}) {
    const lang = getLang();
    const keys = path.split('.');
    let result = langData;

    // Mencari data di dalam objek JSON
    for (const key of keys) {
        if (result[key] === undefined) {
            console.warn(`[⚠️ LANG WARN] Missing translation key: ${path}`);
            return path; // Kembalikan path jika tidak ditemukan
        }
        result = result[key];
    }

    // Ambil bahasa sesuai .env, jika tidak ada fallback ke bahasa Inggris
    let text = result[lang] || result['en'] || path;

    // Replace variabel dinamis (seperti {count} atau {username})
    for (const [key, value] of Object.entries(variables)) {
        text = text.replace(new RegExp(`{${key}}`, 'g'), value);
    }

    return text;
}

module.exports = { t, getLang };