const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('vote')
        .setDescription('🗳️ Vote Naura Hoshino dan dapatkan Trial V.I.P 12 Jam!'),

    async execute(interaction) {
        const topGgLink = 'https://top.gg/bot/1483665745727721543?s=00487c531de33';

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setAuthor({ name: '🌟 Dukung Naura Hoshino!', iconURL: interaction.client.user.displayAvatarURL() })
            .setDescription(`Bantu Naura untuk terus berkembang dengan memberikan **Vote harian** di Top.gg!\n\n🎁 **REWARD INSTAN:**\nSebagai tanda terima kasih, sistem kami akan langsung menyuntikkan **Trial V.I.P Premium selama 12 Jam** ke akunmu secara otomatis setelah proses voting selesai!`)
            .setFooter({ text: 'Naura Auto-Vote Reward System', iconURL: interaction.client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Vote Sekarang')
                .setStyle(ButtonStyle.Link)
                .setURL(topGgLink)
                .setEmoji('💖')
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    },

    async executePrefix(message, args) {
        const topGgLink = 'https://top.gg/bot/1483665745727721543?s=00487c531de33';

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setAuthor({ name: '🌟 Dukung Naura Hoshino!', iconURL: message.client.user.displayAvatarURL() })
            .setDescription(`Bantu Naura untuk terus berkembang dengan memberikan **Vote harian** di Top.gg!\n\n🎁 **REWARD INSTAN:**\nSebagai tanda terima kasih, sistem kami akan langsung menyuntikkan **Trial V.I.P Premium selama 12 Jam** ke akunmu secara otomatis setelah proses voting selesai!`)
            .setFooter({ text: 'Naura Auto-Vote Reward System', iconURL: message.client.user.displayAvatarURL() })
            .setTimestamp();

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setLabel('Vote Sekarang')
                .setStyle(ButtonStyle.Link)
                .setURL(topGgLink)
                .setEmoji('💖')
        );

        await message.reply({ embeds: [embed], components: [row] });
    }
};
