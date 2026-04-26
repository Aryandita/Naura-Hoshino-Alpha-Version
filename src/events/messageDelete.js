const { EmbedBuilder } = require('discord.js');
const ui = require('../config/ui'); // Gunakan tema UI terpusat
const config = require('../config.json');

module.exports = {
    name: 'messageDelete',
    async execute(message, client) {
        if (message.author?.bot || !message.guild) return;

        // Simpan data untuk command /snipe
        client.snipes.set(message.channel.id, {
            content: message.content,
            author: message.author,
            image: message.attachments.first()?.proxyURL || null,
            timestamp: Date.now()
        });

        const logChannel = message.guild.channels.cache.get(config.ticket.logChannelId);
        if (!logChannel) return;

        const embed = new EmbedBuilder()
            .setColor(ui.getColor('error'))
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .setTitle(`${ui.getEmoji('error')} Pesan Dihapus`)
            .setDescription(`Pesan oleh <@${message.author.id}> di <#${message.channel.id}> telah lenyap.`)
            .addFields({ name: '📝 Konten Terakhir', value: `\`\`\`${message.content || 'Hanya Gambar/Embed'}\`\`\`` })
            .setFooter({ text: `User ID: ${message.author.id}` })
            .setTimestamp();

        await logChannel.send({ embeds: [embed] }).catch(() => {});
    }
};