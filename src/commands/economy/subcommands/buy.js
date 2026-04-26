const { EmbedBuilder } = require('discord.js');
const { getShopRotation } = require('../utils/ecoHelper');

module.exports = {
    async execute(interaction, profile, ui) {
        const itemID = interaction.options.getString('kode_barang').toLowerCase();
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        
        let foundItem = null; let foundRarity = null;

        ['market', 'blackmarket', 'car'].forEach(shopType => {
            const rotation = getShopRotation(shopType);
            const match = rotation.items.find(i => i.id === itemID);
            if (match) { foundItem = match; foundRarity = match.rarityData; }
        });

        if (!foundItem) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Barang \`${itemID}\` tidak ditemukan di sesi toko saat ini! Cek \`/economy shop\`.`)] });
        if (profile.economy_wallet < foundItem.price) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Uangmu kurang! Butuh **${foundItem.price.toLocaleString()}** ${coin}.`)] });
        if (profile.inventory.includes(foundItem.id)) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Kamu sudah punya **${foundItem.name}**!`)] });

        profile.economy_wallet -= foundItem.price;
        profile.inventory.push(foundItem.id);
        profile.changed('inventory', true); 
        await profile.save();

        const embed = new EmbedBuilder()
            .setColor(foundRarity.color)
            .setTitle(`${ui.getEmoji('success')} Transaksi Sukses!`)
            .setDescription(`Kamu membeli ${foundRarity.icon} **${foundItem.name}** seharga **${foundItem.price.toLocaleString()}** ${coin}\n\n*Barang dimasukkan ke Inventory dan efek pasifnya otomatis aktif!*`);

        return interaction.editReply({ embeds: [embed] });
    }
};