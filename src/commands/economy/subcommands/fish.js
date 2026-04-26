const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getBuffs, msToTime } = require('../utils/ecoHelper');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        
        const buffs = getBuffs(profile.inventory);
        let finalCooldown = (15 * 60 * 1000) - buffs.cooldownReducMs; // 15 Menit Base Cooldown
        if (finalCooldown < 0) finalCooldown = 0;

        const lastUsed = profile.cooldowns['fish'] || 0;
        const timeLeft = finalCooldown - (Date.now() - lastUsed);

        if (timeLeft > 0) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Danau sedang sepi, tunggu **${msToTime(timeLeft)}** untuk memancing lagi.`)] });

        profile.cooldowns['fish'] = Date.now();
        profile.changed('cooldowns', true);
        await profile.save();

        const fishItems = profile.inventory.filter(id => ['pancing_bambu', 'pancing_carbon', 'pancing_sultan', 'pancing_poseidon', 'umpan_cacing', 'umpan_pelet', 'radar_ikan'].includes(id));
        const hasRod = fishItems.some(id => id.includes('pancing'));

        if (!hasRod) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Kamu tidak punya alat pancing! Beli di \`/economy shop kategori:fishing\`.`)] });
        }

        // Mulai Mancing
        await interaction.editReply({ content: `🎣 **MELEMPARKAN KAIL...**\nKail terlempar jauh ke tengah Danau Naura...\n\n**Perhatikan pelampung! Segera tekan tombol pancingan saat ditarik!**` });
        
        await sleep(Math.floor(Math.random() * 3000) + 2000); // 2-5 sec wait
        
        let embedMancing = new EmbedBuilder().setColor('#1E90FF').setTitle('🌊 〰️ 🪝 〰️ 🐟');
        await interaction.editReply({ content: null, embeds: [embedMancing] });

        await sleep(Math.floor(Math.random() * 2000) + 1500); // 1.5-3.5 sec wait

        const waktuMulaiTarik = Date.now();
        embedMancing.setTitle('🌊 💥 🐟 STRIKE! TARIK SEKARANG!').setColor(ui.getColor('success'));

        const btnTarik = new ButtonBuilder().setCustomId('tarik_ikan').setLabel('TARIK PANCINGAN!').setEmoji('🎣').setStyle(ButtonStyle.Success);
        let messageObj = await interaction.editReply({ embeds: [embedMancing], components: [new ActionRowBuilder().addComponents(btnTarik)] });

        let hasilMancing = 0;
        let ditarik = false;

        try {
            const confirmation = await messageObj.awaitMessageComponent({ 
                filter: i => i.user.id === interaction.user.id, 
                time: 2000 + buffs.fishExtraTime 
            });
            
            const waktuReaksi = Date.now() - waktuMulaiTarik;
            await confirmation.deferUpdate(); 
            ditarik = true;

            if (waktuReaksi < 800) {
                hasilMancing = 1; // Perfect
            } else if (waktuReaksi < 1500) {
                hasilMancing = 2; // Good
            } else {
                hasilMancing = 3; // Slow
            }

        } catch (e) {
            ditarik = false;
        }

        if (!ditarik) {
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} **YAAAH!** Ikan berhasil kabur karena kamu terlalu lambat menarik kailnya.`)] });
        }

        // Tentukan hasil ikan berdasarkan Rare Chance (buffs.fishRareChance)
        const rand = Math.random() * 100;
        let ikanStr = ""; let harga = 0; let gelar = ""; let warna = "";

        if (hasilMancing === 1 && rand < (10 + buffs.fishRareChance)) {
            // Mythical Fish
            ikanStr = "🦈 Hiu Putih Legendaris";
            harga = Math.floor(Math.random() * 3000) + 5000;
            gelar = "🌟 MONSTER LAUT MYTHICAL!";
            warna = '#f1c40f';
        } else if (hasilMancing <= 2 && rand < (35 + buffs.fishRareChance)) {
            // Rare Fish
            ikanStr = "🐡 Ikan Buntal Beracun";
            harga = Math.floor(Math.random() * 1500) + 1500;
            gelar = "✨ TANGKAPAN RARE!";
            warna = '#9b59b6';
        } else {
            // Common Fish
            ikanStr = "🐟 Ikan Mas Biasa";
            harga = Math.floor(Math.random() * 500) + 500;
            gelar = "🎣 Tangkapan Biasa";
            warna = '#3498db';
        }

        if (hasilMancing === 3) {
            // Kalo slow tapi dapat, ikannya lepas sebagian atau nilainya turun
            ikanStr = "👞 Sepatu Bot Bekas";
            harga = 100;
            gelar = "🗑️ Yah, dapet rongsokan...";
            warna = '#95a5a6';
        }

        profile.economy_wallet += harga;
        await profile.save();

        return interaction.followUp({ embeds: [new EmbedBuilder().setColor(warna).setTitle(gelar).setDescription(`Kamu berhasil menarik kail dan mendapatkan **${ikanStr}**!\nKamu menjualnya seharga **+${harga.toLocaleString()}** ${coin}!\n\n> 💳 **Saldo Akhir:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });
    }
};