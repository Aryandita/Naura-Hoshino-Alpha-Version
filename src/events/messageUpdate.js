const { EmbedBuilder } = require('discord.js');
const ui = require('../config/ui');
const config = require('../config.json');

module.exports = {
    name: 'messageUpdate',
    async execute(oldMessage, newMessage, client) {
        if (oldMessage.author?.bot || !oldMessage.guild) return;
        if (oldMessage.content === newMessage.content) return; 

        const logChannel = oldMessage.guild.channels.cache.get(config.ticket.logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(ui.getColor('primary'))
            .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
            .setTitle(`${ui.getEmoji('tod_spin')} Pesan Diedit`)
            .setDescription(`Aktivitas edit terdeteksi di <#${oldMessage.channel.id}>.\n[🔗 Lompat ke Pesan](${newMessage.url})`)
            .addFields(
                { name: '⬅️ Sebelum', value: `\`\`\`${oldMessage.content || 'Kosong/Gambar'}\`\`\`` },
                { name: '➡️ Sesudah', value: `\`\`\`${newMessage.content || 'Kosong/Gambar'}\`\`\`` }
            )
            .setFooter({ text: `User ID: ${oldMessage.author.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};