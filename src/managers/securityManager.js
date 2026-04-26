const { PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const ui = require('../config/ui');

class SecurityManager {
    // Logika Anti-Nuke (Channel/Role Delete Protection)
    static async handleAuditLog(guild, entry, type) {
        const settings = (await require('../models/GuildSettings').findOne({ where: { guildId: guild.id } }))?.settings?.antinuke;
        if (!settings || !settings.enabled) return;

        const executor = entry.executor;
        if (executor.id === guild.ownerId || settings.whitelist.includes(executor.id)) return;

        try {
            // Tindakan: Kick atau Ban Pelaku (Meekly Logic)
            if (settings.actions.includes('ban')) {
                await guild.members.ban(executor.id, { reason: `Naura Anti-Nuke: ${type}` });
            } else {
                await guild.members.kick(executor.id, `Naura Anti-Nuke: ${type}`);
            }

            // Kirim Log ke Owner
            const owner = await guild.fetchOwner();
            const logEmbed = new EmbedBuilder()
                .setColor(ui.getColor('error'))
                .setTitle('🛡️ Anti-Nuke Triggered')
                .setDescription(`Tindakan berbahaya terdeteksi: **${type}**\n**Pelaku:** ${executor.tag} (${executor.id})\n**Tindakan:** Pelaku telah dikeluarkan.`)
                .setTimestamp();
            
            await owner.send({ embeds: [logEmbed] }).catch(() => {});
        } catch (err) {
            console.error('Security Manager Error:', err);
        }
    }
}

module.exports = SecurityManager;
