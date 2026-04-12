const { Sequelize } = require('sequelize');
const env = require('../config/env'); // Panggil file env

const sequelize = new Sequelize(
    env.DB_NAME, 
    env.DB_USER, 
    env.DB_PASS, 
    {
        host: env.DB_HOST,
        dialect: 'mysql',
        logging: false, 
    }
);

const connectToDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('\x1b[32m[🍃 DATABASE]\x1b[0m Berhasil terhubung ke MySQL.');
        await sequelize.sync({ alter: true });
        console.log('\x1b[36m[📦 DATABASE]\x1b[0m Tabel berhasil disinkronisasi.');
    } catch (error) {
        console.error('\x1b[31m[❌ DATABASE]\x1b[0m Gagal terhubung ke MySQL:', error);
    }
};

module.exports = { sequelize, connectToDatabase };
