const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const UserProfile = require('../../models/UserProfile');
const ui = require('../../config/ui');

// ==========================================
// 🎲 MESIN RNG (Seeded Random) UNTUK ROTASI TOKO
// ==========================================
function seededRandom(seed) {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
}

// ==========================================
// 📦 DATABASE ITEM RPG NAURA
// ==========================================
const rarities = {
    common: { name: 'Common', color: '#3498db', icon: '🟦', prob: 85 }, 
    rare: { name: 'Rare', color: '#9b59b6', icon: '🟪', prob: 10 },    
    mythical: { name: 'Mythical', color: '#f1c40f', icon: '🟨', prob: 3 }, 
    legendary: { name: 'Legendary', color: '#e74c3c', icon: '🟥', prob: 2 } 
};

const itemsDB = {
    market: {
        common: [
            { id: 'kopi_biasa', name: 'Kopi Hitam Pekerja', price: 1000, effect: 'Gaji /work +5%', lore: 'Kopi saset murah yang diseduh dengan air dispenser kantor.' },
            { id: 'jimat_murah', name: 'Jimat Pasar Malam', price: 1500, effect: 'Peluang Minigame +5%', lore: 'Benda aneh yang dibeli dari pedagang kaki lima.' },
            { id: 'jam_bekas', name: 'Jam Tangan Bekas', price: 2000, effect: 'Cooldown -2 Menit', lore: 'Jam tangan tua yang kacanya retak.' }
        ],
        rare: [
            { id: 'kopi_sultan', name: 'Kopi Luwak Sultan', price: 5000, effect: 'Gaji /work +15%', lore: 'Diseduh dari biji kopi paling langka di dunia.' },
            { id: 'sepatu_lari', name: 'Sepatu Aerodinamis', price: 7500, effect: 'Semua Cooldown -5 Menit', lore: 'Sepatu lari berteknologi tinggi yang sangat ringan.' }
        ],
        mythical: [
            { id: 'jam_rolex', name: 'Rolex Berlian Emas', price: 25000, effect: 'Semua Cooldown -15 Menit', lore: 'Jam tangan yang memancarkan aura sultan.' },
            { id: 'buku_pintar', name: 'Catatan Rahasia Einstein', price: 30000, effect: 'Poin Kuis x2', lore: 'Buku tua bersampul kulit yang berisi rumus rahasia semesta.' }
        ],
        legendary: [
            { id: 'mahkota_raja', name: 'Mahkota Raja Arthur', price: 100000, effect: 'Gaji Harian & Work +50%', lore: 'Mahkota legendaris yang hilang selama ribuan tahun.' }
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
            { id: 'skuter', name: 'Skuter Buntung Ojol', price: 10000, effect: 'Base Speed', lore: 'Bekas motor ojek online yang bodinya selotipan.' },
            { id: 'sedan_tua', name: 'Sedan Tua Bapak', price: 15000, effect: 'Menang Balap +5%', lore: 'Mobil lawas tahun 90-an.' }
        ],
        rare: [
            { id: 'civic', name: 'Honda Civic Turbo', price: 50000, effect: 'Menang Balap +20%', lore: 'Mobil andalan para pembalap jalanan amatir.' },
            { id: 'rx7', name: 'Mazda RX-7 Drift', price: 65000, effect: 'Menang Balap +25%', lore: 'Sang raja tikungan mesin rotary!' }
        ],
        mythical: [
            { id: 'porsche', name: 'Porsche 911 GT3', price: 150000, effect: 'Menang Balap +40%', lore: 'Karya seni otomotif Jerman.' },
            { id: 'lambo', name: 'Lambo Aventador', price: 200000, effect: 'Menang Balap +50%', lore: 'Supercar Italia berdesain tajam.' }
        ],
        legendary: [
            { id: 'bugatti', name: 'Bugatti Chiron SS', price: 500000, effect: 'Menang Balap +80%', lore: 'Bukan sekadar mobil, ini adalah jet darat.' },
            { id: 'ender_kart', name: 'Ender Kart Mistis', price: 750000, effect: 'Hampir Auto-Win', lore: 'Berteleportasi ke garis finis.' }
        ]
    }
};

// ==========================================
// ⚙️ FUNGSI SISTEM (Cooldown, Buff, Format)
// ==========================================
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

// Menghitung status dari inventory
function getBuffs(inventory = []) {
    let buffs = { workBonus: 0, cooldownReducMs: 0, raceChance: 0, hackChance: 0, stealChance: 0 };
    
    inventory.forEach(id => {
        if (id === 'kopi_biasa') buffs.workBonus += 5;
        if (id === 'kopi_sultan') buffs.workBonus += 15;
        if (id === 'mahkota_raja') buffs.workBonus += 50;
        
        if (id === 'jam_bekas') buffs.cooldownReducMs += 2 * 60000;
        if (id === 'sepatu_lari') buffs.cooldownReducMs += 5 * 60000;
        if (id === 'jam_rolex') buffs.cooldownReducMs += 15 * 60000;
        
        if (id === 'sedan_tua') buffs.raceChance += 5;
        if (id === 'civic') buffs.raceChance += 20;
        if (id === 'rx7') buffs.raceChance += 25;
        if (id === 'porsche') buffs.raceChance += 40;
        if (id === 'lambo') buffs.raceChance += 50;
        if (id === 'bugatti') buffs.raceChance += 80;
        if (id === 'ender_kart') buffs.raceChance += 100;
        
        if (id === 'usb_kosong') buffs.hackChance += 10;
        if (id === 'vpn_premium') buffs.hackChance += 25;
        if (id === 'quantum_laptop') buffs.hackChance += 50;
        if (id === 'master_key') buffs.hackChance += 90;
        
        if (id === 'pisau_karat') buffs.stealChance += 10;
        if (id === 'pistol_glock') buffs.stealChance += 25;
        if (id === 'ak47') buffs.stealChance += 50;
        if (id === 'blade_despair') buffs.stealChance += 90;
    });
    return buffs;
}

// Mencegah gacha memunculkan item ganda dalam 1 sesi
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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('💰 Sistem Ekonomi, Toko, & RPG Naura')
        .addSubcommand(sub => sub.setName('balance').setDescription('Cek saldo koin kamu.').addUserOption(opt => opt.setName('target').setDescription('Pilih user')))
        .addSubcommand(sub => sub.setName('inventory').setDescription('Cek tas dan barang aktifmu.'))
        .addSubcommand(sub => sub.setName('shop').setDescription('Lihat barang yang dijual saat ini.')
            .addStringOption(opt => opt.setName('kategori').setDescription('Pilih toko').setRequired(true)
                .addChoices(
                    { name: '🏪 Market Shop (Boosters)', value: 'market' },
                    { name: '🕵️ Black Market (Weapons)', value: 'blackmarket' },
                    { name: '🏎️ Car Shop (Racing)', value: 'car' }
                )))
        .addSubcommand(sub => sub.setName('buy').setDescription('Beli barang dari toko yang sedang buka.')
            .addStringOption(opt => opt.setName('kode_barang').setDescription('ID Barang').setRequired(true)))
        // Fitur Farming/Grinding
        .addSubcommand(sub => sub.setName('daily').setDescription('Klaim koin gratis setiap hari! (24 Jam)'))
        .addSubcommand(sub => sub.setName('weekly').setDescription('Gajian mingguan sultannya Naura! (7 Hari)'))
        .addSubcommand(sub => sub.setName('work').setDescription('Bekerja untuk mendapatkan koin. (10 Menit)'))
        .addSubcommand(sub => sub.setName('lootbox').setDescription('Buka kotak harta karun. (3 Jam)'))
        .addSubcommand(sub => sub.setName('race').setDescription('Balapan liar untuk mendapat koin berlimpah. (1 Jam)'))
        .addSubcommand(sub => sub.setName('hack').setDescription('Retas sistem keamanan bank! (45 Menit)'))
        .addSubcommand(sub => sub.setName('steal').setDescription('Rampok kasino terbesar di kota! (45 Menit)')),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const user = interaction.options.getUser('target') || interaction.user;

        // Inisialisasi Profil
        let profile = await UserProfile.findOne({ userId: user.id });
        if (!profile) profile = new UserProfile({ userId: user.id });
        
        if (!profile.economy) profile.economy = { wallet: 0, bank: 0 };
        if (!profile.inventory) profile.inventory = [];
        if (!profile.cooldowns) profile.cooldowns = {};

        const coin = ui.emojis?.coin || '🪙';
        const errorEmoji = ui.emojis?.error || '❌';
        const sendError = (msg) => interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`${errorEmoji} ${msg}`)] });

        // Fungsi Cek Cooldown
        const checkCD = (commandName, cooldownMs, applyBuffs = true) => {
            let finalCooldown = cooldownMs;
            if (applyBuffs) {
                const buffs = getBuffs(profile.inventory);
                finalCooldown -= buffs.cooldownReducMs;
                if (finalCooldown < 0) finalCooldown = 0;
            }

            const lastUsed = profile.cooldowns[commandName] || 0;
            const timeLeft = finalCooldown - (Date.now() - lastUsed);
            return { onCooldown: timeLeft > 0, timeLeft, finalCooldown };
        };

        const setCD = (commandName) => {
            profile.cooldowns[commandName] = Date.now();
            profile.markModified('cooldowns');
        };

        // ==========================================
        // 🏪 SHOP & BUY
        // ==========================================
        if (subcommand === 'shop') {
            const kategori = interaction.options.getString('kategori');
            const rotation = getShopRotation(kategori);
            
            let title = ''; let color = '';
            if (kategori === 'market') { title = '🏪 Naura Market: Booster & Utility'; color = '#00FF00'; }
            if (kategori === 'blackmarket') { title = '🕵️ Dark Web Market: Illegal Goods'; color = '#2b2d31'; }
            if (kategori === 'car') { title = '🏎️ Naura Dealership: Racing Vehicles'; color = '#FF4500'; }

            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: title, iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`> Stok toko diacak ulang **setiap 5 menit!**\n⏳ **Refresh berikutnya:** <t:${Math.floor(rotation.nextRefresh / 1000)}:R>\n🛒 **Cara Beli:** \`/economy buy kode_barang\`\n\n**━━━ DAFTAR BARANG ━━━**`)
                .setFooter({ text: `💰 Saldo: ${profile.economy.wallet.toLocaleString()} koin` });

            rotation.items.forEach(item => {
                embed.addFields({
                    name: `${item.rarityData.icon} [${item.rarityData.name.toUpperCase()}] ${item.name}`,
                    value: `> 🏷️ **ID:** \`${item.id}\`\n> 💰 **Harga:** **${item.price.toLocaleString()}** ${coin}\n> ⚡ **Efek:** *${item.effect}*`,
                    inline: false
                });
            });

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'buy') {
            const itemID = interaction.options.getString('kode_barang').toLowerCase();
            let foundItem = null; let foundRarity = null;

            ['market', 'blackmarket', 'car'].forEach(shopType => {
                const rotation = getShopRotation(shopType);
                const match = rotation.items.find(i => i.id === itemID);
                if (match) { foundItem = match; foundRarity = match.rarityData; }
            });

            if (!foundItem) return sendError(`Barang \`${itemID}\` tidak ditemukan di sesi toko saat ini! Cek \`/economy shop\`.`);
            if (profile.economy.wallet < foundItem.price) return sendError(`Uangmu kurang! Butuh **${foundItem.price.toLocaleString()}** ${coin}.`);
            if (profile.inventory.includes(foundItem.id)) return sendError(`Kamu sudah punya **${foundItem.name}**!`);

            profile.economy.wallet -= foundItem.price;
            profile.inventory.push(foundItem.id);
            profile.markModified('economy');
            profile.markModified('inventory');
            await profile.save();

            const embed = new EmbedBuilder()
                .setColor(foundRarity.color)
                .setTitle(`🎉 Transaksi Sukses!`)
                .setDescription(`Kamu membeli ${foundRarity.icon} **${foundItem.name}** seharga **${foundItem.price.toLocaleString()}** ${coin}\n\n*Barang dimasukkan ke Inventory dan efek pasifnya otomatis aktif!*`);

            return interaction.editReply({ embeds: [embed] });
        }

        // ==========================================
        // 🎒 BALANCE & INVENTORY
        // ==========================================
        if (subcommand === 'balance') {
            let bannerAttachment;
            try { bannerAttachment = new AttachmentBuilder(ui.banners.economy, { name: 'banner_economy.png' }); } 
            catch { bannerAttachment = null; }

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ name: `Buku Tabungan: ${user.username}`, iconURL: user.displayAvatarURL() })
                .addFields(
                    { name: '👛 Dompet (Wallet)', value: `**${profile.economy.wallet.toLocaleString()}** ${coin}`, inline: true },
                    { name: '🏦 Bank', value: `**${profile.economy.bank.toLocaleString()}** ${coin}`, inline: true },
                    { name: '📦 Total Item', value: `**${profile.inventory.length}** Barang (Cek /economy inventory)`, inline: false }
                );

            if (bannerAttachment) embed.setImage('attachment://banner_economy.png');
            
            const replyOptions = { embeds: [embed] };
            if (bannerAttachment) replyOptions.files = [bannerAttachment];
            return interaction.editReply(replyOptions);
        }

        if (subcommand === 'inventory') {
            const buffs = getBuffs(profile.inventory);
            const embed = new EmbedBuilder()
                .setColor('#3498db')
                .setAuthor({ name: `🎒 Inventory & Status: ${user.username}`, iconURL: user.displayAvatarURL() })
                .setDescription(`Semua efek item di inventory **otomatis aktif**.`);

            let statsStr = `💼 **Gaji Work:** +${buffs.workBonus}%\n⏳ **Reduksi CD:** -${buffs.cooldownReducMs / 60000} Menit\n🏎️ **Peluang Balap:** +${buffs.raceChance}%\n💻 **Peluang Hack:** +${buffs.hackChance}%\n🕵️ **Peluang Steal:** +${buffs.stealChance}%`;
            embed.addFields({ name: '📊 Total Buff Aktif', value: `>>> ${statsStr}` });

            if (profile.inventory.length === 0) {
                embed.addFields({ name: '📦 Daftar Barang', value: '*Tasmu masih kosong, beli barang di /economy shop!*' });
            } else {
                let itemsList = profile.inventory.map(id => `- **${getItemName(id)}**`).join('\n');
                embed.addFields({ name: '📦 Daftar Barang', value: itemsList });
            }

            return interaction.editReply({ embeds: [embed] });
        }

        // ==========================================
        // 💸 SISTEM FARMING (Daily, Work, dll)
        // ==========================================
        const buffs = getBuffs(profile.inventory);
        const cdReducStr = buffs.cooldownReducMs > 0 ? ` *(Dipotong ${buffs.cooldownReducMs / 60000}m dari Item)*` : '';

        if (subcommand === 'daily') {
            const cd = checkCD('daily', 24 * 60 * 60 * 1000, false); 
            if (cd.onCooldown) return sendError(`Sabar! Kamu sudah ambil daily hari ini. Tunggu **${msToTime(cd.timeLeft)}** lagi.`);

            const hasMahkota = profile.inventory.includes('mahkota_raja');
            const reward = 1500 + (hasMahkota ? 750 : 0);
            profile.economy.wallet += reward; 
            setCD('daily'); await profile.save();
            
            const itemStr = hasMahkota ? `\n> 👑 **Item Aktif:** Mahkota Raja Arthur (+750)` : '';
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#00FF00').setDescription(`🎁 Kamu mendapatkan **+${reward.toLocaleString()}** ${coin} dari bonus harian!${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}`)] });
        }

        if (subcommand === 'weekly') {
            const cd = checkCD('weekly', 7 * 24 * 60 * 60 * 1000, false);
            if (cd.onCooldown) return sendError(`Bansos mingguan belum turun. Tunggu **${msToTime(cd.timeLeft)}** lagi.`);

            const reward = 10000;
            profile.economy.wallet += reward; 
            setCD('weekly'); await profile.save();
            
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#f1c40f').setDescription(`🎉 Kamu mendapatkan **+${reward.toLocaleString()}** ${coin} dari gaji mingguan!\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}`)] });
        }

        if (subcommand === 'work') {
            const cd = checkCD('work', 10 * 60 * 1000); 
            if (cd.onCooldown) return sendError(`Kamu masih kelelahan. Istirahat selama **${msToTime(cd.timeLeft)}**.`);

            let gaji = Math.floor(Math.random() * 501) + 300; 
            gaji += Math.floor(gaji * (buffs.workBonus / 100)); 

            const pekerjaan = ['Barista Kafe', 'Programmer', 'Kurir Paket', 'Kasir Alfamart', 'Desainer Grafis'];
            const kerjaRandom = pekerjaan[Math.floor(Math.random() * pekerjaan.length)];
            
            profile.economy.wallet += gaji; 
            setCD('work'); await profile.save();
            
            const workItems = profile.inventory.filter(id => ['kopi_biasa', 'kopi_sultan', 'mahkota_raja'].includes(id)).map(getItemName);
            const itemStr = workItems.length > 0 ? `\n> 🛠️ **Item Aktif:** ${workItems.join(', ')} (+${buffs.workBonus}%)` : '';

            return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#3498db').setDescription(`💼 Selesai bekerja sebagai **${kerjaRandom}**. Dibayar **+${gaji.toLocaleString()}** ${coin}!${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}${cdReducStr}`)] });
        }

        if (subcommand === 'lootbox') {
            const cd = checkCD('lootbox', 3 * 60 * 60 * 1000); 
            if (cd.onCooldown) return sendError(`Lootbox sedang di-*restock*. Tunggu **${msToTime(cd.timeLeft)}** lagi.`);

            const reward = Math.floor(Math.random() * 3000) + 1000; 
            profile.economy.wallet += reward; 
            setCD('lootbox'); await profile.save();
            
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#e67e22').setDescription(`📦 Kamu membuka kotak dan menemukan **+${reward.toLocaleString()}** ${coin}!\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}${cdReducStr}`)] });
        }

        if (subcommand === 'race') {
            const cd = checkCD('race', 60 * 60 * 1000); 
            if (cd.onCooldown) return sendError(`Mesin mobilmu masih panas! Tunggu **${msToTime(cd.timeLeft)}**.`);

            setCD('race'); 
            const winChance = 30 + buffs.raceChance; 
            const roll = Math.floor(Math.random() * 100);

            const raceItems = profile.inventory.filter(id => ['sedan_tua', 'civic', 'rx7', 'porsche', 'lambo', 'bugatti', 'ender_kart'].includes(id)).map(getItemName);
            const itemStr = raceItems.length > 0 ? `\n> 🏎️ **Kendaraan:** ${raceItems.join(', ')} (+${buffs.raceChance}% Win)` : '';

            if (roll <= winChance) {
                const reward = Math.floor(Math.random() * 5000) + 3000;
                profile.economy.wallet += reward; await profile.save();
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#2ecc71').setDescription(`🏁 **JUARA 1!** Balapan sengit, kamu bawa pulang **+${reward.toLocaleString()}** ${coin}!${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}${cdReducStr}`)] });
            } else {
                await profile.save();
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`💥 **CRASH!** Kamu menabrak pembatas jalan. Beruntung kamu selamat, tapi tidak dapat hadiah.${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}${cdReducStr}`)] });
            }
        }

        if (subcommand === 'hack' || subcommand === 'steal') {
            const cd = checkCD(subcommand, 45 * 60 * 1000); 
            if (cd.onCooldown) return sendError(`Polisi sedang patroli! Sembunyi selama **${msToTime(cd.timeLeft)}**.`);

            setCD(subcommand);
            const isHack = subcommand === 'hack';
            const winChance = 35 + (isHack ? buffs.hackChance : buffs.stealChance);
            const roll = Math.floor(Math.random() * 100);

            let usedItems = profile.inventory.filter(id => 
                (isHack ? ['usb_kosong', 'vpn_premium', 'quantum_laptop', 'master_key'] : ['pisau_karat', 'pistol_glock', 'ak47', 'blade_despair']).includes(id)
            ).map(getItemName);

            const itemIcon = isHack ? '💻' : '🗡️';
            const buffVal = isHack ? buffs.hackChance : buffs.stealChance;
            const itemStr = usedItems.length > 0 ? `\n> ${itemIcon} **Alat Aktif:** ${usedItems.join(', ')} (+${buffVal}% Win)` : '';

            if (roll <= winChance) {
                const reward = Math.floor(Math.random() * 8000) + 4000;
                profile.economy.wallet += reward; await profile.save();
                const text = isHack ? `💻 Berhasil meretas server bank asing!` : `🕵️ Berhasil menyelinap ke brankas kasino!`;
                
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#2ecc71').setDescription(`${text} Mengamankan **+${reward.toLocaleString()}** ${coin}!${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}${cdReducStr}`)] });
            } else {
                const denda = Math.floor(Math.random() * 1500) + 500;
                profile.economy.wallet -= denda; 
                if (profile.economy.wallet < 0) profile.economy.wallet = 0;
                await profile.save();
                
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#e74c3c').setDescription(`🚨 **TERTANGKAP!** Kamu didenda **-${denda.toLocaleString()}** ${coin} untuk menebus diri dari penjara.${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy.wallet.toLocaleString()}** ${coin}\n> ⏳ **Cooldown:** ${msToTime(cd.finalCooldown)}${cdReducStr}`)] });
            }
        }
    }
};