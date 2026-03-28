const { EmbedBuilder } = require('discord.js');
const UserProfile = require('../models/UserProfile');
const { CanvasUtils } = require('./Canvas'); // Panggil Canvas di sini

const BASE_XP = 100;
const XP_MULTIPLIER = 1.5;

function getXpForLevel(level) {
    if (level <= 1) return BASE_XP;
    return Math.floor(BASE_XP * Math.pow(XP_MULTIPLIER, level - 1));
}

// Ubah parameter dari userId menjadi objek 'user' utuh
async function awardXp(user, xpToAward, channel) {
    const userId = user.id;
    let userProfile = await UserProfile.findOneAndUpdate(
        { userId: userId },
        { $setOnInsert: { userId: userId } },
        { upsert: true, new: true }
    );

    // ==========================================
    // 🟢 KODE PENGAMAN: Buat laci leveling jika belum ada
    // ==========================================
    if (!userProfile.leveling) {
        userProfile.leveling = { xp: 0, level: 1 };
    }

    // Sekarang aman untuk menambahkan XP
    userProfile.leveling.xp += xpToAward;
    
    let xpForNextLevel = getXpForLevel(userProfile.leveling.level);
    let leveledUp = false;

    while (userProfile.leveling.xp >= xpForNextLevel) {
        userProfile.leveling.level++;
        userProfile.leveling.xp -= xpForNextLevel;
        xpForNextLevel = getXpForLevel(userProfile.leveling.level);
        leveledUp = true;
    }

    if (leveledUp && channel) {
        try {
            // Generate gambar dari Canvas
            const levelCanvas = await CanvasUtils.generateLevel(user, userProfile.leveling.level);
            
            // ==========================================
            // ✨ PENGUMUMAN LEVEL UP MEWAH (EMBED)
            // ==========================================
            const levelUpEmbed = new EmbedBuilder()
                .setColor('#FFD700') // Warna Emas Premium
                .setAuthor({ name: '✦ 𝐀𝐂𝐇𝐈𝐄𝐕𝐄𝐌𝐄𝐍𝐓 𝐔𝐍𝐋𝐎𝐂𝐊𝐄𝐃 ✦', iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setTitle(`Pencapaian Baru Diraih!`)
                .setDescription(`Luar biasa, **${user.username}**!\nDedikasimu membuahkan hasil. Kamu telah berevolusi dan mencapai tingkat yang lebih tinggi di server ini.`)
                .addFields(
                    { name: '🌟 Tingkat Kekuatan', value: `\`Level ${userProfile.leveling.level}\``, inline: true },
                    { name: '✨ Status Peringkat', value: `\`Meningkat\``, inline: true }
                )
                // Memasang gambar canvas ke dalam embed agar lebih rapi
                .setImage('attachment://levelup_card.png')
                .setFooter({ text: 'Teruslah aktif untuk mencapai puncak kejayaan!', iconURL: 'https://cdn-icons-png.flaticon.com/512/5414/5414154.png' });

            channel.send({ 
                content: `<@${userId}>`, // Mention user di luar embed agar tetap masuk notifikasi
                embeds: [levelUpEmbed], 
                files: [{ attachment: levelCanvas, name: 'levelup_card.png' }] 
            });
        } catch (err) {
            console.error('Gagal mengirim gambar level up:', err);
            
            // Fallback elegan jika Canvas error
            const fallbackEmbed = new EmbedBuilder()
                .setColor('#FFD700')
                .setAuthor({ name: '✦ 𝐋𝐄𝐕𝐄𝐋 𝐔𝐏 ✦', iconURL: user.displayAvatarURL({ dynamic: true }) })
                .setDescription(`Selamat <@${userId}>! Evolusimu berhasil, kamu kini berada di **Level ${userProfile.leveling.level}**! ✨`);
            channel.send({ embeds: [fallbackEmbed] });
        }
    }

    // Jangan lupa simpan perubahan
    await userProfile.save();
}

module.exports = { getXpForLevel, awardXp };