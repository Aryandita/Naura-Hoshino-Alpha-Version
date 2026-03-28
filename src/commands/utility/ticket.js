const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, AttachmentBuilder } = require('discord.js');
const ui = require('../../config/ui');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Buat panel tiket untuk layanan bantuan server. 🎫')
    .addChannelOption(channel => 
        channel.setName('channel')
        .setDescription('Saluran tempat panel tiket akan dimunculkan.')
        .setRequired(false)
    ),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    
    const bannerAttachment = new AttachmentBuilder(ui.banners.ticket, { name: 'banner_ticket.png' });

    const embed = new EmbedBuilder()
      .setTitle('🎫 Sistem Layanan Bantuan')
      .setDescription('Silakan klik tombol di bawah ini untuk membuat tiket jika Anda membutuhkan bantuan dari tim Support.')
      .setColor(ui.colors.primary || '#00FFFF')
      .setImage('attachment://banner_ticket.png');

    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_create')
          .setLabel('Buat Tiket')
          .setStyle(ButtonStyle.Primary)
      );

    await channel.send({ embeds: [embed], components: [row], files: [bannerAttachment] });
    
    return interaction.reply({ 
        content: `Panel tiket berhasil dikirim ke saluran <#${channel.id}>. ✅`, 
        ephemeral: true 
    });
  },
};