const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ui = require('../../config/ui'); // Path sudah sesuai untuk dalam folder src/commands/owner/

module.exports = {
    data: new SlashCommandBuilder()
        .setName('system')
        .setDescription('🛠️ (Owner Only) Perintah kontrol inti Naura Hoshino.')
        .addSubcommand(sub => 
            sub.setName('restart')
                .setDescription('Mematikan dan menyalakan ulang sistem bot.'))
        .addSubcommand(sub => 
            sub.setName('status')
                .setDescription('Cek status memori dan server hosting.')),

    async execute(interaction) {
        // 🔒 KEAMANAN OWNER ONLY
        if (interaction.user.id !== process.env.OWNER_ID && !process.env.OWNER_IDS.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: `${ui.emojis.error} Akses ditolak! Perintah ini khusus untuk bosku, Aryandita.`, 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'restart') {
            await interaction.reply({ content: `${ui.emojis.loading} Mematikan mesin... Naura akan segera kembali!`, ephemeral: true });
            // process.exit(1) akan mematikan node. 
            // Panel Pterodactyl/PM2 kamu akan otomatis menyalakannya kembali dalam 3-5 detik.
            process.exit(1); 
        }

        if (subcommand === 'status') {
            const ramUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);
            const totalRam = (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2);
            
            const embed = new EmbedBuilder()
                .setColor(ui.colors.tech || '#00FFFF')
                .setTitle('⚙️ System Status')
                .addFields(
                    { name: '💾 RAM Usage', value: `\`${ramUsage} MB / ${totalRam} MB\``, inline: true },
                    { name: '⏱️ Uptime', value: `<t:${Math.floor((Date.now() - interaction.client.uptime) / 1000)}:R>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    }
};
