const UserProfile = require('../../models/UserProfile');

module.exports = {
    name: 'addpremium',
    async execute(client, message, args) {
        if (message.author.id !== 'ID_OWNER_ANDA') return;

        const targetId = args[0]; // ID User
        const days = parseInt(args[1]); // Jumlah hari
        if (!targetId || isNaN(days)) return message.reply('Format: `n!addpremium <id> <hari>`');

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + days);

        const [user] = await UserProfile.findOrCreate({ where: { userId: targetId } });
        user.isPremium = true;
        user.premiumUntil = expiryDate;
        await user.save();

        message.reply(`✅ Berhasil memberikan premium kepada <@${targetId}> selama ${days} hari.`);
    }
};
