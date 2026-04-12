const UserProfile = require('../../models/UserProfile');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'addpremium',
    description: 'Memberikan status Premium kepada user tertentu (Khusus Owner)',
    
    async execute(client, message, args) {
        // Ganti dengan ID Discord Anda sebagai Owner Bot
        const OWNER_ID = 'ID_ANDA_DISINI'; 
        if (message.author.id !== OWNER_ID) return message.reply('⛔ Anda tidak memiliki akses untuk perintah ini.');

        // Target: Bisa berupa Mention (@user) atau ID murni
        const targetMention = message.mentions.users.first();
        const targetId = targetMention ? targetMention.id : args[0];
        
        // Jumlah hari
        const days = parseInt(args[1]);

        if (!targetId || isNaN(days)) {
            return message.reply('**Format Salah!** Gunakan: `n!addpremium <@user/ID> <jumlah_hari>`\n*Contoh: n!addpremium 1234567890 30*');
        }

        try {
            // Mencari user di MySQL (atau membuatnya jika belum ada)
            const [userProfile] = await UserProfile.findOrCreate({ 
                where: { userId: targetId },
                defaults: { isPremium: false }
            });

            // Menghitung tenggat waktu (Expiry Date) baru
            let expiryDate = new Date();
            
            // Jika user sudah premium dan masih aktif, tambahkan harinya dari tanggal kadaluarsa saat ini
            if (userProfile.isPremium && userProfile.premiumUntil > new Date()) {
                expiryDate = new Date(userProfile.premiumUntil);
            }
            
            // Tambahkan jumlah hari yang diminta
            expiryDate.setDate(expiryDate.getDate() + days);

            // Simpan ke MySQL
            userProfile.isPremium = true;
            userProfile.premiumUntil = expiryDate;
            await userProfile.save();

            // Format tanggal untuk Discord
            const unixTime = Math.floor(expiryDate.getTime() / 1000);

            const successEmbed = new EmbedBuilder()
                .setColor('#FFD700') // Warna Emas Premium
                .setTitle('💎 Status Premium Diberikan!')
                .setDescription(`Berhasil memberikan akses Premium kepada <@${targetId}>.`)
                .addFields(
                    { name: 'Durasi Ditambahkan', value: `${days} Hari`, inline: true },
                    { name: 'Berlaku Sampai', value: `<t:${unixTime}:F>\n(<t:${unixTime}:R>)`, inline: true }
                )
                .setFooter({ text: 'Naura VIP System' })
                .setTimestamp();

            await message.reply({ embeds: [successEmbed] });

            // Opsional: Kirim DM ke user yang mendapatkan premium
            const userTarget = await client.users.fetch(targetId).catch(() => null);
            if (userTarget) {
                userTarget.send(`🎉 **Selamat!** Anda baru saja diberikan status **Premium** di bot Naura selama ${days} hari.`).catch(() => {});
            }

        } catch (error) {
            console.error('Error saat memberikan premium:', error);
            message.reply('❌ Terjadi kesalahan pada database saat memproses data premium.');
        }
    }
};
