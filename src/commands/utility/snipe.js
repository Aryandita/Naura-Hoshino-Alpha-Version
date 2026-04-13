const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('snipe')
        .setDescription('Melihat pesan yang terakhir dihapus di channel ini.'),
    
    async execute(interaction) {
        const sniped = interaction.client.snipes.get(interaction.channelId);
        
        if (!sniped) return interaction.reply({ content: 'Tidak ada pesan yang dihapus baru-baru ini.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setColor(ui.getColor('primary'))
            .setAuthor({ name: sniped.author.tag, iconURL: sniped.author.displayAvatarURL() })
            .setDescription(sniped.content || "*Hanya gambar*")
            .setFooter({ text: `Dihapus pada` })
            .setTimestamp(sniped.timestamp);

        if (sniped.image) embed.setImage(sniped.image);

        await interaction.reply({ embeds: [embed] });
    }
};
