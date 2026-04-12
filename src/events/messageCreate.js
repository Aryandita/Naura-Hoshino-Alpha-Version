const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

// Daftar kata yang dilarang (bisa Anda kembangkan atau pindahkan ke database MySQL nantinya)
const badWords = ['anjing', 'bangsat', 'kontol', 'babi']; 

// Regex untuk mendeteksi link (kecuali tenor/giphy untuk gif)
const linkRegex = /(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})/gi;

module.exports = async (client, message) => {
    if (message.author.bot || !message.guild) return;

    // Abaikan jika yang mengirim pesan adalah Admin
    if (message.member.permissions.has('ManageMessages')) return;

    const content = message.content.toLowerCase();
    let isViolation = false;
    let violationType = '';

    // 1. Cek Kata Kasar
    const containsBadWord = badWords.some(word => content.includes(word));
    if (containsBadWord) {
        isViolation = true;
        violationType = 'Menggunakan Kata Kasar';
    }

    // 2. Cek Link (Anti-Link)
    // Jika Anda ingin mematikan anti-link, cukup hapus atau beri komentar pada blok ini
    if (!isViolation && linkRegex.test(content) && !content.includes('tenor.com')) {
        isViolation = true;
        violationType = 'Mengirim Link Ilegal';
    }

    if (isViolation) {
        // Hapus pesan pengguna
        await message.delete().catch(() => {});

        // Beri peringatan di channel tersebut (akan dihapus otomatis setelah 5 detik)
        const warningMsg = await message.channel.send(`⚠️ <@${message.author.id}>, pesan Anda dihapus karena: **${violationType}**.`);
        setTimeout(() => warningMsg.delete().catch(() => {}), 5000);

        // --- MENGIRIM KE AUDIT LOG ---
        // Asumsi Anda menggunakan logChannelId dari config ticket, atau buat config.auditLogChannelId baru
        const logChannel = message.guild.channels.cache.get(config.ticket.logChannelId); 
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor('#FFA500')
                .setAuthor({ name: 'Automod | Pelanggaran Terdeteksi', iconURL: message.author.displayAvatarURL() })
                .addFields(
                    { name: 'User', value: `${message.author.tag} (${message.author.id})`, inline: true },
                    { name: 'Channel', value: `<#${message.channel.id}>`, inline: true },
                    { name: 'Tipe', value: violationType, inline: true },
                    { name: 'Pesan Asli', value: `\`\`\`${message.content}\`\`\`` }
                )
                .setTimestamp();
            
            await logChannel.send({ embeds: [logEmbed] });
        }
        
        return; // Hentikan eksekusi kode selanjutnya jika pesan melanggar (agar tidak memicu command)
    }

    // ... (Kode Command Handler Anda yang biasa ada di messageCreate.js letakkan di bawah sini)
};
