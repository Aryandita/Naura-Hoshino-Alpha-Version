const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, parseEmoji } = require('discord.js');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('steal')
        .setDescription('Mencuri emoji custom untuk dimasukkan ke server ini')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuildExpressions)
        .addStringOption(opt => opt
            .setName('emoji')
            .setDescription('Ketik atau paste emoji custom yang ingin dicuri')
            .setRequired(true)
        )
        .addStringOption(opt => opt
            .setName('nama')
            .setDescription('Nama baru untuk emoji ini (Opsional)')
            .setRequired(false)
        ),

    async execute(interaction) {
        const rawEmoji = interaction.options.getString('emoji');
        const customName = interaction.options.getString('nama');

        // Fungsi bawaan Discord.js untuk membedah emoji (<a:nama:id> menjadi objek)
        const parsed = parseEmoji(rawEmoji);
        
        if (!parsed || !parsed.id) {
            return interaction.reply({ 
                embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${ui.getEmoji('error')} Itu bukan emoji custom yang valid!`)], 
                ephemeral: true 
            });
        }

        const extension = parsed.animated ? 'gif' : 'png';
        const emojiUrl = `https://cdn.discordapp.com/emojis/${parsed.id}.${extension}`;
        const emojiName = customName || parsed.name;

        await interaction.deferReply();

        try {
            // Menciptakan emoji baru di server
            const newEmoji = await interaction.guild.emojis.create({ attachment: emojiUrl, name: emojiName });

            const successEmbed = new EmbedBuilder()
                .setColor(ui.getColor('success'))
                .setTitle(`${ui.getEmoji('success')} Emoji Berhasil Dicuri!`)
                .setDescription(`Emoji ${newEmoji} telah ditambahkan ke server dengan nama **${newEmoji.name}**.`)
                .setThumbnail(emojiUrl);

            await interaction.editReply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Gagal mencuri emoji:', error);
            await interaction.editReply({ 
                embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${ui.getEmoji('error')} Gagal menambahkan emoji. Mungkin slot emoji server sudah penuh?`)] 
            });
        }
    }
};
