const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = async (client, oldMessage, newMessage) => {
    if (oldMessage.author?.bot || !oldMessage.guild) return;
    if (oldMessage.content === newMessage.content) return; // Mencegah trigger saat Discord meng-embed link

    const logChannel = oldMessage.guild.channels.cache.get(config.ticket.logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#3498DB') // Biru untuk pesan diedit
        .setAuthor({ name: oldMessage.author.tag, iconURL: oldMessage.author.displayAvatarURL() })
        .setTitle('✏️ Pesan Diedit')
        .setDescription(`Pesan dari <@${oldMessage.author.id}> diedit di <#${oldMessage.channel.id}>.\n[Lompat ke Pesan](${newMessage.url})`)
        .addFields(
            { name: 'Sebelum', value: `\`\`\`${oldMessage.content || 'Kosong/Gambar'}\`\`\`` },
            { name: 'Sesudah', value: `\`\`\`${newMessage.content || 'Kosong/Gambar'}\`\`\`` }
        )
        .setFooter({ text: `User ID: ${oldMessage.author.id}` })
        .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
};
