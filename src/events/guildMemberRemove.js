const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    const channel = member.guild.systemChannel || member.guild.channels.cache.find(c => c.name === 'general' || c.name === 'welcome');
    
    if (channel) {
      const embed = new EmbedBuilder()
        .setTitle('Sampai Jumpa! 👋')
        .setDescription(`Selamat tinggal **${member.user.tag}**. Terima kasih sudah meramaikan **${member.guild.name}**. Semoga harimu menyenangkan di luar sana!`)
        .setThumbnail(member.user.displayAvatarURL())
        .setColor('#2b2d31');
        
      channel.send({ embeds: [embed] });
    }
  },
};