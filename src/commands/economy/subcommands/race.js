const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBuffs, getItemName, msToTime } = require('../utils/ecoHelper');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        
        // Pemanggilan Emoji UI Game Balapan
        const emoStart = ui.getEmoji('race_start') || '🏁';
        const emoCrash = ui.getEmoji('race_crash') || '💥';
        const emoGas = ui.getEmoji('race_gas') || '⏩';
        const emoBrake = ui.getEmoji('race_brake') || '🛑';
        const emoLeft = ui.getEmoji('race_left') || '⬅️';
        const emoRight = ui.getEmoji('race_right') || '➡️';

        const buffs = getBuffs(profile.inventory);
        let finalCooldown = (60 * 60 * 1000) - buffs.cooldownReducMs;
        if (finalCooldown < 0) finalCooldown = 0;

        const lastUsed = profile.cooldowns['race'] || 0;
        const timeLeft = finalCooldown - (Date.now() - lastUsed);

        if (timeLeft > 0) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Mesin mobilmu masih panas! Tunggu **${msToTime(timeLeft)}**.`)] });

        profile.cooldowns['race'] = Date.now();
        profile.changed('cooldowns', true);

        const raceItems = profile.inventory.filter(id => ['skuter', 'sedan_tua', 'civic', 'rx7', 'porsche', 'lambo', 'bugatti', 'ender_kart'].includes(id)).map(getItemName);
        const itemStr = raceItems.length > 0 ? `\nKendaraan Aktif: **${raceItems.join(', ')}**` : '';

        // 🏁 FASE 1: REAKSI START
        await interaction.editReply({ content: `${emoStart} **FASE 1: PEMANASAN MESIN**\nBersiap di garis *start*...${itemStr}\n\n**Tunggu lampu hijau, lalu segera tekan tombol [${emoGas} START] sekencang mungkin!**` });
        await sleep(2000);

        let embedLampu = new EmbedBuilder().setColor('#2b2d31').setTitle('🚦 🔴 🔴 🔴');
        await interaction.editReply({ content: null, embeds: [embedLampu] });
        
        await sleep(Math.floor(Math.random() * 2000) + 1500); 
        embedLampu.setTitle('🚦 🔴 🟡 🔴');
        await interaction.editReply({ embeds: [embedLampu] });
        
        await sleep(Math.floor(Math.random() * 1500) + 800); 

        const waktuMulaiStart = Date.now();
        embedLampu.setTitle('🚦 🟢 🟢 🟢 GO! GO! GO!').setColor('#00FF00');

        const btnStart = new ButtonBuilder().setCustomId('start_race').setLabel('START!').setEmoji(emoGas).setStyle(ButtonStyle.Success);
        let messageObj = await interaction.editReply({ embeds: [embedLampu], components: [new ActionRowBuilder().addComponents(btnStart)] });

        let posisiBalap = 4; 
        let crashed = false;

        // Background Collector Anti-Error untuk memastikan setiap klik ter-defer
        const bgCollector = messageObj.createMessageComponentCollector({
            filter: i => i.user.id === interaction.user.id,
            time: 60000
        });
        bgCollector.on('collect', async i => {
            await i.deferUpdate().catch(() => {});
        });

        try {
            const confirmation = await messageObj.awaitMessageComponent({ 
                filter: i => i.user.id === interaction.user.id, 
                time: 3000 + buffs.raceExtraTime 
            });
            
            const waktuReaksi = Date.now() - waktuMulaiStart;

            if (waktuReaksi < 800) {
                posisiBalap = 1;
                embedLampu = new EmbedBuilder().setColor(ui.getColor('success')).setDescription('🚀 **PELUNCURAN SEMPURNA!** Reaksi luar biasa, kamu memimpin di Posisi 1!');
            } else if (waktuReaksi < 1500) {
                posisiBalap = 2;
                embedLampu = new EmbedBuilder().setColor(ui.getColor('economy')).setDescription('🏎️ **Awal yang Bagus!** Reaksi normal, kamu berada di Posisi 2.');
            } else {
                posisiBalap = 3;
                embedLampu = new EmbedBuilder().setColor('#e67e22').setDescription('🐢 **Mesin Tersendat!** Reaksimu lambat, kamu tertinggal di Posisi 3.');
            }

        } catch (e) {
            crashed = true;
            embedLampu = new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${emoCrash} **TERLAMBAT!** Mobilmu mogok di garis start. Penonton kecewa dan balapan dibatalkan.`);
        }

        if (crashed) {
            await profile.save();
            return interaction.editReply({ embeds: [embedLampu], components: [] });
        }

        // 🏁 FASE 2: BALAPAN 4 LAP
        const btnGas = new ButtonBuilder().setCustomId('race_gas').setLabel('GAS').setEmoji(emoGas).setStyle(ButtonStyle.Success);
        const btnBrake = new ButtonBuilder().setCustomId('race_brake').setLabel('REM').setEmoji(emoBrake).setStyle(ButtonStyle.Danger);
        const btnLeft = new ButtonBuilder().setCustomId('race_left').setLabel('KIRI').setEmoji(emoLeft).setStyle(ButtonStyle.Primary);
        const btnRight = new ButtonBuilder().setCustomId('race_right').setLabel('KANAN').setEmoji(emoRight).setStyle(ButtonStyle.Primary);

        const rintangan = [
            { id: 'race_gas', aksi: 'Jalan lurus panjang!', aksi_req: 'Tekan GAS untuk menyalip!' },
            { id: 'race_brake', aksi: 'Ada insiden di depan!', aksi_req: 'Tekan REM untuk menghindari!' },
            { id: 'race_left', aksi: 'Tikungan tajam ke KIRI di depan!', aksi_req: 'Banting stir ke KIRI!' },
            { id: 'race_right', aksi: 'Tikungan tajam ke KANAN di depan!', aksi_req: 'Banting stir ke KANAN!' }
        ];
        const flavorTexts = [
            "Angin berhembus kencang, pertahankan kecepatanmu di trek lurus!",
            "Lawan mencoba menyalip dari sisi dalam, tutup jalurnya!",
            "Aspal sedikit basah, fokus pada kemudi agar tidak tergelincir!",
            "Mesin menderu, tabung *Nitrous* sudah siap digunakan!",
            "Ribuan penonton bersorak di tribun, tunjukkan aksimu!",
            "Konsentrasi penuh, ban mulai aus, jangan sampai lengah!"
        ];

        for (let lap = 1; lap <= 4; lap++) {
            if (crashed) break;

            const rintanganAcak = rintangan[Math.floor(Math.random() * rintangan.length)];
            const flavorAcak = flavorTexts[Math.floor(Math.random() * flavorTexts.length)];
            
            let embedLap = new EmbedBuilder()
                .setColor(ui.getColor('primary'))
                .setTitle(`${emoStart} LAP ${lap} / 4`)
                .setDescription(`**Posisi Saat Ini:** Ke-${posisiBalap}\n*${flavorAcak}*\n\n🚨 **${rintanganAcak.aksi}**\n> ${rintanganAcak.aksi_req}`);

            let tombol = [btnGas, btnBrake, btnLeft, btnRight].sort(() => Math.random() - 0.5);
            let rowLap = new ActionRowBuilder().addComponents(...tombol);

            messageObj = await interaction.editReply({ embeds: [embedLap], components: [rowLap] });

            try {
                const tindakan = await messageObj.awaitMessageComponent({
                    filter: i => i.user.id === interaction.user.id,
                    time: 2500 + buffs.raceExtraTime 
                });

                if (tindakan.customId === rintanganAcak.id) {
                    if (posisiBalap > 1) posisiBalap--; 
                } else {
                    posisiBalap++;
                    if (posisiBalap > 4) crashed = true; 
                }

            } catch (e) {
                posisiBalap++;
                if (posisiBalap > 4) crashed = true;
            }
        }

        await profile.save(); 

        if (crashed || posisiBalap > 4) {
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${emoCrash} **CRASH!** Kamu membuat kesalahan fatal dan terlempar dari lintasan. Tidak ada hadiah hari ini.`)] });
        }

        let hadiah = 0; let gelar = ""; let warna = "";

        if (posisiBalap === 1) {
            hadiah = Math.floor(Math.random() * 5000) + 4000; 
            gelar = "🏆 JUARA 1!";
            warna = ui.getColor('economy'); 
        } else if (posisiBalap === 2) {
            hadiah = Math.floor(Math.random() * 2500) + 1500; 
            gelar = "🥈 JUARA 2";
            warna = '#C0C0C0'; 
        } else if (posisiBalap === 3) {
            hadiah = Math.floor(Math.random() * 1000) + 500; 
            gelar = "🥉 JUARA 3";
            warna = '#cd7f32'; 
        } else {
            hadiah = 250; 
            gelar = "🏅 Finis Ke-4";
            warna = ui.getColor('primary'); 
        }

        profile.economy_wallet += hadiah;
        await profile.save();

        return interaction.followUp({ embeds: [new EmbedBuilder().setColor(warna).setTitle(gelar).setDescription(`Balapan selesai! Penampilan yang solid.\nKamu mendapatkan **+${hadiah.toLocaleString()}** ${coin}!\n\n> 💳 **Saldo Akhir:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });
    }
};