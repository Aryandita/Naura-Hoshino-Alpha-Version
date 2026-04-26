const { Sequelize } = require('sequelize');
const env = require('../config/env');

// Konfigurasi Koneksi MySQL yang Dioptimalkan
const sequelize = new Sequelize(
    env.DB_NAME, 
    env.DB_USER, 
    env.DB_PASS, 
    {
        host: env.DB_HOST,
        port: env.DB_PORT,
        dialect: 'mysql',
        logging: false, // Menjaga terminal tetap bersih dari spam query
        pool: { 
            max: 10,       // Ditingkatkan agar mendukung banyak user bersamaan
            min: 0, 
            acquire: 60000, // Diperpanjang menjadi 60 detik agar toleran terhadap server lambat
            idle: 10000 
        }
    }
);

const connectToDatabase = async () => {
    try {
        // Tahap 1: Verifikasi Autentikasi
        await sequelize.authenticate();
        
        // Tahap 2: Sinkronisasi Tabel
        // Diganti menjadi false agar Sequelize tidak mencoba mengubah struktur tabel secara paksa 
        // yang sering kali memicu error ganda saat data sudah mulai banyak.
        await sequelize.sync({ alter: false }); 
        
        // Migrasi manual untuk mannersPoint agar tidak merusak data lama
        try { await sequelize.query('ALTER TABLE UserLevelings ADD COLUMN mannersPoint INT DEFAULT 100;'); } catch (e) { /* Abaikan jika sudah ada */ }
        
        return true; 
    } catch (error) {
        console.error('\n\x1b[41m\x1b[37m 💥 DATABASE ERROR \x1b[0m \x1b[31mKoneksi MySQL ditolak atau terputus:\x1b[0m');
        console.error(error.message);
        
        // WAJIB ADA: Melempar error ke index.js agar indikator status berubah menjadi 🔴 ERROR
        throw error; 
    }
};

// Anti-Sleep Mechanism: Menjaga koneksi tetap hidup
setInterval(async () => {
    try {
        await sequelize.query('SELECT 1');
    } catch (err) {
        // Silent catch untuk pengecekan berkala
    }
}, 60000 * 15); // Ping setiap 15 menit

module.exports = { sequelize, connectToDatabase };
