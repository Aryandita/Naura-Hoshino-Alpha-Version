const { SlashCommandBuilder, AttachmentBuilder } = require('discord.js');
const UserProfile = require('../../models/UserProfile');
const { generateMusicProfileImage } = require('../../utils/canvasHelper');
const { logError } = require('../../managers/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('musicprofile')
        .setDescription('🎵 Menampilkan kartu statistik pendengaran audio Naura Anda.')
        .addUserOption(opt => 
            opt.setName('user')
                .setDescription('Pilih pengguna untuk melihat profil musiknya')
                .setRequired(false)
        ),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;

        // Jangan proses bot
        if (targetUser.bot) {
            return interaction.reply({ content: 'Bot tidak memiliki profil musik.', ephemeral: true });
        }

        // Tampilkan 'Naura sedang merender gambar...'
        await interaction.deferReply();

        try {
            // 1. Ambil data dari Database MySQL
            // Sequelize akan menggunakan model yang sudah kita update
            const [profile] = await UserProfile.findOrCreate({ where: { userId: targetUser.id } });

            // 2. Generate Gambar Kartu menggunakan Utilitas Canvas kita
            const stats = {
                tracksListened: profile.music_tracksListened,
                totalDurationMs: profile.music_totalDurationMs,
                lastListened: profile.music_lastListened
            };
            
            // Generate kartu
            const imageBuffer = await generateMusicProfileImage(
                targetUser, 
                stats, 
                interaction.client.user.displayAvatarURL({ extension: 'png' })
            );

            // 3. Buat lampiran file gambar
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'naura-music-profile.png' });

            // 4. Kirim hasil gambar
            await interaction.editReply({ files: [attachment] });

        } catch (error) {
            logError('MusicProfile Command Canvas Error', error);
            await interaction.editReply({ content: 'Terjadi kesalahan internal saat merender kartu profil Anda.' });
        }
    }
};
