const UserProfile = require('../../models/UserProfile');
const { EmbedBuilder } = require('discord.js');
const env = require('../../config/env'); // Panggil file env

module.exports = {
    name: 'addpremium',
    description: 'Memberikan status Premium kepada user tertentu (Khusus Owner)',
    
    async execute(client, message, args) {
        // Cek apakah ID pengirim ada di dalam array OWNER_IDS dari .env
        if (!env.OWNER_IDS.includes(message.author.id)) {
            return message.reply('⛔ Anda tidak memiliki akses untuk perintah ini.');
        }

        const targetMention = message.mentions.users.first();
        const targetId = targetMention ? targetMention.id : args[0];
        const days = parseInt(args[1]);

        if (!targetId || isNaN(days)) return message.reply('**Format Salah!** Gunakan: `n!addpremium <@user/ID> <jumlah_hari>`');

        try {
            const [userProfile] = await UserProfile.findOrCreate({ 
                where: { userId: targetId },
                defaults: { isPremium: false }
            });

            let expiryDate = new Date();
            if (userProfile.isPremium && userProfile.premiumUntil > new Date()) {
                expiryDate = new Date(userProfile.premiumUntil);
            }
            expiryDate.setDate(expiryDate.getDate() + days);

            userProfile.isPremium = true;
            userProfile.premiumUntil = expiryDate;
            await userProfile.save();

            const unixTime = Math.floor(expiryDate.getTime() / 1000);
            const successEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setTitle('💎 Status Premium Diberikan!')
                .setDescription(`Berhasil memberikan akses Premium kepada <@${targetId}>.`)
                .addFields(
                    { name: 'Durasi', value: `${days} Hari`, inline: true },
                    { name: 'Berlaku Sampai', value: `<t:${unixTime}:F>`, inline: true }
                );

            await message.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error premium:', error);
        }
    }
};
