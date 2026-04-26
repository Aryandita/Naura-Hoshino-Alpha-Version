const GuildSettings = require('../models/GuildSettings');

module.exports = {
    name: 'presenceUpdate',
    once: false,
    async execute(oldPresence, newPresence) {
        // Abaikan jika tidak ada guild atau user adalah bot
        if (!newPresence.guild || !newPresence.member || newPresence.member.user.bot) return;

        const member = newPresence.member;
        const guild = newPresence.guild;

        try {
            // Ambil pengaturan server
            const [db] = await GuildSettings.findOrCreate({ where: { guildId: guild.id } });
            const vanityConfig = db.settings?.vanityRoles;

            // Pastikan fitur menyala dan teks sudah diset
            if (!vanityConfig || !vanityConfig.enabled || !vanityConfig.text) return;

            const vanityText = vanityConfig.text.toLowerCase();

            // Fungsi untuk mengecek apakah status custom berisi teks vanity
            const checkVanity = (presence) => {
                if (!presence || !presence.activities) return false;
                // Type 4 adalah Custom Status di Discord API
                return presence.activities.some(activity => 
                    activity.type === 4 && 
                    activity.state && 
                    activity.state.toLowerCase().includes(vanityText)
                );
            };

            const hadVanity = checkVanity(oldPresence);
            const hasVanityNow = checkVanity(newPresence);

            // Jika status tidak berubah, hentikan.
            if (hadVanity === hasVanityNow) return;

            // 🟢 USER MENAMBAHKAN VANITY
            if (hasVanityNow && !hadVanity) {
                // Berikan Role
                if (vanityConfig.roles && vanityConfig.roles.length > 0) {
                    const rolesToAdd = vanityConfig.roles.filter(id => !member.roles.cache.has(id));
                    if (rolesToAdd.length > 0) {
                        await member.roles.add(rolesToAdd, 'Vanity Role: Adopted').catch(() => {});
                    }
                }

                // Kirim Pesan
                if (vanityConfig.channelId && vanityConfig.message) {
                    const channel = guild.channels.cache.get(vanityConfig.channelId);
                    if (channel) {
                        let msg = vanityConfig.message
                            .replace(/{user\.mention}/g, `<@${member.id}>`)
                            .replace(/{user\.name}/g, member.user.username)
                            .replace(/{server\.name}/g, guild.name);
                        
                        channel.send(msg).catch(() => {});
                    }
                }
            } 
            
            // 🔴 USER MENGHAPUS VANITY
            else if (!hasVanityNow && hadVanity) {
                if (vanityConfig.roles && vanityConfig.roles.length > 0) {
                    const rolesToRemove = vanityConfig.roles.filter(id => member.roles.cache.has(id));
                    if (rolesToRemove.length > 0) {
                        await member.roles.remove(rolesToRemove, 'Vanity Role: Removed').catch(() => {});
                    }
                }
            }

        } catch (error) {
            console.error('[Vanity System Error]:', error);
        }
    }
};