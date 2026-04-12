const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Menyiapkan path untuk file config mandiri
const configPath = path.join(__dirname, '../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('⚙️ Setup otomatis sistem server.')
    // ==========================================
    // 🔒 PENGAMANAN: HANYA ADMIN YANG BISA PAKAI
    // ==========================================
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
    .addSubcommand(subcommand =>
      subcommand
        .setName('tempvoice')
        .setDescription('🎧 Buat kategori dan channel otomatis untuk sistem Tempvoice.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('ticket')
        .setDescription('🎫 Buat kategori, role staf, dan channel log otomatis untuk sistem Tiket.'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('minecraft')
        .setDescription('🎮 Buat channel panel otomatis untuk status server Minecraft.')
        .addStringOption(option => 
            option.setName('ip')
            .setDescription('Alamat IP Server Minecraft')
            .setRequired(true))
        .addIntegerOption(option => 
            option.setName('port')
            .setDescription('Port Server (Opsional, Default: 25565)')
            .setRequired(false))
    ),

  async execute(interaction) {
    // Tampilkan loading karena bot butuh waktu untuk membuat banyak channel/role
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;

    // Memuat atau membuat config.json baru
    let config = { tempvoice: {}, ticket: {}, minecraft: {} };
    if (fs.existsSync(configPath)) {
        try { config = JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch (e) {}
    }

    // ==========================================
    // 🎧 AUTO SETUP TEMPVOICE
    // ==========================================
    if (subcommand === 'tempvoice') {
      try {
        // 1. Buat Kategori
        const category = await guild.channels.create({
            name: '🎧 TEMPVOICE SYSTEM',
            type: ChannelType.GuildCategory,
        });

        // 2. Buat Channel Suara Pemicu (Join to Create)
        const triggerChannel = await guild.channels.create({
            name: '➕ Join to Create',
            type: ChannelType.GuildVoice,
            parent: category.id,
        });

        // 3. Simpan ID ke Config
        config.tempvoice.enabled = true;
        config.tempvoice.triggerChannelId = triggerChannel.id;
        config.tempvoice.categoryId = category.id;
        config.tempvoice.panelEmbedColor = '#D8A8FB';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        return interaction.editReply({ content: `✅ **Setup Tempvoice Selesai!**\nBot telah membuat Kategori <#${category.id}> dan Channel <#${triggerChannel.id}> secara otomatis.`, flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error(error);
        return interaction.editReply({ content: '❌ Gagal melakukan setup. Pastikan bot memiliki izin "Manage Channels".', ephemeral: true });
      }
    } 
    
    // ==========================================
    // 🎫 AUTO SETUP TIKET
    // ==========================================
    else if (subcommand === 'ticket') {
      try {
        // 1. Buat Role Admin Tiket
        const adminRole = await guild.roles.create({
            name: '🎟️ Ticket Staff',
            color: FDBB44,
            reason: 'Role otomatis untuk mengurus sistem tiket',
        });

        // 2. Buat Kategori Tiket
        const category = await guild.channels.create({
            name: '🎫 TICKET SYSTEM',
            type: ChannelType.GuildCategory,
        });

        // 3. Buat Channel Log (Disembunyikan dari publik)
        const logChannel = await guild.channels.create({
            name: 'log-transkrip',
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.ViewChannel] }, // Sembunyikan dari @everyone
                { id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel] } // Tampilkan untuk Staff
            ]
        });

        // 4. Buat Channel untuk Panel Buka Tiket
        const panelChannel = await guild.channels.create({
            name: 'buka-tiket',
            type: ChannelType.GuildText,
            parent: category.id,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel] } // Publik tidak bisa chat
            ]
        });

        // 5. Simpan ID ke Config
        config.ticket.enabled = true;
        config.ticket.categoryId = category.id;
        config.ticket.logChannelId = logChannel.id;
        config.ticket.roleAdminId = adminRole.id;
        config.ticket.panelEmbedColor = '#FDBB44';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // 6. Kirim Panel UI ke Channel Buka Tiket
        const panelEmbed = new EmbedBuilder()
            .setColor('#FDBB44')
            .setAuthor({ name: '✦ P U S A T  B A N T U A N ✦', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle('Buka Tiket Dukungan')
            .setDescription(`Silakan tekan tombol di bawah ini untuk membuka tiket baru dan menghubungi staf kami.\n\nJangan membuat tiket palsu atau spam.`);

        const openTicketButton = new ButtonBuilder()
            .setCustomId('ticket_open')
            .setLabel('Buka Tiket 📧')
            .setStyle(ButtonStyle.Primary);

        const row = new ActionRowBuilder().addComponents(openTicketButton);
        await panelChannel.send({ embeds: [panelEmbed], components: [row] });

        return interaction.editReply({ content: `✅ **Setup Tiket Selesai!**\nBot telah membuat Kategori, Role <@&${adminRole.id}>, Channel Panel <#${panelChannel.id}>, dan Channel Log secara otomatis.`, flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error(error);
        return interaction.editReply({ content: '❌ Gagal melakukan setup. Pastikan bot memiliki izin "Manage Channels" dan "Manage Roles".', flags: MessageFlags.Ephemeral });
      }
    }

    // ==========================================
    // 🎮 AUTO SETUP MINECRAFT PANEL
    // ==========================================
    else if (subcommand === 'minecraft') {
      try {
        const ip = interaction.options.getString('ip');
        const port = interaction.options.getInteger('port') || 25565;

        // 1. Buat Channel Khusus Panel Minecraft
        const mcChannel = await guild.channels.create({
            name: 'status-minecraft',
            type: ChannelType.GuildText,
            permissionOverwrites: [
                { id: guild.id, deny: [PermissionFlagsBits.SendMessages], allow: [PermissionFlagsBits.ViewChannel] }
            ]
        });

        // 2. Simpan Data ke Config
        config.minecraft.ip = ip;
        config.minecraft.port = port;
        config.minecraft.panelEmbedColor = '#3EFC54';
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

        // 3. Kirim Panel Awal
        const statusEmbed = new EmbedBuilder()
            .setColor('#3EFC54')
            .setAuthor({ name: '✦ M I N E C R A F T  S T A T U S  ✦', iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(`🎮 Server: ${ip}`)
            .setDescription('Klik tombol **Perbarui** di bawah untuk memuat dan menyegarkan status server saat ini.')
            .addFields({ name: '🌐 IP / Port', value: `\`${ip}:${port}\``, inline: true });

        const refreshButton = new ButtonBuilder()
            .setCustomId('mc_refresh')
            .setLabel('Perbarui Status 🔄')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(refreshButton);
        await mcChannel.send({ embeds: [statusEmbed], components: [row] });

        return interaction.editReply({ content: `✅ **Setup Minecraft Selesai!**\nChannel Panel <#${mcChannel.id}> telah dibuat untuk server \`${ip}\`.`, flags: MessageFlags.Ephemeral });
      } catch (error) {
        console.error(error);
        return interaction.editReply({ content: '❌ Gagal melakukan setup. Pastikan bot memiliki izin "Manage Channels".', flags: MessageFlags.Ephemeral });
      }
    }
  },
};