const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const UserLeveling = require('../models/UserLeveling');
const UserProfile = require('../models/UserProfile');
const GuildSettings = require('../models/GuildSettings');
const { CanvasUtils } = require('./Canvas'); // Pastikan path ke Canvas.js benar
const ui = require('../config/ui');

const CONFIG = {
        BASE_XP: 100,
            MULTIPLIER: 1.5,
                MSG_COOLDOWN: 60000,
                    MSG_XP: { min: 15, max: 25 }
};

function getNextLevelXp(level) {
        return Math.floor(CONFIG.BASE_XP * Math.pow(CONFIG.MULTIPLIER, level - 1));
}

async function awardXp(user, guild, currentChannel) {
        if (user.bot || !guild) return;

            let [profile] = await UserLeveling.findOrCreate({ 
                        where: { userId: user.id, guildId: guild.id } 
            });

        const now = Date.now();
        if (now - new Date(profile.lastActivity).getTime() < CONFIG.MSG_COOLDOWN) return;

        let gained = Math.floor(Math.random() * (CONFIG.MSG_XP.max - CONFIG.MSG_XP.min + 1)) + CONFIG.MSG_XP.min;
        
        // PREMIUM 2x XP BOOST
        const globalProfile = await UserProfile.findByPk(user.id).catch(() => null);
        if (globalProfile && globalProfile.isPremium && globalProfile.premiumUntil && globalProfile.premiumUntil > new Date()) {
            gained *= 2; 
        }
                            
                                profile.xp += gained;
                                    profile.messageCount += 1;
                                        profile.lastActivity = now;

                                            await checkLevelUp(profile, user, guild, currentChannel);
                                                await profile.save();
}

async function checkLevelUp(profile, user, guild, currentChannel) {
        let nextXp = getNextLevelXp(profile.level);
            let hasLeveledUp = false;

                while (profile.xp >= nextXp) {
                            profile.level++;
                                    profile.xp -= nextXp;
                                            nextXp = getNextLevelXp(profile.level);
                                                    hasLeveledUp = true;
                }

                    if (hasLeveledUp) {
                                try {
                                                // Deteksi Channel Khusus
                                                            let targetChannel = currentChannel;
                                                                        const settingsData = await GuildSettings.findOne({ where: { guildId: guild.id } });
                                                                                    const levelUpChannelId = settingsData?.settings?.channels?.levelUp;

                                                                                                if (levelUpChannelId) {
                                                                                                                    const specificChannel = guild.channels.cache.get(levelUpChannelId);
                                                                                                                                    if (specificChannel) targetChannel = specificChannel;
                                                                                                }

                                                                                                            // Generate Canvas selaras dengan Background Baru
                                                                                                                        const canvas = await CanvasUtils.generateLevel(user, profile.level);
                                                                                                                                    const buffer = canvas.encodeSync ? canvas.encodeSync('png') : canvas.toBuffer();
                                                                                                                                                const attachment = new AttachmentBuilder(buffer, { name: 'naura-levelup.png' });

                                                                                                                                                            const embed = new EmbedBuilder()
                                                                                                                                                                            .setColor(ui.getColor('primary'))
                                                                                                                                                                                            .setAuthor({ name: '✦ 𝐄𝐕𝐎𝐋𝐔𝐒𝐈 𝐁𝐄𝐑𝐇𝐀𝐒𝐈𝐋 ✦', iconURL: user.displayAvatarURL() })
                                                                                                                                                                                                            .setDescription(`Luar biasa **${user.username}**! Kamu telah menembus batas dan kini mencapai **Level ${profile.level}**.`)
                                                                                                                                                                                                                            .setImage('attachment://naura-levelup.png')
                                                                                                                                                                                                                                            .setFooter({ text: 'Teruslah aktif untuk memperkuat jiwamu!' })
                                                                                                                                                                                                                                                            .setTimestamp();

                                                                                                                                                                                                                                                                        if (targetChannel) {
                                                                                                                                                                                                                                                                                            await targetChannel.send({ content: `<@${user.id}>`, embeds: [embed], files: [attachment] });
                                                                                                                                                                                                                                                                        }

                                } catch (e) {
                                                console.error('[LEVELING ERROR]', e);
                                                            if (currentChannel) await currentChannel.send(`🎉 **${user.username}** naik ke **Level ${profile.level}**!`).catch(() => {});
                                }
                    }
}

module.exports = { awardXp, getNextLevelXp, CONFIG };