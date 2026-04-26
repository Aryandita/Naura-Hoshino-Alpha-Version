const { ChannelType, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js');
const UserLeveling = require('../models/UserLeveling');
const GuildSettings = require('../models/GuildSettings');
const ui = require('../config/ui');

const voiceSessions = new Collection(); 

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState, client) {
        const { member, guild } = newState;
        if (!member || member.user.bot) return;

        const userId = member.id;
        const guildId = guild.id;

        // ==========================================
        // 🎙️ SISTEM VOICE XP TRACKING
        // ==========================================
        if (!oldState.channelId && newState.channelId) {
            voiceSessions.set(`${guildId}-${userId}`, Date.now());
        }

        if (oldState.channelId && !newState.channelId) {
            const joinTime = voiceSessions.get(`${guildId}-${userId}`);
            if (joinTime) {
                const durationMinutes = Math.floor((Date.now() - joinTime) / 60000);
                if (durationMinutes >= 1) {
                    try {
                        const [profile] = await UserLeveling.findOrCreate({ where: { userId, guildId } });
                        profile.xp += (durationMinutes * 10);
                        profile.voiceMinutes += durationMinutes;
                        await profile.save();
                    } catch (err) {}
                }
                voiceSessions.delete(`${guildId}-${userId}`);
            }
        }

        // ==========================================
        // 🔊 SISTEM TEMP-VOICE MAKER
        // ==========================================
        let settings = null;
        try {
            [settings] = await GuildSettings.findOrCreate({ where: { guildId } });
        } catch(e) { return; }

        const tempConfig = settings?.settings?.tempvoice;
        if (!tempConfig || !tempConfig.enabled) return;

        // LOGIKA A: PEMBUATAN RUANGAN
        if (newState.channelId === tempConfig.triggerChannelId) {
            try {
                const tempChannel = await guild.channels.create({
                    name: `🔊 ${member.user.username}'s Room`,
                    type: ChannelType.GuildVoice,
                    parent: tempConfig.categoryId,
                    permissionOverwrites: [
                        {
                            id: member.id,
                            allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
                        },
                        {
                            id: guild.id, // @everyone
                            allow: [PermissionFlagsBits.Connect],
                        }
                    ],
                });

                await member.voice.setChannel(tempChannel);

            } catch (error) {
                console.error('\x1b[31m[VOICE ERROR]\x1b[0m Gagal memproses TempVoice:', error);
            }
        }

        // LOGIKA B: PENGHAPUSAN RUANGAN KOSONG
        if (oldState.channelId) {
            const oldChannel = oldState.channel;
            
            if (oldChannel && oldChannel.parentId === tempConfig.categoryId && oldChannel.id !== tempConfig.triggerChannelId) {
                // Jika channel utama kosong
                if (oldChannel.members.size === 0) {
                    // PERBAIKAN: Cari Waiting Room menggunakan pencarian global guild
                    const waitingRoomName = `⏳ Wait - ${oldChannel.name.replace('🔊 ', '').replace("'s Room", "")}`;
                    const waitingRoom = oldChannel.guild.channels.cache.find(c => c.name === waitingRoomName && c.parentId === tempConfig.categoryId);
                    
                    // Hapus channel utama
                    await oldChannel.delete().catch(() => {});
                    
                    // Hapus Waiting Room jika ditemukan dan kosong
                    if (waitingRoom && waitingRoom.members.size === 0) {
                        await waitingRoom.delete().catch(() => {});
                    }
                }
            }
        }
    }
};