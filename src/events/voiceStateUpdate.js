const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config.json');
const ui = require('../config/ui');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const { member, guild } = newState;
        const tempConfig = config.tempvoice;

        // Jika fitur dinonaktifkan di config.json, abaikan
        if (!tempConfig || !tempConfig.enabled) return;

        // ==========================================
        // 🔊 LOGIKA 1: MEMBER MASUK KE TRIGGER CHANNEL
        // ==========================================
        if (newState.channelId === tempConfig.triggerChannelId) {
            try {
                // Membuat Voice Channel baru
                const tempChannel = await guild.channels.create({
                    name: `🔊 ${member.user.username}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: tempConfig.categoryId,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [
                                PermissionFlagsBits.ManageChannels, 
                                PermissionFlagsBits.Connect, 
                                PermissionFlagsBits.Speak,
                                PermissionFlagsBits.MuteMembers,
                                PermissionFlagsBits.DeafenMembers
                            ],
                        },
                        {
                            id: guild.id, // @everyone
                            allow: [PermissionFlagsBits.Connect],
                        }
                    ],
                });

                // Memindahkan member ke channel baru tersebut
                await member.voice.setChannel(tempChannel);

                // --- MENGIRIM CONTROL PANEL (ALL-IN-ONE) ---
                const controlEmbed = new EmbedBuilder()
                    .setColor(ui.getColor('primary')) // Warna Aqua khusus Aryan
                    .setTitle('🎛️ Voice Control Panel')
                    .setDescription(`Selamat datang di channel pribadimu, <@${member.id}>!\n\nGunakan tombol di bawah untuk mengatur channel ini.\n\n${ui.getEmoji('progressDot')} **Lock:** Orang lain tidak bisa masuk.\n${ui.getEmoji('progressDot')} **Unlock:** Membuka channel kembali.\n${ui.getEmoji('progressDot')} **Rename:** Mengubah nama channel.\n${ui.getEmoji('progressDot')} **Limit:** Membatasi jumlah orang.`)
                    .setFooter({ text: 'Hanya pemilik channel yang dapat menggunakan tombol ini.' });

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('tvc_lock').setLabel('Lock').setEmoji('🔒').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tvc_unlock').setLabel('Unlock').setEmoji('🔓').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('tvc_rename').setLabel('Rename').setEmoji('✏️').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('tvc_limit').setLabel('Limit').setEmoji('👥').setStyle(ButtonStyle.Primary)
                );

                await tempChannel.send({ embeds: [controlEmbed], components: [row1] });

            } catch (error) {
                console.error('\x1b[31m[VOICE ERROR]\x1b[0m Gagal memproses TempVoice:', error);
            }
        }

        // ==========================================
        // 🗑️ LOGIKA 2: MEMBER KELUAR & HAPUS CHANNEL KOSONG
        // ==========================================
        if (oldState.channelId) {
            const oldChannel = oldState.channel;
            
            // Cek apakah channel tersebut berada di kategori TempVoice
            if (oldChannel && oldChannel.parentId === tempConfig.categoryId && oldChannel.id !== tempConfig.triggerChannelId) {
                // Jika channel kosong (0 member), hapus
                if (oldChannel.members.size === 0) {
                    await oldChannel.delete().catch(() => {});
                }
            }
        }
    },
};
