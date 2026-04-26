const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBuffs, msToTime } = require('../utils/ecoHelper');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        const successEmoji = ui.getEmoji('success') || '✅';

        const buffs = getBuffs(profile.inventory);
        let finalCooldown = (3 * 60 * 60 * 1000) - buffs.cooldownReducMs;
        if (finalCooldown < 0) finalCooldown = 0;

        const lastUsed = profile.cooldowns['lootbox'] || 0;
        const timeLeft = finalCooldown - (Date.now() - lastUsed);

        if (timeLeft > 0) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Lootbox sedang di-*restock*. Tunggu **${msToTime(timeLeft)}** lagi.`)] });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lootbox_paksa').setLabel('Buka Paksa (Cepat & Berisiko)').setEmoji('💥').setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId('lootbox_pelan').setLabel('Buka Pelan (Aman & Stabil)').setEmoji('🔑').setStyle(ButtonStyle.Success)
        );

        const embedPilih = new EmbedBuilder()
            .setColor(ui.getColor('primary'))
            .setTitle('📦 Menemukan Peti Harta Karun!')
            .setDescription(`Di tengah perjalanan, kamu tersandung sebuah *Lootbox* usang peninggalan kerajaan kuno yang gemboknya terkunci rapat.\n\n💥 **Buka Paksa:** Brutal & Cepat. Peluang jackpot super besar, tapi koin di dalamnya rentan hancur!\n🔑 **Buka Pelan:** Aman & Stabil. Dijamin mendapat nominal standar tanpa resiko.\n\n*(Pilih strategimu dalam 15 detik)*`);

        const messageObj = await interaction.editReply({ embeds: [embedPilih], components: [row] });

        try {
            const confirmation = await messageObj.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 15000 });
            await confirmation.deferUpdate();

            const isPaksa = confirmation.customId === 'lootbox_paksa';

            const disabledRow = new ActionRowBuilder();
            row.components.forEach(c => {
                disabledRow.addComponents(ButtonBuilder.from(c).setDisabled(true));
            });
            await interaction.editReply({ components: [disabledRow] });

            if (isPaksa) {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setTitle('💥 Mendobrak Lootbox...').setDescription(`Kamu mengambil palu dan memukul gembok peti kuat-kuat!`)] });
                await sleep(1500);

                const chance = Math.random();
                let reward = 0;
                let title = '';
                let desc = '';

                if (chance < 0.3) {
                    // 30% Hancur
                    reward = Math.floor(Math.random() * 300) + 100;
                    title = '💥 BOOM! Peti Hancur Berantakan!';
                    desc = `Pukulan palumu kelewat batas! Kotaknya retak parah dan koin berserakan ke selokan.\nKamu hanya berhasil menyelamatkan **+${reward.toLocaleString()}** ${coin}.`;
                } else if (chance < 0.8) {
                    // 50% Standar
                    reward = Math.floor(Math.random() * 2000) + 1500;
                    title = '📦 Berhasil Dibobol!';
                    desc = `Gembok patah dan kotak berderit terbuka. Kamu mendapatkan **+${reward.toLocaleString()}** ${coin}.`;
                } else {
                    // 20% Jackpot
                    reward = Math.floor(Math.random() * 6000) + 4000;
                    title = '🌟 JACKPOT HARTA RAJA ARTHUR!';
                    desc = `Cahaya emas menyilaukan matamu! Di balik debu itu terdapat tumpukan koin emas murni!\nKamu meraup kekayaan fantastis sebesar **+${reward.toLocaleString()}** ${coin}!`;
                }

                profile.economy_wallet += reward;
                profile.cooldowns['lootbox'] = Date.now();
                profile.changed('cooldowns', true);
                await profile.save();

                return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('economy')).setTitle(title).setDescription(`${desc}\n\n> 💳 **Saldo Saat Ini:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });

            } else {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('success')).setTitle('🔑 Membuka Pelan-Pelan...').setDescription(`Kamu mencari kunci yang pas dan mencoba membuka engselnya secara perlahan...`)] });
                await sleep(2000);

                // Aman, 100% dapat antara 1500 - 3000
                const reward = Math.floor(Math.random() * 1500) + 1500;
                profile.economy_wallet += reward;
                profile.cooldowns['lootbox'] = Date.now();
                profile.changed('cooldowns', true);
                await profile.save();

                return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('economy')).setTitle('🎉 Peti Terbuka Secara Utuh!').setDescription(`Isi peti aman tanpa goresan.\nKamu mendapatkan **+${reward.toLocaleString()}** ${coin}!\n\n> 💳 **Saldo Saat Ini:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });
            }

        } catch (e) {
            // AFK = ilang
            profile.cooldowns['lootbox'] = Date.now();
            profile.changed('cooldowns', true);
            await profile.save();
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`⏳ Waktu habis! Lootbox dicuri oleh orang lain selagi kamu melamun.`)] });
        }
    }
};