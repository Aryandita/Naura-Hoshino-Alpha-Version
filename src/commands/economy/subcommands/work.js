const { EmbedBuilder } = require('discord.js');
const { getBuffs, getItemName, msToTime } = require('../utils/ecoHelper');

module.exports = {
    async execute(interaction, profile, ui) {
        const coin = ui.getEmoji('coin') || '🪙';
        const errorEmoji = ui.getEmoji('error') || '❌';
        const successEmoji = ui.getEmoji('success') || '✅';

        const buffs = getBuffs(profile.inventory);
        let finalCooldown = (10 * 60 * 1000) - buffs.cooldownReducMs;
        if (finalCooldown < 0) finalCooldown = 0;

        const lastUsed = profile.cooldowns['work'] || 0;
        const timeLeft = finalCooldown - (Date.now() - lastUsed);

        if (timeLeft > 0) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} Kamu masih kelelahan. Istirahat selama **${msToTime(timeLeft)}**.`)] });

        profile.cooldowns['work'] = Date.now();
        profile.changed('cooldowns', true);

        const kalimatTugas = [
            "Tamu VIP atas nama Aryandita baru saja tiba di lobi.",
            "Tolong bawakan koper ini ke kamar 302 segera.",
            "Kopi Luwak satu, gulanya sedikit saja ya.",
            "Pastikan database MySQL server Vermilion sudah dibackup.",
            "Frontend dashboard ini menggunakan framework Next.js.",
            "Tolong restart server Minecraft sekarang juga.",
            "Selamat pagi, ada yang bisa saya bantu hari ini?"
        ];
        
        const targetTeks = kalimatTugas[Math.floor(Math.random() * kalimatTugas.length)];
        const batasWaktu = 15000 + buffs.typingExtraTime; 

        const workItems = profile.inventory.filter(id => ['kopi_biasa', 'kopi_sultan', 'mahkota_raja'].includes(id)).map(getItemName);
        const itemStr = workItems.length > 0 ? `\n*Buff Aktif: +${buffs.typingExtraTime/1000} detik (${workItems.join(', ')})*` : '';

        const embedSoal = new EmbedBuilder()
            .setColor(ui.getColor('primary'))
            .setTitle('💼 Shift Kerja Dimulai!')
            .setDescription(`Bos menugaskan dokumen mendesak! Ketik ulang teks di bawah ini **PERSIS SAMA** dalam waktu **${batasWaktu / 1000} detik**!\n\n**Teks Dokumen:**\n\`\`\`text\n${targetTeks}\n\`\`\`` + itemStr);

        await interaction.editReply({ embeds: [embedSoal] });

        try {
            const filter = m => m.author.id === interaction.user.id;
            const collected = await interaction.channel.awaitMessages({ filter, max: 1, time: batasWaktu, errors: ['time'] });
            const pesanUser = collected.first();
            
            if (pesanUser.content.trim() === targetTeks) {
                let gaji = Math.floor(Math.random() * 501) + 300; 
                gaji += Math.floor(gaji * (buffs.workBonus / 100)); 
                profile.economy_wallet += gaji; 
                await profile.save();
                
                return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('success')).setDescription(`${successEmoji} **Bekerja Keras!** Mengetik dengan cepat dan akurat. Dibayar **+${gaji.toLocaleString()}** ${coin}!\n> 💳 **Saldo:** **${profile.economy_wallet.toLocaleString()}** ${coin}`)] });
            } else {
                await profile.save(); 
                return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} **Typo/Salah!** Bosmu marah dan kamu tidak dibayar hari ini.\n*(Pastikan huruf besar, kecil, dan tanda baca sesuai)*`)] });
            }
        } catch (error) {
            await profile.save(); 
            return interaction.followUp({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${errorEmoji} ⏳ **Waktu Habis!** Kamu terlalu lambat mengetik, pekerjaan dibatalkan.`)] });
        }
    }
};