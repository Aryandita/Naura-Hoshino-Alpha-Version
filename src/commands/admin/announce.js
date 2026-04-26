const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder, 
    EmbedBuilder, 
    ChannelType 
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('📢 [ADMIN] Kirim pengumuman custom dengan Embed elegan.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addChannelOption(opt => 
            opt.setName('channel')
            .setDescription('Pilih channel tempat pengumuman akan dikirim')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(true)
        ),

    async execute(interaction) {
        // 1. Ambil target channel dari opsi command
        const targetChannel = interaction.options.getChannel('channel');

        // 2. Buat Form Modal (Pop-up)
        const modal = new ModalBuilder()
            .setCustomId(`announceModal_${targetChannel.id}`) // Menyisipkan ID channel agar mudah diambil nanti
            .setTitle('Buat Pengumuman Custom');

        // 3. Buat Kolom Input untuk Judul
        const titleInput = new TextInputBuilder()
            .setCustomId('announceTitle')
            .setLabel('Judul Pengumuman')
            .setStyle(TextInputStyle.Short) // Input pendek (1 baris)
            .setPlaceholder('Contoh: Update Server v2.0!')
            .setMaxLength(256)
            .setRequired(true);

        // 4. Buat Kolom Input untuk Deskripsi
        const descInput = new TextInputBuilder()
            .setCustomId('announceDesc')
            .setLabel('Isi Pengumuman (Mendukung Garis Baru/Enter)')
            .setStyle(TextInputStyle.Paragraph) // Input panjang (multi-baris)
            .setPlaceholder('Ketik isi pengumuman di sini...')
            .setMaxLength(4000)
            .setRequired(true);

        // 5. Buat Kolom Input untuk Warna Embed (Opsional)
        const colorInput = new TextInputBuilder()
            .setCustomId('announceColor')
            .setLabel('Kode Warna Hex (Opsional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Contoh: #FF0000 atau biarkan kosong')
            .setMaxLength(7)
            .setRequired(false);

        // 6. Buat Kolom Input untuk URL Gambar (Opsional)
        const imageInput = new TextInputBuilder()
            .setCustomId('announceImage')
            .setLabel('URL Gambar / Banner (Opsional)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://contoh.com/gambar.png')
            .setRequired(false);

        // Tambahkan setiap input ke dalam ActionRow (Syarat wajib Discord)
        const row1 = new ActionRowBuilder().addComponents(titleInput);
        const row2 = new ActionRowBuilder().addComponents(descInput);
        const row3 = new ActionRowBuilder().addComponents(colorInput);
        const row4 = new ActionRowBuilder().addComponents(imageInput);

        // Masukkan semua baris ke dalam Modal
        modal.addComponents(row1, row2, row3, row4);

        // 7. Tampilkan Modal ke Admin
        await interaction.showModal(modal);

        // 8. Tunggu Admin mengisi dan mengirim formulir (Waktu tunggu: 5 Menit)
        const filter = (i) => i.customId === `announceModal_${targetChannel.id}` && i.user.id === interaction.user.id;

        try {
            const modalSubmit = await interaction.awaitModalSubmit({ filter, time: 300000 }); // 300.000 ms = 5 menit

            // Ambil data yang diketik Admin
            const title = modalSubmit.fields.getTextInputValue('announceTitle');
            const desc = modalSubmit.fields.getTextInputValue('announceDesc');
            const color = modalSubmit.fields.getTextInputValue('announceColor') || '#00FFFF'; // Jika kosong, gunakan warna Cyan
            const imageUrl = modalSubmit.fields.getTextInputValue('announceImage');

            // Validasi apakah kode warna Hex valid
            const hexRegex = /^#([0-9A-F]{3}){1,2}$/i;
            const finalColor = hexRegex.test(color) ? color : '#00FFFF';

            // 9. Rangkai pesan Embed
            const embed = new EmbedBuilder()
                .setTitle(title)
                .setDescription(desc)
                .setColor(finalColor)
                .setAuthor({ name: interaction.guild.name, iconURL: interaction.guild.iconURL() })
                .setFooter({ text: `Announcement by ${interaction.user.tag}`, iconURL: interaction.user.displayAvatarURL() })
                .setTimestamp();

            // Jika Admin memasukkan link gambar, pasang di embed
            if (imageUrl && imageUrl.startsWith('http')) {
                embed.setImage(imageUrl);
            }

            // 10. Kirim pesan ke channel yang dipilih di awal
            await targetChannel.send({ embeds: [embed] });

            // 11. Balas interaksi modal (Wajib agar tidak error "Interaction Failed")
            await modalSubmit.reply({ content: `✅ Pengumuman yang sangat rapi berhasil dikirim ke <#${targetChannel.id}>!`, ephemeral: true });

        } catch (err) {
            // Error ini akan terpanggil jika Admin membatalkan modal (klik di luar kotak) atau timeout lebih dari 5 menit
            if (err.code !== 'InteractionCollectorError') {
                console.error('[Announce Error]:', err);
            }
        }
    }
};
