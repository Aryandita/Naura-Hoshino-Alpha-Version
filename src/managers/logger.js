const fs = require('fs');
const path = require('path');

// Tentukan lokasi folder 'logs' di folder utama (sejajar dengan index.js)
const logsDir = path.join(__dirname, '../../logs');

// Fitur Otomatis: Jika folder 'logs' belum ada, bot akan membuatnya!
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

function logError(type, error) {
    try {
        const now = new Date();
        
        // Membentuk format waktu untuk NAMA FILE (Tidak boleh ada tanda titik dua : atau slash /)
        // Hasil: "2026-03-21_10-01-00"
        const dateStr = now.toISOString().replace(/T/, '_').replace(/:/g, '-').substring(0, 19);
        
        // Membersihkan nama tipe error dari karakter aneh agar aman dijadikan nama file
        const safeType = type.replace(/[^a-zA-Z0-9_\-]/g, '_');
        
        // Nama file final: misal [2026-03-21_10-01-00]_Command_Error.log
        const fileName = `[${dateStr}]_${safeType}.log`;
        const filePath = path.join(logsDir, fileName);

        // Membentuk ISI teks dari file log
        const timestamp = `[${now.toISOString().replace('T', ' ').substring(0, 19)}]`;
        const errorMessage = error instanceof Error ? error.stack : error;
        
        const logEntry = `==================================================\n` +
                         `WAKTU      : ${timestamp}\n` +
                         `TIPE ERROR : ${type}\n` +
                         `==================================================\n\n` +
                         `=== DETAIL ERROR ===\n${errorMessage}\n`;

        // Menulis langsung ke file baru! (writeFileSync = membuat file baru / menimpa)
        fs.writeFileSync(filePath, logEntry, 'utf8');
        
        // Memberi tahu di console bahwa file log sudah terbuat
        console.log(`\x1b[33m[📁 LOGGER]\x1b[0m Error telah dicatat dengan rapi di: \x1b[36mlogs/${fileName}\x1b[0m`);
    } catch (e) {
        console.error('\x1b[31m[🚨 LOGGER FATAL]\x1b[0m Gagal menulis ke sistem file log:', e);
    }
}

module.exports = { logError };