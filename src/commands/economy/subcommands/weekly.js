const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { msToTime } = require('../utils/ecoHelper');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        const successEmoji = ui.getEmoji('success') || '✅';
        
        // --- PREMIUM LOCK ---
        // Cek apakah user premium dan belum expired
        if (!profile.isPremium || !profile.premiumUntil || profile.premiumUntil <= new Date()) {
            return interaction.editReply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(ui.getColor('error') || '#FF0000')
                        .setTitle('💎 Fitur V.I.P Terkunci')
                        .setDescription(`${errorEmoji} | Akses ditolak! Gaji Mingguan (Weekly) dengan fitur putaran nasib puluhan ribu koin ini adalah fasilitas eksklusif untuk member **Premium**. Hubungi Developer untuk mendapatkan akses V.I.P!`)
                ] 
            });
        }
        // --------------------
        
        const finalCooldown = 7 * 24 * 60 * 60 * 1000; 
        const lastUsed = profile.cooldowns['weekly'] || 0;
        const timeLeft = finalCooldown - (Date.now() - lastUsed);

        if (timeLeft > 0) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Bansos mingguan belum turun. Tunggu **${msToTime(timeLeft)}** lagi.`)] });

        const baseReward = 10000;
        
        const btnSpin = new ButtonBuilder().setCustomId('spin_weekly').setLabel('Putar Roda Nasib!').setEmoji('🎡').setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(btnSpin);

        const embedPilih = new EmbedBuilder()
            .setColor(ui.getColor('economy'))
            .setTitle('🎡 Roda Gaji Mingguan Sultan')
            .setDescription(`Gaji pokok V.I.P minggu ini ditetapkan sebesar **${baseReward.toLocaleString()}** ${coin}.\nSilakan putar roda nasib untuk mengadu keberuntungan *multiplier* (pengali) dari gajimu!\n\n*(Sistem akan memutar otomatis jika tidak ada aksi dalam 15 detik)*`);

        const messageObj = await interaction.editReply({ embeds: [embedPilih], components: [row] });

        try {
            const confirmation = await messageObj.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 15000 });
            await confirmation.deferUpdate();

            const multipliers = [0.5, 1, 1.2, 1.5, 2, 3, 5];
            const weights = [15, 30, 25, 15, 10, 4, 1]; // Persentase peluang
            
            // Logika gacha untuk wheel
            let sum = 0;
            const r = Math.random() * 100;
            let selectedMultiplier = 1;
            for (let i = 0; i < multipliers.length; i++) {
                sum += weights[i];
                if (r <= sum) {
                    selectedMultiplier = multipliers[i];
                    break;
                }
            }

            // Animasi spinning
            const spinFrames = ['🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🟫'];
            for(let i=0; i < 4; i++) {
                const randomEmoji = spinFrames[Math.floor(Math.random() * spinFrames.length)];
                await interaction.editReply({ 
                    embeds: [new EmbedBuilder().setColor(ui.getColor('economy')).setTitle('🎡 Memutar Roda...').setDescription(`> 🔻\n> ${randomEmoji} [ ? x ]\n> 🔺\n\nMenentukan nasibmu...`)],
                    components: [] 
                });
                await sleep(600);
            }

            const totalReward = Math.floor(baseReward * selectedMultiplier);
            
            profile.economy_wallet += totalReward; 
            profile.cooldowns['weekly'] = Date.now();
            profile.changed('cooldowns', true);
            await profile.save();
            
            let colorResult = selectedMultiplier > 1 ? ui.getColor('success') : ui.getColor('error');
            if(selectedMultiplier === 1) colorResult = ui.getColor('primary');

            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(colorResult).setTitle('🎡 Roda Berhenti!').setDescription(`Roda nasib berhenti di angka **${selectedMultiplier}x**!\n\nKamu mendapatkan **+${totalReward.toLocaleString()}** ${coin} dari gaji mingguan!\n\n> 💳 **Saldo Saat Ini:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });

        } catch (e) {
            // Jika user AFK
            profile.economy_wallet += baseReward;
            profile.cooldowns['weekly'] = Date.now();
            profile.changed('cooldowns', true);
            await profile.save();
            
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('economy')).setDescription(`⏳ Waktu habis! Roda diputar otomatis oleh sistem (1x).\nMendapatkan **+${baseReward.toLocaleString()}** ${coin}!\n\n> 💳 **Saldo Saat Ini:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });
        }
    }
};