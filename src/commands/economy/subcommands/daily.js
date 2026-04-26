const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { msToTime } = require('../utils/ecoHelper');

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        const successEmoji = ui.getEmoji('success') || '✅';
        
        const finalCooldown = 24 * 60 * 60 * 1000; 
        const lastUsed = profile.cooldowns['daily'] || 0;
        const timeLeft = finalCooldown - (Date.now() - lastUsed);

        if (timeLeft > 0) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Sabar! Kamu sudah ambil daily hari ini. Tunggu **${msToTime(timeLeft)}** lagi.`)] });

        const hasMahkota = profile.inventory.includes('mahkota_raja');
        const bonusItem = hasMahkota ? 750 : 0;
        
        // Buat 3 kemungkinan reward
        const baseRewards = [
            Math.floor(Math.random() * 500) + 1000,   // Low: 1000 - 1500
            Math.floor(Math.random() * 800) + 1600,   // Medium: 1600 - 2400
            Math.floor(Math.random() * 1500) + 2500   // High/Jackpot: 2500 - 4000
        ];
        
        // Acak posisi reward
        const shuffledRewards = baseRewards.sort(() => Math.random() - 0.5);
        
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('daily_0').setLabel('Kartu Kiri').setEmoji('🎴').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('daily_1').setLabel('Kartu Tengah').setEmoji('🎴').setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId('daily_2').setLabel('Kartu Kanan').setEmoji('🎴').setStyle(ButtonStyle.Secondary)
        );

        const embedPilih = new EmbedBuilder()
            .setColor(ui.getColor('primary'))
            .setTitle('🎫 Pencairan Dana Tunjangan Harian')
            .setDescription(`Pemerintah Naura telah menyiapkan danamu!\nPilih salah satu dari 3 koper misteri di bawah ini untuk mencairkan tunjangan harianmu!\n\n*(Sistem akan memilih acak dalam 15 detik jika diabaikan)*`);

        const messageObj = await interaction.editReply({ embeds: [embedPilih], components: [row] });

        try {
            const confirmation = await messageObj.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 15000 });
            const selectedIndex = parseInt(confirmation.customId.split('_')[1]);
            
            const reward = shuffledRewards[selectedIndex] + bonusItem;
            
            profile.economy_wallet += reward; 
            profile.cooldowns['daily'] = Date.now();
            profile.changed('cooldowns', true);
            await profile.save();

            const disabledRow = new ActionRowBuilder();
            row.components.forEach((c, index) => {
                const btn = ButtonBuilder.from(c).setDisabled(true);
                if (index === selectedIndex) {
                    btn.setStyle(ButtonStyle.Success).setLabel(`+${shuffledRewards[index]}`);
                } else {
                    btn.setStyle(ButtonStyle.Danger).setLabel(`${shuffledRewards[index]}`);
                }
                disabledRow.addComponents(btn);
            });
            await confirmation.update({ components: [disabledRow] });

            const itemStr = hasMahkota ? `\n> 👑 **Item Aktif:** Mahkota Raja Arthur (+750)` : '';
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('success')).setDescription(`${successEmoji} Kamu memilih kartu yang benar dan menggosoknya! Mendapatkan **+${reward.toLocaleString()}** ${coin} bonus harian!${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });

        } catch (e) {
            // Jika user AFK / tidak memilih, berikan reward terkecil secara otomatis
            const reward = Math.min(...shuffledRewards) + bonusItem;
            profile.economy_wallet += reward;
            profile.cooldowns['daily'] = Date.now();
            profile.changed('cooldowns', true);
            await profile.save();
            
            const itemStr = hasMahkota ? `\n> 👑 **Item Aktif:** Mahkota Raja Arthur (+750)` : '';
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('economy')).setDescription(`⏳ Waktu habis! Kartumu digosok secara acak. Mendapatkan **+${reward.toLocaleString()}** ${coin}!${itemStr}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });
        }
    }
};