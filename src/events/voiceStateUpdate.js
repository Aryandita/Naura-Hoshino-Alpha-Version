const { ChannelType, PermissionFlagsBits } = require('discord.js');
const GuildSettings = require('../models/GuildSettings');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        // Abaikan jika tidak ada perubahan channel (hanya mute/unmute)
        if (oldState.channelId === newState.channelId) return;

        try {
            // Ambil data dari database
            const guildData = await GuildSettings.findOne({ guildId: newState.guild.id });
            
            // Jika belum pernah disetup, hentikan proses
            if (!guildData || !guildData.tempVoice) return;

            const { channelId, categoryId } = guildData.tempVoice;

            // ==========================================
            // ➕ DETEKSI USER MASUK "JOIN TO CREATE"
            // ==========================================
            if (newState.channelId === channelId) {
                console.log(`[🔊 TEMP VOICE] Mendeteksi ${newState.member.user.tag} masuk ke channel pembuat.`);
                
                const member = newState.member;
                const guild = newState.guild;

                // Pastikan bot punya permission sebelum mencoba membuat channel
                if (!guild.members.me.permissions.has(PermissionFlagsBits.ManageChannels)) {
                    console.log(`[❌ ERROR] Bot tidak punya izin 'Manage Channels' di server ini!`);
                    return;
                }

                console.log(`[🔊 TEMP VOICE] Sedang membuat ruangan baru untuk ${member.user.username}...`);
                
                // Membuat Voice Channel Baru
                const newChannel = await guild.channels.create({
                    name: `🔊 ${member.user.username}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: categoryId,
                    permissionOverwrites: [
                        {
                            id: member.user.id,
                            allow: [
                                PermissionFlagsBits.ManageChannels,
                                PermissionFlagsBits.MoveMembers,
                                PermissionFlagsBits.Connect,
                                PermissionFlagsBits.Speak
                            ]
                        },
                        {
                            // Pastikan bot juga punya full akses di channel ini
                            id: guild.members.me.id,
                            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.ViewChannel]
                        }
                    ]
                });

                console.log(`[🔊 TEMP VOICE] Ruangan berhasil dibuat! Memindahkan user...`);

                // Tunggu jeda sangat sebentar agar Discord API sinkron, lalu pindahkan user
                setTimeout(async () => {
                    await member.voice.setChannel(newChannel).catch(err => {
                        console.error(`[❌ ERROR] Gagal memindahkan user:`, err.message);
                    });
                }, 1000);
            }

            // ==========================================
            // 🗑️ DETEKSI USER KELUAR (AUTO DELETE)
            // ==========================================
            if (oldState.channelId && oldState.channelId !== channelId) {
                const oldChannel = oldState.channel;
                
                // Pastikan channel yang ditinggalkan ada di kategori TempVoice dan BUKAN "Join to Create"
                if (oldChannel && oldChannel.parentId === categoryId && oldChannel.id !== channelId) {
                    
                    // Jika channel kosong (0 member)
                    if (oldChannel.members.size === 0) {
                        console.log(`[🗑️ TEMP VOICE] Ruangan ${oldChannel.name} kosong, sedang menghapus...`);
                        await oldChannel.delete('Temp Voice Kosong').catch(err => {
                            console.error(`[❌ ERROR] Gagal menghapus ruangan:`, err.message);
                        });
                    }
                }
            }
        } catch (error) {
            console.error('[💥 FATAL ERROR] Terjadi kesalahan pada sistem Temp Voice:', error);
        }
    }
};