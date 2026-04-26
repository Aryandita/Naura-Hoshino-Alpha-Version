const { EmbedBuilder } = require('discord.js');
const Giveaway = require('../models/Giveaway');
const ui = require('../config/ui');

class GiveawayManager {
    constructor(client) {
        this.client = client;
    }

    startChecking() {
        // Cek setiap 15 detik
        setInterval(() => this.checkGiveaways(), 15000);
        console.log('\x1b[36m[🎉 GIVEAWAY]\x1b[0m Background checker aktif.');
    }

    async checkGiveaways() {
        const now = new Date();
        // Cari giveaway yang waktunya sudah habis dan belum ditutup
        const activeGiveaways = await Giveaway.findAll({ 
            where: { ended: false } 
        });

        for (const gw of activeGiveaways) {
            if (gw.endTime <= now) {
                await this.endGiveaway(gw);
            }
        }
    }

    async endGiveaway(gwData, manualEnd = false) {
        try {
            const guild = this.client.guilds.cache.get(gwData.guildId);
            if (!guild) return;

            const channel = guild.channels.cache.get(gwData.channelId);
            if (!channel) return;

            const message = await channel.messages.fetch(gwData.messageId).catch(() => null);
            if (!message) {
                // Pesan dihapus, tandai selesai di DB
                gwData.ended = true;
                await gwData.save();
                return;
            }

            // Ambil semua user yang bereaksi dengan emoji hadiah (🎉)
            const reaction = message.reactions.cache.get('🎉');
            if (!reaction) return;

            await reaction.users.fetch();
            // Filter: Bukan bot dan bukan Host
            const participants = reaction.users.cache.filter(u => !u.bot && u.id !== gwData.hostId).map(u => u);

            let winnerText = 'Tidak ada pemenang yang valid.';
            let winnersList = [];

            if (participants.length > 0) {
                // Mengacak pemenang sejumlah winnersCount
                const shuffled = participants.sort(() => 0.5 - Math.random());
                winnersList = shuffled.slice(0, gwData.winnersCount);
                winnerText = winnersList.map(w => `<@${w.id}>`).join(', ');
            }

            // Embed Selesai
            const embed = new EmbedBuilder()
                .setColor(ui.getColor('kythiaDark'))
                .setTitle(`${ui.getEmoji('success')} Giveaway Berakhir!`)
                .setDescription(`**Hadiah:** ${gwData.prize}\n**Pemenang:** ${winnerText}\n**Disponsori oleh:** <@${gwData.hostId}>`)
                .setFooter({ text: 'Naura Giveaway System' })
                .setTimestamp();

            await message.edit({ content: '🎉 **GIVEAWAY BERAKHIR** 🎉', embeds: [embed] });

            if (winnersList.length > 0) {
                await channel.send(`Selamat kepada ${winnerText}! Kamu memenangkan **${gwData.prize}**!`);
            } else {
                await channel.send(`Yah, tidak ada yang memenangkan **${gwData.prize}** karena tidak ada partisipan.`);
            }

            // Update Database
            gwData.ended = true;
            await gwData.save();

        } catch (error) {
            console.error('Error saat mengakhiri giveaway:', error);
        }
    }
}

module.exports = GiveawayManager;
