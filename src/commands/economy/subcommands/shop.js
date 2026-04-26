const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const { getShopRotation } = require('../utils/ecoHelper');

module.exports = {
    async execute(interaction, profile, ui) {
        const kategori = interaction.options.getString('kategori');
        const coin = ui.getEmoji('coin') || '🪙';
        
        let title = ''; let color = '';
        if (kategori === 'market') { title = '🏪 Supermarket: Booster & Utilitas'; color = ui.getColor('success'); }
        if (kategori === 'blackmarket') { title = '💀 Black Market: Senjata & Item Ilegal'; color = ui.getColor('dark'); }
        if (kategori === 'car') { title = '🏎️ Dealer Premium: Kendaraan Sport'; color = '#FF4500'; }
        if (kategori === 'fishing') { title = '🎣 Toko Nelayan: Alat Pancing & Umpan'; color = '#1E90FF'; }

        const renderShop = async () => {
            const rotation = getShopRotation(kategori);
            const embed = new EmbedBuilder()
                .setColor(color)
                .setAuthor({ name: title, iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`> 🚨 *Pasokan barang dari bandar dirombak otomatis setiap 5 menit!*\n⏳ **Pengiriman stok berikutnya:** <t:${Math.floor(rotation.nextRefresh / 1000)}:R>\n🛒 **Klik tombol di bawah untuk checkout barang dari etalase!**\n\n**━━━ 📦 KATALOG TERSEDIA ━━━**`)
                .setFooter({ text: `💰 Saldo Aktif: ${profile.economy_wallet.toLocaleString()} koin` });

            const row = new ActionRowBuilder();
            
            rotation.items.forEach((item, index) => {
                embed.addFields({
                    name: `${item.rarityData.icon} [${item.rarityData.name.toUpperCase()}] ${item.name}`,
                    value: `> 🏷️ **ID:** \`${item.id}\`\n> 💰 **Harga:** **${item.price.toLocaleString()}** ${coin}\n> ⚡ **Efek:** *${item.effect}*`,
                    inline: false
                });

                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`buy_${item.id}`)
                        .setLabel(`Beli [${item.id}]`)
                        .setEmoji('🛒')
                        .setStyle(ButtonStyle.Primary)
                );
            });

            return { embed, row, items: rotation.items };
        };

        let { embed, row, items } = await renderShop();
        const messageObj = await interaction.editReply({ embeds: [embed], components: [row] });

        const collector = messageObj.createMessageComponentCollector({ componentType: ComponentType.Button, time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: `${ui.getEmoji('error')} Kamu tidak bisa menggunakan tombol ini.`, ephemeral: true });
            }

            const itemId = i.customId.replace('buy_', '');
            const selectedItem = items.find(it => it.id === itemId);

            if (!selectedItem) {
                return i.reply({ content: `${ui.getEmoji('error')} Barang ini sudah tidak ada di toko.`, ephemeral: true });
            }

            if (profile.economy_wallet < selectedItem.price) {
                return i.reply({ content: `${ui.getEmoji('error')} Saldo kamu tidak cukup untuk membeli **${selectedItem.name}**! Butuh **${selectedItem.price.toLocaleString()}** ${coin}.`, ephemeral: true });
            }

            if (profile.inventory.includes(selectedItem.id)) {
                return i.reply({ content: `${ui.getEmoji('error')} Kamu sudah memiliki **${selectedItem.name}**!`, ephemeral: true });
            }

            profile.economy_wallet -= selectedItem.price;
            profile.inventory.push(selectedItem.id);
            profile.changed('inventory', true);
            await profile.save();

            const resEmbed = new EmbedBuilder()
                .setColor(ui.getColor('success'))
                .setDescription(`✅ Berhasil membeli **${selectedItem.name}** seharga **${selectedItem.price.toLocaleString()}** ${coin}!\n> 💳 Saldo Sisa: **${profile.economy_wallet.toLocaleString()}** ${coin}`);
            
            await i.reply({ embeds: [resEmbed], ephemeral: true });
            
            // Re-render shop with updated balance
            const newShop = await renderShop();
            await interaction.editReply({ embeds: [newShop.embed], components: [newShop.row] });
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder();
            row.components.forEach(c => disabledRow.addComponents(ButtonBuilder.from(c).setDisabled(true)));
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    }
};