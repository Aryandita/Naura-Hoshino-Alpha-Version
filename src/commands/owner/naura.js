/**
 * @namespace: src/commands/owner/naura.js
 * @type: Command
 * @copyright © 2026 Aryandita Praftian
 * @assistant Naura Hoshino
 * @version 1.5.0
 * @description Super-Command eksklusif untuk Developer (Control Panel). Terintegrasi dengan fitur Ryaa Gen 1.
 */

const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, codeBlock, ChannelType, ActivityType } = require('discord.js');
const util = require('util');
const { sequelize } = require('../../managers/dbManager'); 
const UserProfile = require('../../models/UserProfile');
const GuildSettings = require('../../models/GuildSettings');
const env = require('../../config/env');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('naura')
        .setDescription('👑 [DEVELOPER ONLY] Pusat Kontrol Sistem Utama Naura Hoshino.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        
        // 🛠️ SUBCOMMAND: EVAL (Live Code Execution)
        .addSubcommand(sub => 
            sub.setName('eval')
               .setDescription('Eksekusi kode JavaScript secara real-time.')
               .addStringOption(opt => opt.setName('code').setDescription('Kode JS yang akan dieksekusi').setRequired(true))
        )

        // 🗄️ SUBCOMMAND: SQL (Live Database Query)
        .addSubcommand(sub => 
            sub.setName('sql')
               .setDescription('Jalankan query MySQL murni ke database Naura.')
               .addStringOption(opt => opt.setName('query').setDescription('Perintah SQL').setRequired(true))
        )

        // 🚧 SUBCOMMAND: MAINTENANCE (Global Lockdown)
        .addSubcommand(sub => 
            sub.setName('maintenance')
               .setDescription('Aktifkan/Matikan mode perbaikan global (Lockdown).')
               .addBooleanOption(opt => opt.setName('status').setDescription('Pilih True (Aktif) atau False (Mati)').setRequired(true))
        )

        // 💎 SUBCOMMAND GROUP: PREMIUM
        .addSubcommandGroup(group => 
            group.setName('premium')
                 .setDescription('Manajemen status Premium User/Guild')
                 .addSubcommand(sub => 
                     sub.setName('add')
                        .setDescription('Berikan akses Premium ke pengguna.')
                        .addUserOption(opt => opt.setName('user').setDescription('Pilih User').setRequired(true))
                 )
                 .addSubcommand(sub => 
                     sub.setName('remove')
                        .setDescription('Cabut akses Premium dari pengguna.')
                        .addUserOption(opt => opt.setName('user').setDescription('Pilih User').setRequired(true))
                 )
        )

        // 🔄 SUBCOMMAND: RELOAD (Hot-Reload Commands)
        .addSubcommand(sub => 
            sub.setName('reload')
               .setDescription('Memuat ulang file command tanpa mematikan bot.')
               .addStringOption(opt => opt.setName('command').setDescription('Nama command (contoh: ping)').setRequired(true))
        )
        
        // ==========================================
        // 🔥 INTEGRASI RYAA (GEN 1) COMMANDS
        // ==========================================

        // 🔄 SYSTEM CONTROL 
        .addSubcommand(sub => sub.setName('restart').setDescription('Membuka panel konfirmasi untuk merestart sistem Naura secara paksa.')) 
        .addSubcommand(sub => sub.setName('setpfp').setDescription('Mengganti foto profil global Naura.') 
            .addAttachmentOption(opt => opt.setName('gambar').setDescription('Upload gambar avatar').setRequired(true))) 
        .addSubcommand(sub => sub.setName('setactivity').setDescription('Mengubah status aktivitas (Presence) Naura.') 
            .addStringOption(opt => opt.setName('tipe').setDescription('Tipe aktivitas').setRequired(true).addChoices({ name: 'Playing', value: 'Playing' }, { name: 'Watching', value: 'Watching' }, { name: 'Listening', value: 'Listening' }, { name: 'Streaming', value: 'Streaming' })) 
            .addStringOption(opt => opt.setName('teks').setDescription('Teks aktivitas (Bermain ... / Menonton ...)').setRequired(true))) 
        
        // 🧠 AI VOICE CONTROL 
        .addSubcommand(sub => sub.setName('aivoice').setDescription('👑 Toggle mode obrolan suara AI (Hanya Aryandita).') 
            .addBooleanOption(opt => opt.setName('status').setDescription('Pilih True untuk menyalakan, False untuk mematikan').setRequired(true)))
            
        // 📢 GLOBAL ANNOUNCEMENT 
        .addSubcommand(sub => sub.setName('announce').setDescription('Kirim pengumuman massal ke seluruh server Naura.') 
            .addStringOption(opt => opt.setName('pesan').setDescription('Isi pesan broadcast').setRequired(true)))
            
        // 💰 GOD MODE: DATA CONTROL 
        .addSubcommandGroup(group =>
            group.setName('godmode')
                 .setDescription('Manajemen paksa data pengguna (Economy & Birthday)')
                 .addSubcommand(sub => sub.setName('eco_reset').setDescription('⚠ Mereset total (hapus koin, level, item) pengguna target.') 
                    .addUserOption(opt => opt.setName('target').setDescription('Pilih pengguna yang ingin direset').setRequired(true))) 
                 .addSubcommand(sub => sub.setName('eco_set').setDescription('👑 Mengubah jumlah saldo pengguna target secara paksa.') 
                    .addUserOption(opt => opt.setName('target').setDescription('Pilih pengguna').setRequired(true)) 
                    .addStringOption(opt => opt.setName('tipe').setDescription('Pilih jenis uang').setRequired(true).addChoices({ name: 'Dompet Tunai', value: 'balance' }, { name: 'Rekening Bank', value: 'bank' })) 
                    .addIntegerOption(opt => opt.setName('jumlah').setDescription('Jumlah uang (bisa minus)').setRequired(true))) 
                 .addSubcommand(sub => sub.setName('reset_bday').setDescription('👑 Mereset data ulang tahun pengguna target (Anti-Abuse).') 
                    .addUserOption(opt => opt.setName('target').setDescription('Pilih pengguna yang akan direset').setRequired(true)))
        )
            
        // ⚙️ GUILD SETUP OVERRIDE
        .addSubcommandGroup(group =>
            group.setName('guild')
                 .setDescription('Atur konfigurasi server secara paksa via jalur belakang.')
                 .addSubcommand(sub => sub.setName('setup_minecraft').setDescription('Setup status server Minecraft.') 
                    .addStringOption(opt => opt.setName('ip').setDescription('IP Server Minecraft').setRequired(true)) 
                    .addIntegerOption(opt => opt.setName('port').setDescription('Port (Default 25565)').setRequired(false))) 
                 .addSubcommand(sub => sub.setName('setup_sticky').setDescription('Setup pesan lengket (Sticky Message).') 
                    .addChannelOption(opt => opt.setName('channel').setDescription('Channel target').addChannelTypes(ChannelType.GuildText).setRequired(true)) 
                    .addStringOption(opt => opt.setName('pesan').setDescription('Isi pesan').setRequired(true))) 
                 .addSubcommand(sub => sub.setName('setup_announcement').setDescription('Setup channel pengumuman otomatis (Welcome/Logs).') 
                    .addChannelOption(opt => opt.setName('channel').setDescription('Channel pengumuman').addChannelTypes(ChannelType.GuildText).setRequired(true))) 
                 .addSubcommand(sub => sub.setName('setup_autorole').setDescription('Setup role otomatis saat member bergabung.') 
                    .addRoleOption(opt => opt.setName('role').setDescription('Pilih Role').setRequired(true))) 
                 .addSubcommand(sub => sub.setName('setup_autoreply').setDescription('Setup balasan teks otomatis (Auto-Responder).') 
                    .addStringOption(opt => opt.setName('trigger').setDescription('Kata pemicu').setRequired(true)) 
                    .addStringOption(opt => opt.setName('response').setDescription('Balasan dari bot').setRequired(true)))
        ),

    async execute(interaction) {
        // 🔒 KEAMANAN GANDA: Pastikan hanya Developer Aryan yang bisa mengakses (Memanfaatkan OWNER_ID dari env)
        const OWNER_ID = env.OWNER_ID ? String(env.OWNER_ID).replace(/['"]/g, '').trim() : (env.OWNER_IDS && env.OWNER_IDS.length > 0 ? env.OWNER_IDS[0] : null);

        if (interaction.user.id !== OWNER_ID && (!env.OWNER_IDS || !env.OWNER_IDS.includes(interaction.user.id))) {
            return interaction.reply({ 
                content: `<:FailedError:1488423486920851566> **Hmph! Akses Ditolak!**\nHanya *Master Aryandita* (Penciptaku) yang berhak memegang panel kontrol ini.`, 
                ephemeral: true 
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const group = interaction.options.getSubcommandGroup(false);
        const guildId = interaction.guildId;

        // Jangan defer jika subcommand adalah 'restart' karena butuh Collector interaktif yang cepat
        if (subcommand !== 'restart') {
            await interaction.deferReply({ ephemeral: true });
        }

        let guildData = await GuildSettings.findOne({ where: { guildId: guildId } }); 
        if (!guildData) guildData = new GuildSettings({ guildId: guildId });

        try {
            // ==========================================
            // 🔄 ROUTING LAMA (NAURA CORE)
            // ==========================================
            if (subcommand === 'eval') return await handleEval(interaction);
            if (subcommand === 'sql') return await handleSql(interaction);
            if (subcommand === 'maintenance') return await handleMaintenance(interaction);
            if (subcommand === 'reload') return await handleReload(interaction);
            
            if (group === 'premium') {
                if (subcommand === 'add') return await handlePremium(interaction, true);
                if (subcommand === 'remove') return await handlePremium(interaction, false);
            }

            // ==========================================
            // 🔥 ROUTING BARU (RYAA INTEGRATION)
            // ==========================================
            const embedSuccess = new EmbedBuilder().setColor(ui.getColor('accent') || '#FF69B4');

            // 🧠 AI VOICE CONTROL
            if (subcommand === 'aivoice') { 
                const status = interaction.options.getBoolean('status'); 
                guildData.aiVoiceEnabled = status; 
                await guildData.save();

                const stateText = status ? '🟢 **DIHIDUPKAN**' : '🔴 **DIMATIKAN**'; 
                const descText = status 
                    ? 'Sistem pendengaran dan pita suara AI Naura telah aktif. Naura akan merespons obrolan suara di Voice Channel.' 
                    : 'Naura kembali ke mode pemutar musik normal. Pemrosesan suara dihentikan.';

                return interaction.editReply({ embeds: [embedSuccess.setAuthor({ name: 'Sistem Pusat Hoshino', iconURL: interaction.client.user.displayAvatarURL() }).setDescription(`👑 **MODE AI VOICE:** ${stateText}\n\n> *${descText}*`)] }); 
            }

            // 🔄 RESTART CONFIRMATION 
            if (subcommand === 'restart') { 
                await interaction.deferReply({ ephemeral: true }); // Defer untuk restart khusus
                
                // Jika UI config memiliki embeds/components untuk restart, pakai itu. Jika tidak, pakai fallback.
                const fallbackEmbed = new EmbedBuilder().setColor('#FF0000').setTitle('⚠️ Konfirmasi Restart Sistem').setDescription('Apakah kamu yakin ingin merestart mesin Naura? Semua proses yang sedang berjalan akan dihentikan.');
                const fallbackMenu = { type: 1, components: [{ type: 3, custom_id: 'restart_menu', options: [{ label: 'Konfirmasi Restart', value: 'confirm_restart', emoji: '✅' }, { label: 'Batalkan', value: 'cancel_restart', emoji: '❌' }] }] };
                
                const rEmbed = ui.embeds?.restartConfirm || fallbackEmbed;
                const rComp = ui.components?.restartMenu || fallbackMenu;

                const replyMsg = await interaction.editReply({ 
                    embeds: [rEmbed], 
                    components: [rComp] 
                });

                const collector = replyMsg.createMessageComponentCollector({ time: 60000 });

                collector.on('collect', async i => { 
                    if (i.user.id !== interaction.user.id) return i.reply({ content: '<:FailedError:1488423486920851566> Menu ini terkunci!', ephemeral: true });
                    const choice = i.values[0];

                    if (choice === 'confirm_restart') { 
                        await i.update({ embeds: [new EmbedBuilder().setColor('#FF69B4').setDescription('<:Restart:1484706091941232815> **Sistem Memulai Ulang...**\nMemori dibersihkan. Naura akan segera kembali!')], components: [] }); 
                        process.exit(0); 
                    } else if (choice === 'cancel_restart') { 
                        await i.update({ embeds: [new EmbedBuilder().setColor('#ff0000').setDescription('<:FailedError:1488423486920851566> **Proses dibatalkan.** Naura tetap hidup!')], components: [] }); 
                    } 
                });

                collector.on('end', collected => { 
                    if (collected.size === 0) interaction.editReply({ components: [] }).catch(() => {}); 
                }); 
                return; 
            } 

            // 📢 GLOBAL ANNOUNCEMENT 
            if (subcommand === 'announce') { 
                const pesan = interaction.options.getString('pesan'); 
                const guilds = interaction.client.guilds.cache; 
                let successCount = 0;

                for (const guild of guilds.values()) {
                    let targetChannel = guild.channels.cache.find(c => c.name === 'announcements' || c.name === 'pengumuman'); 
                    const canSend = (ch) => ch && ch.permissionsFor(guild.members.me).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]);

                    if (!canSend(targetChannel)) targetChannel = guild.systemChannel; 
                    if (!canSend(targetChannel)) { 
                        targetChannel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && canSend(c)); 
                    }

                    if (targetChannel) { 
                        try { 
                            const broadcastEmbed = new EmbedBuilder()
                                .setColor('#FFD700')
                                .setAuthor({ name: '📢 Transmisi Darurat Pusat' })
                                .setDescription(`**Pesan dari Developer (Aryandita):**\n\n${pesan}`)
                                .setFooter({ text: 'Naura Global Broadcast System' })
                                .setTimestamp();

                            await targetChannel.send({ embeds: [ui.embeds?.globalAnnounce ? ui.embeds.globalAnnounce(pesan) : broadcastEmbed] }); 
                            successCount++; 
                        } catch (error) { 
                            // Skip silently
                        } 
                    } 
                }

                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Broadcast Sukses!**\nPesan berhasil mengudara di **${successCount}** dari **${guilds.size}** server yang dilayani Naura.`)] }); 
            }

            // 👤 PROFILE & ACTIVITY 
            if (subcommand === 'setpfp') { 
                const image = interaction.options.getAttachment('gambar'); 
                await interaction.client.user.setAvatar(image.url); 
                return interaction.editReply({ embeds: [embedSuccess.setDescription('✅ **Avatar Diperbarui!** Penampilan baru Naura berhasil diterapkan ke semua server.')] }); 
            } 
            if (subcommand === 'setactivity') { 
                const type = interaction.options.getString('tipe'); 
                const text = interaction.options.getString('teks'); 
                interaction.client.user.setActivity(text, { type: ActivityType[type] }); 
                return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Presence Diperbarui!**\nStatus Naura sekarang: **${type} ${text}**`)] }); 
            }

            // ========================================== 
            // 💰 GOD MODE & DATA CONTROL 
            // ==========================================
            if (group === 'godmode') {
                if (subcommand === 'eco_reset') { 
                    const targetUser = interaction.options.getUser('target'); 
                    if (targetUser.bot) return interaction.editReply('❌ Bot tidak memiliki jejak digital di database ekonomi!');

                    await UserProfile.destroy({ where: { userId: targetUser.id } });

                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`⚠ **Penghapusan Paksa Berhasil!**\nSeluruh data finansial, tas inventaris, dan XP milik **${targetUser.username}** telah musnah secara permanen.`)] }); 
                } 
                
                if (subcommand === 'eco_set') { 
                    const targetUser = interaction.options.getUser('target'); 
                    if (targetUser.bot) return interaction.editReply('❌ Bot tidak dapat memegang uang tunai!');

                    const type = interaction.options.getString('tipe');
                    const amount = interaction.options.getInteger('jumlah');

                    let [targetProfile] = await UserProfile.findOrCreate({ where: { userId: targetUser.id } }); 

                    if (type === 'balance') targetProfile.balance = amount; 
                    else if (type === 'bank') targetProfile.bank = amount;

                    await targetProfile.save();

                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`👑 **Injeksi Dana Berhasil!**\nSaldo ${type === 'balance' ? 'dompet tunai' : 'bank'} milik **${targetUser.username}** telah dimanipulasi menjadi **${amount.toLocaleString()}** koin.`)] }); 
                }

                if (subcommand === 'reset_bday') { 
                    const targetUser = interaction.options.getUser('target'); 
                    if (targetUser.bot) return interaction.editReply('❌ Entitas bot tidak memiliki tanggal lahir.');

                    let [targetProfile] = await UserProfile.findOrCreate({ where: { userId: targetUser.id } }); 

                    targetProfile.birthday = null;
                    await targetProfile.save();

                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`🎂 **Manipulasi Waktu Berhasil!**\nJejak tanggal lahir milik **${targetUser.username}** telah dihapus. Mereka kini bisa mengatur ulang tanggal lahirnya via \`/birthday set\`.`)] }); 
                }
            }

            // ========================================== 
            // ⚙️ GUILD SETUP OVERRIDE 
            // ==========================================
            if (group === 'guild') {
                if (subcommand === 'setup_minecraft') { 
                    const ip = interaction.options.getString('ip'); 
                    const port = interaction.options.getInteger('port') || 25565; 
                    guildData.minecraft = { ip: ip, port: port }; 
                    await guildData.save(); 
                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Jalur Minecraft Dibuka!**\nServer IP: **${ip}:${port}** telah ditetapkan.`)] }); 
                } 
                if (subcommand === 'setup_sticky') { 
                    const channel = interaction.options.getChannel('channel'); 
                    guildData.stickyMessage = { channelId: channel.id, message: interaction.options.getString('pesan') }; 
                    await guildData.save(); 
                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Pesan Lengket Ditempel!** Berhasil memasang sticky di <#${channel.id}>.`)] }); 
                } 
                if (subcommand === 'setup_announcement') { 
                    const channel = interaction.options.getChannel('channel'); 
                    guildData.announcementChannel = channel.id; 
                    await guildData.save(); 
                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Radar Pengumuman Aktif!** Channel <#${channel.id}> menjadi pusat notifikasi.`)] }); 
                } 
                if (subcommand === 'setup_autorole') { 
                    const role = interaction.options.getRole('role'); 
                    guildData.autoRole = role.id; 
                    await guildData.save(); 
                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Auto-Role Aktif!** Pendatang baru akan otomatis diberikan <@&${role.id}>.`)] }); 
                } 
                if (subcommand === 'setup_autoreply') { 
                    const trigger = interaction.options.getString('trigger').toLowerCase(); 
                    const response = interaction.options.getString('response'); 
                    if (!guildData.autoReplies) guildData.autoReplies = []; 
                    const existingIndex = guildData.autoReplies.findIndex(r => r.trigger === trigger); 
                    if (existingIndex !== -1) guildData.autoReplies[existingIndex].response = response; 
                    else guildData.autoReplies.push({ trigger: trigger, response: response }); 
                    await guildData.save(); 
                    return interaction.editReply({ embeds: [embedSuccess.setDescription(`✅ **Auto-Responder Ditanam!** Naura akan membalas "${trigger}" dengan respons kustom.`)] }); 
                }
            }

        } catch (error) {
            console.error('[NAURA SUPER-COMMAND ERROR]', error);
            await interaction.editReply({ content: `❌ Terjadi kesalahan fatal pada mesin Naura: \`${error.message}\`` });
        }
    }
};

// ==========================================
// 📂 IMPLEMENTASI FUNGSI (LOGIC BLOCKS)
// ==========================================

async function handleEval(interaction) {
    const code = interaction.options.getString('code');
    const client = interaction.client; // Membuka akses client untuk eval
    
    try {
        // Mengeksekusi kode secara langsung
        let evaled = await eval(code);
        if (typeof evaled !== 'string') evaled = util.inspect(evaled, { depth: 0 });
        
        // Mencegah pesan terlalu panjang melebihi limit Discord (2000 karakter)
        const output = evaled.length > 1900 ? evaled.substring(0, 1900) + '... (Output Terpotong)' : evaled;

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('💻 Kode Berhasil Dieksekusi')
            .addFields(
                { name: '📥 Input', value: codeBlock('js', code) },
                { name: '📤 Output', value: codeBlock('js', output) }
            );

        await interaction.editReply({ embeds: [embed] });
    } catch (e) {
        const embed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('💥 Gagal Mengeksekusi Kode')
            .addFields({ name: 'Error', value: codeBlock('js', e.message) });
        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleSql(interaction) {
    const queryStr = interaction.options.getString('query');
    
    try {
        // Menjalankan Raw Query ke MySQL melalui Sequelize
        const [results, metadata] = await sequelize.query(queryStr);
        let output = JSON.stringify(results, null, 2);
        
        if (output.length > 1900) output = output.substring(0, 1900) + '... (Output Terpotong)';

        const embed = new EmbedBuilder()
            .setColor('#F1C40F') // Warna Kuning MySQL
            .setTitle('🗄️ MySQL Query Terkirim')
            .addFields(
                { name: '📥 Query', value: codeBlock('sql', queryStr) },
                { name: '📤 Result', value: codeBlock('json', output || 'Tidak ada data yang dikembalikan.') }
            )
            .setFooter({ text: `Eksekusi Database MySQL • Naura v1.5.0` });

        await interaction.editReply({ embeds: [embed] });
    } catch (e) {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('💥 SQL Error').setDescription(codeBlock('js', e.message))] });
    }
}

async function handleMaintenance(interaction) {
    const status = interaction.options.getBoolean('status');
    const client = interaction.client;
    
    // Menggunakan state memori bot untuk menyimpan mode perbaikan
    client.maintenanceMode = status;

    const embed = new EmbedBuilder()
        .setColor(status ? '#FF0000' : '#00FF00')
        .setAuthor({ name: 'Global Maintenance System', iconURL: client.user.displayAvatarURL() })
        .setDescription(`Status Perbaikan Global telah **${status ? 'DIAKTIFKAN 🚧' : 'DIMATIKAN ✅'}**.\n\n${status ? '*Bot sekarang akan mengabaikan semua perintah dari user biasa sampai mode ini dimatikan.*' : '*Sistem kembali normal. Semua user dapat menggunakan bot.*'}`);

    // Update status aktivitas (Presence) bot agar user tau Naura sedang perbaikan
    if (status) {
        client.user.setPresence({ activities: [{ name: '🚧 Sedang Perbaikan Server' }], status: 'dnd' });
    } else {
        client.user.setPresence({ activities: [{ name: 'Melayani Master Aryan ✨' }], status: 'online' });
    }

    await interaction.editReply({ embeds: [embed] });
}

async function handlePremium(interaction, isAdd) {
    const targetUser = interaction.options.getUser('user');

    // Menambah/Mencabut status Premium di database
    const [profile] = await UserProfile.findOrCreate({ where: { userId: targetUser.id } });
    
    profile.isPremium = isAdd; 
    
    // Set expiry ke 100 tahun ke depan jika permanent
    if (isAdd) {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 100);
        profile.premiumUntil = expiry;
    } else {
        profile.premiumUntil = null;
    }
    
    await profile.save();

    const embed = new EmbedBuilder()
        .setColor(isAdd ? '#FFD700' : '#808080')
        .setDescription(`${ui.getEmoji ? ui.getEmoji('success') : '✅'} Hak istimewa **Premium V.I.P** telah berhasil **${isAdd ? 'DISUNTIKKAN' : 'DICABUT'}** secara paksa untuk pengguna <@${targetUser.id}>.`);

    await interaction.editReply({ embeds: [embed] });
}

async function handleReload(interaction) {
    const commandName = interaction.options.getString('command').toLowerCase();
    const command = interaction.client.commands.get(commandName);

    if (!command) {
        return interaction.editReply(`❌ Command \`${commandName}\` tidak ditemukan di dalam memori.`);
    }

    // Melakukan proses Hot-Reload file JS
    try {
        const fs = require('fs');
        const path = require('path');
        const cmdsPath = path.join(__dirname, '..'); // Menunjuk ke folder src/commands/
        
        let fileLocation = '';
        
        // Mencari file command di semua sub-folder
        const folders = fs.readdirSync(cmdsPath);
        for (const folder of folders) {
            const folderPath = path.join(cmdsPath, folder);
            if (!fs.statSync(folderPath).isDirectory()) continue;
            
            const file = fs.readdirSync(folderPath).find(f => f === `${command.data.name}.js` || f === `${commandName}.js`);
            if (file) {
                fileLocation = path.join(folderPath, file);
                break;
            }
        }

        if (!fileLocation) return interaction.editReply(`❌ Path direktori untuk \`${commandName}\` tidak dapat dilacak.`);

        // Menghapus cache file lama, dan memasukkan yang baru
        delete require.cache[require.resolve(fileLocation)];
        const newCommand = require(fileLocation);
        interaction.client.commands.set(newCommand.data ? newCommand.data.name : newCommand.name, newCommand);

        await interaction.editReply(`✅ Injeksi kode sukses! \`${commandName}\` berhasil di-reload. Perubahan telah diimplementasikan secara *live*.`);
    } catch (error) {
        console.error(error);
        await interaction.editReply(`❌ Gagal melakukan kompilasi ulang (Hot-Reload): \`${error.message}\``);
    }
}