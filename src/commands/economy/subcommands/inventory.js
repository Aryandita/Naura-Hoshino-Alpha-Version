const { EmbedBuilder } = require('discord.js');
const { getBuffs, getItemName } = require('../utils/ecoHelper');

module.exports = {
    async execute(interaction, profile, ui) {
        const user = interaction.options.getUser('target') || interaction.user;
        const buffs = getBuffs(profile.inventory);

        const embed = new EmbedBuilder()
            .setColor(ui.getColor('primary'))
            .setAuthor({ name: `🎒 Inventory & Status: ${user.username}`, iconURL: user.displayAvatarURL() })
            .setDescription(`Semua efek item di inventory **otomatis aktif**.`);

        let statsStr = `💼 **Gaji Work:** +${buffs.workBonus}% (+${buffs.typingExtraTime/1000}s)\n⏳ **Reduksi CD:** -${buffs.cooldownReducMs / 60000} Menit\n🏎️ **Toleransi Balap:** +${buffs.raceExtraTime/1000}s\n💻 **Peluang Hack:** +${buffs.hackChance}%\n🕵️ **Peluang Steal:** +${buffs.stealChance}%`;
        
        embed.addFields({ name: '📊 Total Buff Aktif', value: `>>> ${statsStr}` });

        if (profile.inventory.length === 0) {
            embed.addFields({ name: '📦 Daftar Barang', value: '*Tasmu masih kosong, beli barang di /economy shop!*' });
        } else {
            let itemsList = profile.inventory.map(id => `- **${getItemName(id)}**`).join('\n');
            embed.addFields({ name: '📦 Daftar Barang', value: itemsList });
        }

        return interaction.editReply({ embeds: [embed] });
    }
};