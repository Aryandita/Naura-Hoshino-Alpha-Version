const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.json');

module.exports = {
    name: 'setupticket',
    description: 'Memunculkan panel pembuatan tiket',
    // Pastikan hanya admin yang bisa menjalankan command ini
    async execute(client, message, args) {
        if (!message.member.permissions.has('Administrator')) return;

        const embed = new EmbedBuilder()
            .setColor(config.ticket.panelEmbedColor || '#FDBB44')
            .setTitle('🎫 Pusat Bantuan Naura')
            .setDescription('Klik tombol di bawah untuk membuat tiket bantuan. Tim admin kami akan segera merespons Anda.')
            .setFooter({ text: 'Naura Support System' });

        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('ticket_create')
                .setLabel('Buat Tiket')
                .setEmoji('📩')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [embed], components: [button] });
        await message.delete(); // Hapus pesan command dari admin
    }
};
