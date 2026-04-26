const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { generateBalanceCard } = require('../../../utils/CanvasUtils');

module.exports = {
    async execute(interaction, profile, ui) {
        const user = interaction.options.getUser('target') || interaction.user;

        // Generate the Balance Card Canvas
        const buffer = await generateBalanceCard(user, profile);
        const cardAttachment = new AttachmentBuilder(buffer, { name: 'balance_card.png' });

        const embed = new EmbedBuilder()
            .setColor(ui.getColor('economy'))
            .setImage('attachment://balance_card.png')
            .setFooter({ text: 'Naura Economy • Platinum Card' });
        
        return interaction.editReply({ embeds: [embed], files: [cardAttachment] });
    }
};