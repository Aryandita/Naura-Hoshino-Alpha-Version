const cron = require('cron');
const items = require('../config/items');

class ShopManager {
    constructor() {
        this.currentItems = [];
        this.refreshShop(); // Acak item saat bot pertama kali nyala
        this.startCronJob();
    }

    // Fungsi untuk mengacak 5 item
    refreshShop() {
        const shuffled = [...items].sort(() => 0.5 - Math.random());
        this.currentItems = shuffled.slice(0, 5);
        console.log(`\x1b[33m[🛒 SHOP]\x1b[0m \x1b[32mEtalase toko telah diperbarui! ✨\x1b[0m`);
    }

    // Cron job: Berjalan setiap 5 menit (*/5 * * * *)
    startCronJob() {
        const job = new cron.CronJob('*/5 * * * *', () => {
            this.refreshShop();
        });
        job.start();
        console.log('[CRON] Penghitung waktu toko otomatis (5 menit) dimulai.');
    }

    getCurrentItems() {
        return this.currentItems;
    }
}

// Gunakan sistem Singleton agar data toko sama di semua file
const shopInstance = new ShopManager();
module.exports = shopInstance;