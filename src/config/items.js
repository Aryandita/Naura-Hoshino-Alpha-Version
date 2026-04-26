// Daftar semua item yang tersedia di game.
// Nanti sistem toko akan mengambil 5 item secara acak setiap 5 menit.

const items = [
    { id: 'basic_shovel', name: 'Sekop Biasa', description: 'Sekop standar biar kerjanya lebih cepet.', price: 500, multiplier: 1.2 },
    { id: 'steel_pickaxe', name: 'Beliung Baja', description: 'Beliung kuat buat nambang koin.', price: 2000, multiplier: 1.5 },
    { id: 'enchanted_gloves', name: 'Sarung Tangan Ajaib', description: 'Bisa nemuin koin nyelip pas lagi kerja.', price: 5000, multiplier: 2.0 },
    { id: 'lucky_charm', name: 'Jimat Keberuntungan', description: 'Jimat kecil penarik rezeki.', price: 10000, multiplier: 2.5 },
    { id: 'laptop_gaming', name: 'Laptop Gaming', description: 'Kerja WFH jadi lebih ngebut dan gampang dapet koin!', price: 15000, multiplier: 3.0 },
    { id: 'vip_card', name: 'Kartu VIP', description: 'Kartu eksklusif buat member sultan.', price: 25000, multiplier: 4.0 },
    { id: 'golden_ticket', name: 'Tiket Emas', description: 'Tiket misterius yang konon bikin auto kaya.', price: 50000, multiplier: 5.0 }
];

module.exports = items;