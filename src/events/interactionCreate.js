const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionsBitField } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const config = require('../config.json');

module.exports = async (client, interaction) => {
    if (!interaction.isButton()) return;

    // --- LOGIKA MEMBUAT TIKET ---
    if (interaction.customId === 'ticket_create') {
        const ticketConfig = config.ticket;
        if (!ticketConfig.enabled) return interaction.reply({ content: 'Sistem tiket sedang dinonaktifkan.', ephemeral: true });

        // Cek apakah user sudah punya tiket yang terbuka (opsional, untuk mencegah spam)
        const existingChannel = interaction.guild.channels.cache.find(c => c.name === `ticket-${interaction.user.username.toLowerCase()}`);
        if (existingChannel) {
            return interaction.reply({ content: `Anda sudah memiliki tiket yang terbuka di <#${existingChannel.id}>`, ephemeral: true });
        }

        try {
            // Membuat Text Channel baru
            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                parent: ticketConfig.categoryId,
                permissionOverwrites: [
                    {
                        id: interaction.guild.id, // @everyone role
                        deny: [PermissionsBitField.Flags.ViewChannel], // Sembunyikan dari publik
                    },
                    {
                        id: interaction.user.id, // User yang membuat tiket
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles],
                    },
                    {
                        id: ticketConfig.roleAdminId, // Role Admin Support
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    }
                ]
            });

            const welcomeEmbed = new EmbedBuilder()
                .setColor('#FDBB44')
                .setTitle(`Tiket Bantuan: ${interaction.user.username}`)
                .setDescription(`Halo <@${interaction.user.id}>! Silakan jelaskan masalah Anda. Admin akan segera membantu.`);

            const closeButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('Tutup Tiket (Simpan Transkrip)')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Danger)
            );

            await ticketChannel.send({ 
                content: `<@${interaction.user.id}> | <@&${ticketConfig.roleAdminId}>`, 
                embeds: [welcomeEmbed], 
                components: [closeButton] 
            });

            await interaction.reply({ content: `Tiket Anda berhasil dibuat: <#${ticketChannel.id}>`, ephemeral: true });
        } catch (error) {
            console.error('Gagal membuat tiket:', error);
            interaction.reply({ content: 'Terjadi kesalahan saat membuat tiket.', ephemeral: true });
        }
    }

    // --- LOGIKA MENUTUP TIKET ---
    if (interaction.customId === 'ticket_close') {
        const channel = interaction.channel;
        
        await interaction.reply({ content: 'Mempersiapkan transkrip dan menutup tiket dalam 5 detik...' });

        // Membuat file transkrip HTML
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1, // Ambil semua pesan
            returnType: 'attachment', // Mengembalikan objek AttachmentBuilder Discord
            filename: `${channel.name}-transcript.html`,
            saveImages: true,
            poweredBy: false
        });

        // Kirim transkrip ke channel Log
        const logChannel = interaction.guild.channels.cache.get(config.ticket.logChannelId);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setTitle('📑 Tiket Ditutup')
                .setColor('#FF0000')
                .addFields(
                    { name: 'Ditutup Oleh', value: `<@${interaction.user.id}>`, inline: true },
                    { name: 'Nama Channel', value: channel.name, inline: true }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed], files: [attachment] });
        }

        // Hapus channel setelah 5 detik
        setTimeout(() => {
            channel.delete().catch(console.error);
        }, 5000);
    }
};
