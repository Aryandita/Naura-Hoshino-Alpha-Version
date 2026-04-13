const { Sequelize } = require('sequelize');
const env = require('../config/env');

const sequelize = new Sequelize(
    env.DB_NAME, 
    env.DB_USER, 
    env.DB_PASS, 
    {
        host: env.DB_HOST,
        port: env.DB_PORT,
        dialect: 'mysql',
        logging: false, 
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 } // Membuat koneksi lebih stabil
    }
);

const connectToDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('\x1b[42m\x1b[30m 🗄️ DATABASE \x1b[0m \x1b[32mBerhasil terhubung ke MySQL.\x1b[0m');
        
        await sequelize.sync({ alter: true });
        console.log('\x1b[42m\x1b[30m ✨ SUCCESS \x1b[0m \x1b[32mTabel MySQL berhasil disinkronisasi.\x1b[0m');
    } catch (error) {
        // Tampilkan error, tapi JANGAN matikan bot (Hapus throw error;)
        console.error('\x1b[41m\x1b[37m 💥 ERROR \x1b[0m \x1b[31mGagal terhubung ke MySQL: Koneksi Ditolak (Refused).\x1b[0m');
    }
};

module.exports = { sequelize, connectToDatabase };
