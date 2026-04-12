const { Sequelize } = require('sequelize');
require('dotenv').config();

// Membuat instance koneksi Sequelize
const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE, // Nama database (misal: naura_db)
    process.env.MYSQL_USER,     // Username (misal: root)
    process.env.MYSQL_PASSWORD, // Password
    {
        host: process.env.MYSQL_HOST || 'localhost',
        dialect: 'mysql',
        logging: false, // Ubah ke console.log untuk melihat raw SQL query saat debugging
    }
);

const connectToDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('\x1b[32m[🍃 DATABASE]\x1b[0m Berhasil terhubung ke MySQL.');
        
        // alter: true akan memperbarui kolom tabel otomatis jika ada perubahan di file Model
        await sequelize.sync({ alter: true });
        console.log('\x1b[36m[📦 DATABASE]\x1b[0m Tabel berhasil disinkronisasi.');
    } catch (error) {
        console.error('\x1b[31m[❌ DATABASE]\x1b[0m Gagal terhubung ke MySQL:', error);
    }
};

module.exports = { sequelize, connectToDatabase };
