const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const ms = require('ms'); // Anda perlu menginstal package 'ms': npm install ms
const Giveaway = require('../../models/Giveaway');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Sistem Giveaway Canggih Naura')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addSubcommand(sub => sub
            .setName('start')
            .setDescription('Mulai giveaway baru')
            .addStringOption(opt => opt.setName('durasi').setDescription('Contoh: 1h, 1d, 30m').setRequired(true))
            .addIntegerOption(opt => opt.setName('pemenang').setDescription('Jumlah pemenang').setRequired(true))
            .addStringOption(opt => opt.setName('hadiah').setDescription('Hadiah giveaway').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('end')
            .setDescription('Akhiri giveaway secara paksa')
            .addStringOption(opt => opt.setName('message_id').setDescription('ID Pesan Giveaway').setRequired(true))
        ),

    async execute(interaction) {
        const subCmd = interaction.options.getSubcommand();

        if (subCmd === 'start') {
            const durasiStr = interaction.options.getString('durasi');
            const durasiMs = ms(durasiStr);
            if (!durasiMs) return interaction.reply({ content: 'Format waktu salah! Gunakan: 1h, 1d, 30m.', ephemeral: true });

            const pemenang = interaction.options.getInteger('pemenang');
            const hadiah = interaction.options.getString('hadiah');
            
            const endTimeDate = new Date(Date.now() + durasiMs);
            const unixEnd = Math.floor(endTimeDate.getTime() / 1000);

            const embed = new EmbedBuilder()
                .setColor(ui.getColor('accent')) // Pink Pastel Naura
                .setTitle(`🎉 GIVEAWAY: ${hadiah} 🎉`)
                .setDescription(`Klik reaksi 🎉 untuk ikut serta!\n\n${ui.getEmoji('progressDot')} **Jumlah Pemenang:** ${pemenang}\n${ui.getEmoji('progressDot')} **Disponsori oleh:** <@${interaction.user.id}>\n${ui.getEmoji('progressDot')} **Berakhir:** <t:${unixEnd}:R>`)
                .setFooter({ text: 'Naura Giveaway System' })
                .setTimestamp(endTimeDate);

            const reply = await interaction.reply({ embeds: [embed], fetchReply: true });
            await reply.react('🎉');

            // Simpan ke MySQL
            await Giveaway.create({
                messageId: reply.id,
                channelId: interaction.channelId,
                guildId: interaction.guildId,
                prize: hadiah,
                winnersCount: pemenang,
                endTime: endTimeDate,
                hostId: interaction.user.id
            });
        }
        
        if (subCmd === 'end') {
            // (Logika memanggil fungsi endGiveaway() secara manual)
            const msgId = interaction.options.getString('message_id');
            const gwData = await Giveaway.findByPk(msgId);
            if (!gwData || gwData.ended) return interaction.reply({ content: 'Giveaway tidak ditemukan atau sudah berakhir.', ephemeral: true });
            
            await interaction.reply({ content: 'Mengakhiri giveaway secara manual...', ephemeral: true });
            
            // Panggil fungsi dari class manager
            const { client } = interaction;
            const gwManager = new (require('../../managers/GiveawayManager'))(client);
            await gwManager.endGiveaway(gwData, true);
        }
    }
};
