const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, AttachmentBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, ButtonBuilder, ButtonStyle } = require('discord.js');
const UserProfile = require('../../models/UserProfile');
const env = require('../../config/env');
const ui = require('../../config/ui');
const { CanvasUtils } = require('../../utils/Canvas');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('premium')
        .setDescription('💎 [OWNER ONLY] Kelola sistem V.I.P Premium Naura.')
        .addSubcommand(sub => sub.setName('add').setDescription('Tambahkan status premium ke user.')
            .addUserOption(opt => opt.setName('user').setDescription('Pilih user').setRequired(true))
            .addIntegerOption(opt => opt.setName('days').setDescription('Lama premium dalam hari').setRequired(true).setMinValue(1)))
        .addSubcommand(sub => sub.setName('remove').setDescription('Cabut status premium user.')
            .addUserOption(opt => opt.setName('user').setDescription('Pilih user').setRequired(true)))
        .addSubcommand(sub => sub.setName('check').setDescription('Cek status premium kamu atau orang lain.')
            .addUserOption(opt => opt.setName('user').setDescription('Pilih user (Opsional)')))
        .addSubcommand(sub => sub.setName('info').setDescription('Lihat profil premium dan daftar harga V.I.P.')),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand(false) || 'info';
        const eSuccess = ui.getEmoji('success') || '✅';
        const eError = ui.getEmoji('error') || '❌';

        // Cek Otoritas Owner untuk add dan remove
        if (['add', 'remove'].includes(subcommand)) {
            if (!env.OWNER_IDS.includes(interaction.user.id)) {
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error') || '#FF0000').setDescription(`${eError} | Akses Ditolak! Hanya Master Aryan (Developer) yang dapat mengatur status V.I.P.`)] });
            }
        }

        const targetUser = interaction.options.getUser('user') || interaction.user;
        let [profile] = await UserProfile.findOrCreate({ where: { userId: targetUser.id } });

        if (subcommand === 'add') {
            const days = interaction.options.getInteger('days');
            const newExpiry = new Date();

            // Jika sudah premium dan belum kadaluarsa, tambahkan durasi dari sisa waktu sebelumnya
            if (profile.isPremium && profile.premiumUntil && profile.premiumUntil > new Date()) {
                newExpiry.setTime(profile.premiumUntil.getTime() + (days * 24 * 60 * 60 * 1000));
            } else {
                newExpiry.setDate(newExpiry.getDate() + days);
            }

            profile.isPremium = true;
            profile.premiumUntil = newExpiry;
            await profile.save();

            const embed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💎 V.I.P Premium Granted!')
                .setDescription(`${eSuccess} | Pengguna **${targetUser.username}** kini telah menjadi member **Premium** Naura!\n\n⏳ **Berlaku Sampai:** <t:${Math.floor(newExpiry.getTime() / 1000)}:F>`)
                .setThumbnail(targetUser.displayAvatarURL());

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'remove') {
            profile.isPremium = false;
            profile.premiumUntil = null;
            await profile.save();

            const embed = new EmbedBuilder()
                .setColor(ui.getColor('error') || '#FF0000')
                .setDescription(`${eSuccess} | Status Premium untuk **${targetUser.username}** telah dicabut.`);

            return interaction.editReply({ embeds: [embed] });
        }

        if (subcommand === 'check') {
            if (profile.isPremium && profile.premiumUntil && profile.premiumUntil > new Date()) {
                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setAuthor({ name: '💎 Status V.I.P Premium', iconURL: targetUser.displayAvatarURL() })
                    .setDescription(`Hai, **${targetUser.username}** adalah member **Premium Eksklusif**!\n\n⏳ **Berakhir Pada:** <t:${Math.floor(profile.premiumUntil.getTime() / 1000)}:R>\n\nNikmati fitur tanpa batas seperti \`/ai imagine\`, Gaji Mingguan, Mode 24/7 Musik, dan Kartu Profil Emas!`);
                return interaction.editReply({ embeds: [embed] });
            } else {
                // Hapus status jika ternyata sudah expired (Lazy expiry)
                if (profile.isPremium && profile.premiumUntil && profile.premiumUntil <= new Date()) {
                    profile.isPremium = false;
                    profile.premiumUntil = null;
                    await profile.save();
                }

                const embed = new EmbedBuilder()
                    .setColor(ui.getColor('primary') || '#00d9ff')
                    .setAuthor({ name: '👤 Status Reguler', iconURL: targetUser.displayAvatarURL() })
                    .setDescription(`**${targetUser.username}** saat ini menggunakan status **Reguler**.\n\nDapatkan status Premium untuk membuka fitur-fitur eksklusif Naura Hoshino!`);
                return interaction.editReply({ embeds: [embed] });
            }
        }

        if (subcommand === 'info') {
            const isPremium = profile.isPremium && profile.premiumUntil && profile.premiumUntil > new Date();
            let daysLeft = 0;
            if (isPremium) {
                daysLeft = Math.ceil((profile.premiumUntil.getTime() - new Date().getTime()) / (1000 * 3600 * 24));
            }

            let imageBuffer;
            try {
                const canvas = await CanvasUtils.generatePremiumInfoCard(targetUser, isPremium, daysLeft);
                imageBuffer = canvas.encodeSync ? canvas.encodeSync('png') : canvas.toBuffer('image/png');
            } catch (error) {
                return interaction.editReply({ content: '❌ Gagal memuat grafis Canvas promo.' });
            }

            const attachment = new AttachmentBuilder(imageBuffer, { name: 'premium-info.png' });

            const embed = new EmbedBuilder()
                .setColor(isPremium ? '#FFD700' : (ui.getColor('primary') || '#00d9ff'))
                .setTitle('💎 Naura V.I.P Subscription')
                .setImage('attachment://premium-info.png')
                .setDescription(`Tingkatkan pengalamanmu di server dengan fitur super eksklusif!\n\nSilakan pilih **Paket Penawaran** dari menu di bawah ini untuk melihat detail harga, metode pembayaran, dan rincian fitur dewa yang akan kamu dapatkan.`)
                .setFooter({ text: 'Terima kasih atas dukunganmu ke Naura Project!' });

            const row = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('premium_tier_select')
                    .setPlaceholder('Pilih Paket Langganan...')
                    .addOptions([
                        {
                            label: '🌟 Paket Bronze (1 Bulan)',
                            description: 'Akses penuh selama 30 Hari',
                            value: 'tier_1',
                            emoji: '🌟'
                        },
                        {
                            label: '💫 Paket Silver (3 Bulan)',
                            description: 'Hemat lebih banyak untuk 90 Hari',
                            value: 'tier_3',
                            emoji: '💫'
                        },
                        {
                            label: '👑 Paket Gold (Permanen)',
                            description: 'Sekali bayar, fitur V.I.P selamanya',
                            value: 'tier_perm',
                            emoji: '👑'
                        }
                    ])
            );

            const messageObj = await interaction.editReply({ embeds: [embed], files: [attachment], components: [row] });

            // Collector setup
            const collector = messageObj.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

            collector.on('collect', async i => {
                // Ensure only the user who ran the command can use the dropdown
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: '❌ Menu ini hanya untuk pemanggil perintah.', ephemeral: true });
                }

                const selected = i.values[0];
                let priceText = '';
                let tierName = '';

                if (selected === 'tier_1') {
                    tierName = '🌟 Naura Supporter (1 Bulan)';
                    priceText = 'Rp 35.000 / 30 Hari';
                } else if (selected === 'tier_3') {
                    tierName = '💫 Naura Friends (6 Bulan)';
                    priceText = 'Rp 50.000 / 180 Hari';
                } else if (selected === 'tier_perm') {
                    tierName = '👑 Naura Bestie (1 Tahun)';
                    priceText = 'Rp 75.000 / 365 Hari'
                }

                const updatedEmbed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`💎 Rincian V.I.P: ${tierName}`)
                    .setImage('attachment://premium-info.png')
                    .setDescription(`**Harga:** \`${priceText}\`\n\n**🔥 Keuntungan Eksklusif:**\n⭐ **2x Global XP Boost** – Naik level 2x lipat lebih cepat di server manapun!\n🎨 **AI Image Studio** – Akses tak terbatas ke \`/ai imagine\` untuk kreasi AI.\n🎶 **Mode Radio 24/7** – Aktifkan mode siaga \`/music 247\` tanpa batas.\n🎡 **Gaji Mingguan** – Putar roda nasib puluhan ribu koin di \`/economy weekly\`!\n👑 **Kartu Emas Spesial** – \`/rank\` berubah menjadi *Gold Glow* dengan lencana V.I.P!\n\n💳 **Metode Pembayaran:**\nTekan tombol **Beli Sekarang** di bawah untuk diarahkan ke halaman pembayaran!`)
                    .setFooter({ text: 'Naura V.I.P Project' });

                // Tombol Beli Sekarang dengan URL Placeholder
                const btnRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setLabel('Beli Sekarang')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://saweria.co/Aryandita')
                        .setEmoji('🛒')
                );

                await i.update({ embeds: [updatedEmbed], components: [row, btnRow] });
            });

            collector.on('end', () => {
                // Nonaktifkan menu setelah 1 menit
                row.components[0].setDisabled(true);
                // Jika ada tombol beli, kita biarkan saja (atau hapus, lebih baik biarkan disable menu saja)
                interaction.editReply({ components: [row] }).catch(() => { });
            });

            return;
        }
    },

    async executePrefix(message, args, client) {
        if (!args || args.length === 0) return message.reply("Gunakan `/premium` untuk GUI interaktif atau `n!premium check`.");

        const subcommand = args[0].toLowerCase();
        const eError = ui.getEmoji('error') || '❌';

        if (['add', 'remove'].includes(subcommand) && !env.OWNER_IDS.includes(message.author.id)) {
            return message.reply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error') || '#FF0000').setDescription(`${eError} | Akses Ditolak! Hanya Developer yang dapat mengatur status V.I.P.`)] });
        }

        const targetUser = message.mentions.users.first() || message.author;
        let [profile] = await UserProfile.findOrCreate({ where: { userId: targetUser.id } });

        if (subcommand === 'add') {
            if (!args[1] || !message.mentions.users.first()) return message.reply("Format salah: `n!premium add @user <hari>`");
            const days = parseInt(args[args.length - 1]);
            if (isNaN(days) || days < 1) return message.reply("Jumlah hari tidak valid.");

            const newExpiry = new Date();
            if (profile.isPremium && profile.premiumUntil && profile.premiumUntil > new Date()) {
                newExpiry.setTime(profile.premiumUntil.getTime() + (days * 24 * 60 * 60 * 1000));
            } else {
                newExpiry.setDate(newExpiry.getDate() + days);
            }

            profile.isPremium = true;
            profile.premiumUntil = newExpiry;
            await profile.save();

            return message.reply({ embeds: [new EmbedBuilder().setColor('#FFD700').setDescription(`💎 | Pengguna **${targetUser.username}** resmi menjadi **Premium** sampai <t:${Math.floor(newExpiry.getTime() / 1000)}:R>!`)] });
        }

        if (subcommand === 'remove') {
            profile.isPremium = false;
            profile.premiumUntil = null;
            await profile.save();
            return message.reply(`✅ Status premium **${targetUser.username}** telah dicabut.`);
        }

        if (subcommand === 'check') {
            if (profile.isPremium && profile.premiumUntil && profile.premiumUntil > new Date()) {
                return message.reply({ embeds: [new EmbedBuilder().setColor('#FFD700').setDescription(`💎 **${targetUser.username}** adalah member **Premium** (Berakhir <t:${Math.floor(profile.premiumUntil.getTime() / 1000)}:R>).`)] });
            } else {
                return message.reply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00d9ff').setDescription(`👤 **${targetUser.username}** adalah member reguler.`)] });
            }
        }
    }
};
