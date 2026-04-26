// ==========================================
// UTILS: ecoHelper.js (Pusat Data Ekonomi)
// ==========================================

function seededRandom(seed) {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

const rarities = {
    common: { name: 'Common', color: '#3498db', icon: '🟦', prob: 85 }, 
    rare: { name: 'Rare', color: '#9b59b6', icon: '🟪', prob: 10 },    
    mythical: { name: 'Mythical', color: '#f1c40f', icon: '🟨', prob: 3 }, 
    legendary: { name: 'Legendary', color: '#e74c3c', icon: '🟥', prob: 2 } 
};

const itemsDB = {
    market: {
        common: [
            { id: 'kopi_biasa', name: 'Kopi Hitam Pekerja', price: 1000, effect: 'Waktu Ngetik +2s, Gaji +5%', lore: 'Kopi saset murah yang diseduh dengan air dispenser kantor.' },
            { id: 'jimat_murah', name: 'Jimat Pasar Malam', price: 1500, effect: 'Peluang Minigame +5%', lore: 'Benda aneh yang dibeli dari pedagang kaki lima.' },
            { id: 'jam_bekas', name: 'Jam Tangan Bekas', price: 2000, effect: 'Cooldown -2 Menit', lore: 'Jam tangan tua yang kacanya retak.' }
        ],
        rare: [
            { id: 'kopi_sultan', name: 'Kopi Luwak Sultan', price: 5000, effect: 'Waktu Ngetik +5s, Gaji +15%', lore: 'Diseduh dari biji kopi paling langka di dunia.' },
            { id: 'sepatu_lari', name: 'Sepatu Aerodinamis', price: 7500, effect: 'Semua Cooldown -5 Menit', lore: 'Sepatu lari berteknologi tinggi yang sangat ringan.' }
        ],
        mythical: [
            { id: 'jam_rolex', name: 'Rolex Berlian Emas', price: 25000, effect: 'Semua Cooldown -15 Menit', lore: 'Jam tangan yang memancarkan aura sultan.' },
            { id: 'buku_pintar', name: 'Catatan Rahasia Einstein', price: 30000, effect: 'Poin Kuis x2', lore: 'Buku tua bersampul kulit yang berisi rumus rahasia semesta.' }
        ],
        legendary: [
            { id: 'mahkota_raja', name: 'Mahkota Raja Arthur', price: 100000, effect: 'Waktu Ngetik +10s, Gaji & Work +50%', lore: 'Mahkota legendaris yang hilang selama ribuan tahun.' }
        ]
    },
    blackmarket: {
        common: [
            { id: 'pisau_karat', name: 'Pisau Lipat Karatan', price: 5000, effect: 'Peluang Heist +10%', lore: 'Senjata andalan preman terminal.' },
            { id: 'usb_kosong', name: 'Flashdisk Bekas', price: 5000, effect: 'Peluang Hack +10%', lore: 'Berisi beberapa script peretasan dasar.' }
        ],
        rare: [
            { id: 'pistol_glock', name: 'Glock-19 Silencer', price: 15000, effect: 'Peluang Heist +25%', lore: 'Pistol ringan dengan peredam suara.' },
            { id: 'vpn_premium', name: 'Ghost VPN Premium', price: 15000, effect: 'Peluang Hack +25%', lore: 'Akses jaringan terenkripsi level militer.' }
        ],
        mythical: [
            { id: 'ak47', name: 'Assault Rifle AK-47', price: 50000, effect: 'Peluang Heist +50%', lore: 'Senjata legendaris yang tidak pernah macet.' },
            { id: 'quantum_laptop', name: 'Quantum Laptop IBM', price: 50000, effect: 'Peluang Hack +50%', lore: 'Laptop superkomputer seukuran koper.' }
        ],
        legendary: [
            { id: 'blade_despair', name: 'Blade of Despair', price: 250000, effect: 'Peluang Heist 90%', lore: 'Pedang terkutuk dari dimensi lain.' },
            { id: 'master_key', name: 'Sistem Kunci God-Eye', price: 250000, effect: 'Peluang Hack 90%', lore: 'Virus AI mandiri pengambil alih infrastruktur.' }
        ]
    },
    car: {
        common: [
            { id: 'skuter', name: 'Skuter Buntung Ojol', price: 10000, effect: 'Toleransi Balap +0.2s', lore: 'Bekas motor ojek online yang bodinya selotipan.' },
            { id: 'sedan_tua', name: 'Sedan Tua Bapak', price: 15000, effect: 'Toleransi Balap +0.5s', lore: 'Mobil lawas tahun 90-an.' }
        ],
        rare: [
            { id: 'civic', name: 'Honda Civic Turbo', price: 50000, effect: 'Toleransi Balap +1.0s', lore: 'Mobil andalan para pembalap jalanan amatir.' },
            { id: 'rx7', name: 'Mazda RX-7 Drift', price: 65000, effect: 'Toleransi Balap +1.5s', lore: 'Sang raja tikungan mesin rotary!' }
        ],
        mythical: [
            { id: 'porsche', name: 'Porsche 911 GT3', price: 150000, effect: 'Toleransi Balap +2.5s', lore: 'Karya seni otomotif Jerman.' },
            { id: 'lambo', name: 'Lambo Aventador', price: 200000, effect: 'Toleransi Balap +3.5s', lore: 'Supercar Italia berdesain tajam.' }
        ],
        legendary: [
            { id: 'bugatti', name: 'Bugatti Chiron SS', price: 500000, effect: 'Toleransi Balap +5.0s', lore: 'Bukan sekadar mobil, ini adalah jet darat.' },
            { id: 'ender_kart', name: 'Ender Kart Mistis', price: 750000, effect: 'Toleransi +10s (Auto-Win)', lore: 'Berteleportasi ke garis finis.' }
        ]
    },
    fishing: {
        common: [
            { id: 'pancing_bambu', name: 'Alat Pancing Bambu', price: 2000, effect: 'Toleransi Mancing +0.5s', lore: 'Pancingan sederhana buatan kakek.' },
            { id: 'umpan_cacing', name: 'Umpan Cacing Tanah', price: 1000, effect: 'Peluang Ikan Rare +5%', lore: 'Cacing segar dari kebun belakang.' }
        ],
        rare: [
            { id: 'pancing_carbon', name: 'Joran Carbon Fiber', price: 15000, effect: 'Toleransi Mancing +1.5s', lore: 'Joran kuat dan ringan anti patah.' },
            { id: 'umpan_pelet', name: 'Pelet Ikan Super', price: 5000, effect: 'Peluang Ikan Rare +15%', lore: 'Pelet harum yang disukai ikan hias.' }
        ],
        mythical: [
            { id: 'pancing_sultan', name: 'Joran Berlian', price: 100000, effect: 'Toleransi Mancing +3s', lore: 'Joran berlapis emas dan berlian asli.' },
            { id: 'radar_ikan', name: 'Radar Ikan Sonar', price: 75000, effect: 'Peluang Ikan Mythical +25%', lore: 'Teknologi militer untuk melacak ikan.' }
        ],
        legendary: [
            { id: 'pancing_poseidon', name: 'Trisula Poseidon', price: 500000, effect: 'Toleransi +10s (Auto-Win)', lore: 'Dewa lautan merestui tangkapanmu.' }
        ]
    }
};

function msToTime(ms) {
    if (ms <= 0) return 'Siap Digunakan!';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${hours}j ${minutes}m ${seconds}d`;
}

function getItemName(id) {
    for (const cat in itemsDB) {
        for (const rar in itemsDB[cat]) {
            const item = itemsDB[cat][rar].find(i => i.id === id);
            if (item) return item.name;
        }
    }
    return id;
}

function getBuffs(inventory = []) {
    let buffs = { workBonus: 0, typingExtraTime: 0, cooldownReducMs: 0, raceExtraTime: 0, hackChance: 0, stealChance: 0, fishExtraTime: 0, fishRareChance: 0 };
    
    inventory.forEach(id => {
        if (id === 'kopi_biasa') { buffs.workBonus += 5; buffs.typingExtraTime += 2000; }
        if (id === 'kopi_sultan') { buffs.workBonus += 15; buffs.typingExtraTime += 5000; }
        if (id === 'mahkota_raja') { buffs.workBonus += 50; buffs.typingExtraTime += 10000; }
        
        if (id === 'jam_bekas') buffs.cooldownReducMs += 2 * 60000;
        if (id === 'sepatu_lari') buffs.cooldownReducMs += 5 * 60000;
        if (id === 'jam_rolex') buffs.cooldownReducMs += 15 * 60000;
        
        if (id === 'skuter') buffs.raceExtraTime += 200;
        if (id === 'sedan_tua') buffs.raceExtraTime += 500;
        if (id === 'civic') buffs.raceExtraTime += 1000;
        if (id === 'rx7') buffs.raceExtraTime += 1500;
        if (id === 'porsche') buffs.raceExtraTime += 2500;
        if (id === 'lambo') buffs.raceExtraTime += 3500;
        if (id === 'bugatti') buffs.raceExtraTime += 5000;
        if (id === 'ender_kart') buffs.raceExtraTime += 10000;
        
        if (id === 'usb_kosong') buffs.hackChance += 10;
        if (id === 'vpn_premium') buffs.hackChance += 25;
        if (id === 'quantum_laptop') buffs.hackChance += 50;
        if (id === 'master_key') buffs.hackChance += 90;
        
        if (id === 'pisau_karat') buffs.stealChance += 10;
        if (id === 'pistol_glock') buffs.stealChance += 25;
        if (id === 'ak47') buffs.stealChance += 50;
        if (id === 'blade_despair') buffs.stealChance += 90;

        if (id === 'pancing_bambu') buffs.fishExtraTime += 500;
        if (id === 'pancing_carbon') buffs.fishExtraTime += 1500;
        if (id === 'pancing_sultan') buffs.fishExtraTime += 3000;
        if (id === 'pancing_poseidon') buffs.fishExtraTime += 10000;

        if (id === 'umpan_cacing') buffs.fishRareChance += 5;
        if (id === 'umpan_pelet') buffs.fishRareChance += 15;
        if (id === 'radar_ikan') buffs.fishRareChance += 25;
    });
    return buffs;
}

function getShopRotation(shopType) {
    const cycleMs = 5 * 60 * 1000; 
    const currentCycle = Math.floor(Date.now() / cycleMs);
    const nextRefresh = (currentCycle + 1) * cycleMs;
    const seed = currentCycle + shopType.length; 
    let rng = seededRandom(seed);
    const generatedItems = [];
    const generatedIds = new Set(); 

    for (let i = 0; i < 5; i++) {
        rng = seededRandom(seed + i * 10); 
        const roll = rng * 100;
        let rarity = 'common';
        if (roll > 98) rarity = 'legendary';
        else if (roll > 95) rarity = 'mythical';
        else if (roll > 85) rarity = 'rare';

        let pool = itemsDB[shopType][rarity].filter(i => !generatedIds.has(i.id));
        if (pool.length === 0) {
            ['rare', 'common'].forEach(r => {
                if (pool.length === 0) pool = itemsDB[shopType][r].filter(i => !generatedIds.has(i.id));
            });
        }

        if (pool.length > 0) {
            const selectedItem = pool[Math.floor(rng * pool.length)];
            generatedIds.add(selectedItem.id);
            generatedItems.push({ ...selectedItem, rarityData: rarities[rarity] });
        }
    }
    return { items: generatedItems, nextRefresh };
}

module.exports = { seededRandom, rarities, itemsDB, msToTime, getItemName, getBuffs, getShopRotation };