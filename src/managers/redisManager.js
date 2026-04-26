const { createClient } = require('redis');

class RedisManager {
    constructor() {
        this.client = createClient({
            url: process.env.REDIS_URL
        });

        this.client.on('error', (err) => console.log('\x1b[31m[🔴 REDIS]\x1b[0m Error:', err));
        this.client.on('connect', () => console.log('\x1b[34m[📦 REDIS]\x1b[0m Terhubung ke Redis Cache System.'));
    }

    async connect() {
        await this.client.connect();
    }

    // Fungsi menyimpan data ke cache (dengan waktu kadaluarsa/TTL)
    async setCache(key, data, expirationInSeconds = 3600) {
        try {
            // Redis hanya menyimpan string, jadi kita ubah JSON (Object) menjadi String
            await this.client.setEx(key, expirationInSeconds, JSON.stringify(data));
        } catch (error) {
            console.error('\x1b[31m[REDIS ERROR]\x1b[0m Gagal menyimpan cache:', error);
        }
    }

    // Fungsi mengambil data dari cache
    async getCache(key) {
        try {
            const data = await this.client.get(key);
            if (data) return JSON.parse(data); // Kembalikan string menjadi JSON (Object)
            return null; // Jika cache tidak ada
        } catch (error) {
            console.error('\x1b[31m[REDIS ERROR]\x1b[0m Gagal membaca cache:', error);
            return null;
        }
    }

    // Fungsi menghapus cache (Berguna kalau user baru saja beli barang, jadi data lamanya dibuang)
    async deleteCache(key) {
        await this.client.del(key);
    }
}

module.exports = new RedisManager();