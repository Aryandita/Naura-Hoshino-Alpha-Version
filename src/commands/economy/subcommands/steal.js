const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getBuffs, getItemName, msToTime } = require('../utils/ecoHelper');

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        const successEmoji = ui.getEmoji('success') || '✅';

        const buffs = getBuffs(profile.inventory);
        let finalCooldown = (45 * 60 * 1000) - buffs.cooldownReducMs;
        if (finalCooldown < 0) finalCooldown = 0;

        const lastUsed = profile.cooldowns['steal'] || 0;
        const timeLeft = finalCooldown - (Date.now() - lastUsed);

        if (timeLeft > 0) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Polisi sedang patroli di area kasino! Sembunyi selama **${msToTime(timeLeft)}**.`)] });

        profile.cooldowns['steal'] = Date.now();
        profile.changed('cooldowns', true);

        let usedItems = profile.inventory.filter(id => ['pisau_karat', 'pistol_glock', 'ak47', 'blade_despair'].includes(id)).map(getItemName);
        
        let jumlahAman = 1; 
        if (buffs.stealChance >= 25) jumlahAman = 2;
        if (buffs.stealChance >= 50) jumlahAman = 3;
        if (buffs.stealChance >= 90) jumlahAman = 4;
        
        const btnLabels = ['Lorong Kiri', 'Ventilasi', 'Pintu Belakang', 'Lorong Kanan'];
        const safeIndexes = new Set();
        while(safeIndexes.size < jumlahAman) { safeIndexes.add(Math.floor(Math.random() * 4)); }

        const row = new ActionRowBuilder();
        btnLabels.forEach((label, index) => {
            const isSafe = safeIndexes.has(index);
            row.addComponents(new ButtonBuilder().setCustomId(`steal_${index}_${isSafe}`).setLabel(label).setStyle(ButtonStyle.Secondary));
        });

        const embed = new EmbedBuilder()
            .setColor('#e74c3c')
            .setTitle('🥷 Menyusup ke Kasino Terbesar di Kota')
            .setDescription(`Bouncer berotot sedang berpatroli! Terdapat 4 rute pelarian rahasia.\nBerdasarkan ancaman senjatamu, **${jumlahAman} dari 4 jalur ini AMAN dari sergapan**.\n\nPilih rute pelarianmu dalam 15 detik sebelum penjaga memanggil bantuan!${usedItems.length > 0 ? `\n\n> 🗡️ **Senjata Di Tangan:** \`${usedItems.join(', ')}\`` : ''}`);

        const messageObj = await interaction.editReply({ embeds: [embed], components: [row] });

        try {
            const confirmation = await messageObj.awaitMessageComponent({ filter: i => i.user.id === interaction.user.id, time: 15000 });
            const isSafe = confirmation.customId.split('_')[2] === 'true';
            
            const disabledRow = new ActionRowBuilder();
            row.components.forEach(c => {
                const btn = ButtonBuilder.from(c).setDisabled(true);
                if (c.data.custom_id === confirmation.customId) btn.setStyle(isSafe ? ButtonStyle.Success : ButtonStyle.Danger);
                disabledRow.addComponents(btn);
            });
            await confirmation.update({ components: [disabledRow] });

            if (isSafe) {
                const reward = Math.floor(Math.random() * 8000) + 4000;
                profile.economy_wallet += reward; await profile.save();
                return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('success')).setDescription(`${successEmoji} **PENYUSUPAN SUKSES!** Brankas berhasil dibongkar. Mengamankan **+${reward.toLocaleString()}** ${coin}!\n> 💳 **Saldo:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });
            } else {
                const denda = Math.floor(Math.random() * 1500) + 500;
                profile.economy_wallet -= denda; 
                if (profile.economy_wallet < 0) profile.economy_wallet = 0;
                await profile.save();
                return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`🚨 **ALARM BERBUNYI!** Kamu tertangkap kamera keamanan. Didenda uang pengobatan **-${denda.toLocaleString()}** ${coin}.`)] });
            }
        } catch (e) {
            await profile.save();
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} ⏳ **Waktu Habis!** Kamu mondar-mandir terlalu lama hingga shift penjaga berganti.`)] });
        }
    }
};