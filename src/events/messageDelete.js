const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

module.exports = async (client, message) => {
    // Abaikan jika pesan dari bot atau tidak ada di server
    if (message.author?.bot || !message.guild) return;
    if (!message.content) return; // Abaikan jika pesan hanya berisi embed/gambar tanpa teks

    const logChannel = message.guild.channels.cache.get(config.ticket.logChannelId);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
        .setColor('#E74C3C') // Merah untuk pesan dihapus
        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
        .setTitle('🗑️ Pesan Dihapus')
        .setDescription(`Pesan dikirim oleh <@${message.author.id}> dihapus di <#${message.channel.id}>.`)
        .addFields({ name: 'Konten Pesan', value: `\`\`\`${message.content}\`\`\`` })
        .setFooter({ text: `User ID: ${message.author.id}` })
        .setTimestamp();

    await logChannel.send({ embeds: [embed] }).catch(() => {});
};
