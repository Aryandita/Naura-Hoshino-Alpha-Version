const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        
        const embed = new EmbedBuilder()
            .setColor(ui.getColor('primary'))
            .setAuthor({ name: '🌟 N-GLOBAL ECONOMIC CENTER', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Selamat datang di pusat komando! Kendalikan arus kasmu dan jadilah penguasa ekonomi kota.\n\n**[ 💳 KARTU IDENTITAS FINANSIAL ]**\n> 👤 **Pemilik Rekening:** \`${interaction.user.tag}\`\n> 💰 **Saldo Dompet:** **${profile.economy_wallet.toLocaleString()}** ${coin}\n> 🏦 **Rekening Bank:** **${profile.economy_bank.toLocaleString()}** ${coin}\n> 🎒 **Isi Brankas Tas:** **${profile.inventory.length}** barang berharga`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: '💼 Perusahaan & Prospek', value: 'Gunakan \`/economy work\` atau \`/economy daily\` untuk mulai mencari cuan harian.', inline: true },
                { name: '🛒 Distrik Perbelanjaan', value: 'Kunjungi \`/economy shop\` untuk melihat pasar dan berbelanja item RPG.', inline: true },
                { name: '🎮 Arena Hiburan', value: 'Gass! Main \`/economy race\` atau santai di tepi danau dengan \`/economy fish\`.', inline: false },
                { name: '🕵️ Jalur Bawah Tanah', value: 'Butuh koin instan? Retas bank dengan \`/economy hack\` atau copet via \`/economy steal\`!', inline: false }
            )
            .setFooter({ text: 'Powered by Naura Ultimate System • Interactive Edition', iconURL: interaction.user.displayAvatarURL() });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('menu_help').setLabel('Cara Bermain').setEmoji('📖').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('menu_stats').setLabel('Statistik Lengkap').setEmoji('📊').setStyle(ButtonStyle.Secondary)
        );

        const messageObj = await interaction.editReply({ embeds: [embed], components: [row] });

        const collector = messageObj.createMessageComponentCollector({ time: 60000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({ content: `${ui.getEmoji('error')} Menu ini bukan milikmu.`, ephemeral: true });
            }

            if (i.customId === 'menu_help') {
                const helpEmbed = new EmbedBuilder()
                    .setColor(ui.getColor('info'))
                    .setTitle('📖 Panduan Bermain Ekonomi')
                    .setDescription(`**1. Cara Dapat Uang:**\n- \`/economy daily\` (Harian)\n- \`/economy weekly\` (Mingguan)\n- \`/economy work\` (10 Menit sekali)\n\n**2. Cara Belanja:**\n- \`/economy shop kategori:...\` (Toko dengan tombol *Beli* interaktif!)\n- Beli pancingan atau mobil untuk main minigame.\n\n**3. Mini Games Interaktif:**\n- \`/economy race\` (Balapan mobil 4 Lap!)\n- \`/economy fish\` (Mancing strike berhadiah!)`);
                await i.reply({ embeds: [helpEmbed], ephemeral: true });
            }

            if (i.customId === 'menu_stats') {
                const statsEmbed = new EmbedBuilder()
                    .setColor(ui.getColor('info'))
                    .setTitle('📊 Statistik Tas & Cooldown')
                    .setDescription(`**Isi Tas:**\n${profile.inventory.length > 0 ? profile.inventory.map(item => `> \`${item}\``).join('\n') : '> Kosong'}\n\n*Gunakan \`/economy inventory\` untuk detail.*`);
                await i.reply({ embeds: [statsEmbed], ephemeral: true });
            }
        });

        collector.on('end', () => {
            const disabledRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('menu_help').setLabel('Cara Bermain').setEmoji('📖').setStyle(ButtonStyle.Primary).setDisabled(true),
                new ButtonBuilder().setCustomId('menu_stats').setLabel('Statistik Lengkap').setEmoji('📊').setStyle(ButtonStyle.Secondary).setDisabled(true)
            );
            interaction.editReply({ components: [disabledRow] }).catch(() => {});
        });
    }
};