const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('Cek status server Minecraft kesayanganmu! ⛏️')
        .addStringOption(option => option.setName('ip').setDescription('IP Server Minecraft').setRequired(true))
        .addStringOption(option => option.setName('port').setDescription('Port Server (opsional)').setRequired(false))
        .addStringOption(option => option.setName('tipe').setDescription('Tipe server').addChoices({ name: 'Java', value: 'java' }, { name: 'Bedrock', value: 'bedrock' }).setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();
        const ip = interaction.options.getString('ip');
        const port = interaction.options.getString('port') || '';
        const type = interaction.options.getString('tipe') || 'java';

        const url = type === 'bedrock' ? `https://api.mcsrvstat.us/bedrock/3/${ip}${port ? ':' + port : ''}` : `https://api.mcsrvstat.us/3/${ip}${port ? ':' + port : ''}`;

        try {
            const response = await fetch(url);
            const data = await response.json();

            if (!data.online) return interaction.followUp(`❌ Server **${ip}** sedang offline atau tidak dapat dijangkau.`);

            const bannerAttachment = new AttachmentBuilder(ui.banners.minecraft, { name: 'banner_minecraft.png' });

            const embed = new EmbedBuilder()
                .setTitle(`🟢 Status Server: ${ip}`)
                .setColor(ui.colors.success || '#00AA00')
                .setThumbnail(`https://api.mcsrvstat.us/icon/${ip}`)
                .setImage('attachment://banner_minecraft.png')
                .addFields(
                    { name: 'Versi', value: data.version || 'Tidak diketahui', inline: true },
                    { name: 'Pemain', value: `${data.players.online} / ${data.players.max}`, inline: true },
                    { name: 'MOTD', value: data.motd?.clean?.join('\n') || 'Tidak ada deskripsi', inline: false }
                );

            await interaction.followUp({ embeds: [embed], files: [bannerAttachment] });
        } catch (error) {
            await interaction.followUp('Duh, ada masalah pas ngecek servernya. Pastikan IP-nya bener ya! 🛠️');
        }
    }
};