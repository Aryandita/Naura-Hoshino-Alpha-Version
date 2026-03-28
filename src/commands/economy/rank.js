const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const ui = require('../../config/ui');
// Ganti path ini sesuai dengan letak database User Master
// const User = require('../../models/User'); 

// ==========================================
// 🎨 FUNGSI PEMBUAT PROGRESS BAR XP (WARNA-WARNI)
// ==========================================
function createXpBar(currentXp, requiredXp, size = 16) {
    // Menggunakan blok warna agar terlihat seperti bar HP di game RPG
    const filledChar = '🟩'; 
    const emptyChar = '⬛';
    
    // Mencegah error pembagian dengan nol
    if (requiredXp === 0) requiredXp = 1; 
    
    const progress = Math.round((size * currentXp) / requiredXp);
    const emptyProgress = size - progress;
    
    const bar = filledChar.repeat(Math.max(0, progress)) + emptyChar.repeat(Math.max(0, emptyProgress));
    
    // Menghitung persentase
    const percentage = Math.floor((currentXp / requiredXp) * 100);
    return { bar, percentage };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('🌟 Cek level, XP, dan Rank kamu di server ini!')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Lihat rank milik orang lain (opsional)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        // 1. Menentukan Target User (Diri sendiri atau orang lain)
        const targetUser = interaction.options.getUser('target') || interaction.user;
        const targetMember = await interaction.guild.members.fetch(targetUser.id).catch(() => null);

        // Abaikan jika target adalah Bot
        if (targetUser.bot) {
            return interaction.editReply({ 
                embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} Hmph! Bot seperti Naura tidak butuh level, Master!`)] 
            });
        }

        // ==========================================
        // 💾 MENGAMBIL DATA DARI DATABASE
        // ==========================================
        // (CONTOH LOGIKA DATABASE - Sesuaikan dengan kodingan Master)
        /*
        let userData = await User.findOne({ userId: targetUser.id, guildId: interaction.guildId });
        if (!userData) {
            userData = { level: 1, xp: 0, totalMessages: 0 }; // Data default jika belum ada
        }
        */

        // Data Dummy untuk simulasi tampilan UI (Hapus ini jika sudah pakai database asli di atas)
        const userData = {
            level: 15,
            xp: 3450,
            rank: 3,          // Peringkat ke-3 di server
            totalMessages: 1240
        };

        // Rumus XP (Contoh: Butuh XP = Level saat ini * 300)
        const requiredXp = userData.level * 300; 
        
        // Buat Progress Bar
        const xpData = createXpBar(userData.xp, requiredXp);

        // ==========================================
        // 🖼️ BANNER BUATAN NAURA & WARNA DINAMIS
        // ==========================================
        // Warna rank berubah tergantung level (Warna-warni!)
        let rankColor = ui.colors.kythiaDark;
        let rankTier = "Pemula";
        
        if (userData.level >= 50) { rankColor = '#FF00FF'; rankTier = "👑 Legenda Server"; } // Magenta
        else if (userData.level >= 30) { rankColor = '#FFD700'; rankTier = "⚔️ Veteran"; }     // Emas
        else if (userData.level >= 15) { rankColor = '#00FF00'; rankTier = "🛡️ Penjelajah"; }  // Hijau
        else if (userData.level >= 5) { rankColor = '#00FFFF'; rankTier = "🎒 Petualang"; }    // Cyan

        // Banner Estetik Cyberpunk/Neon Anime Spesial untuk Master
        const customBanner = 'https://i.pinimg.com/originals/18/d9/3e/18d93e2b217e94e5e03248384661ea77.gif';

        // ==========================================
        // ✨ MERAKIT KARTU RANK (EMBED UI)
        // ==========================================
        const rankEmbed = new EmbedBuilder()
            .setColor(rankColor)
            .setAuthor({ name: `Kartu Identitas Rank`, iconURL: interaction.client.user.displayAvatarURL() })
            .setTitle(`✨ ${targetUser.username.toUpperCase()} ✨`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 512 }))
            .setImage(customBanner) // Memasang Banner buatan Naura
            .setDescription(`**Julukan:** \`${rankTier}\`\nTeruslah mengobrol untuk mencapai tingkat selanjutnya!`)
            
            // Kolom Data Warna-Warni
            .addFields(
                { name: '🏆 Peringkat', value: `\`#${userData.rank}\` di Server`, inline: true },
                { name: '⭐ Level', value: `\`Lv. ${userData.level}\``, inline: true },
                { name: '💬 Total Pesan', value: `\`${userData.totalMessages} Pesan\``, inline: true },
                
                // Kolom Progress Bar Lebar
                { 
                    name: `📈 Progres Pengalaman (XP: ${userData.xp} / ${requiredXp})`, 
                    value: `${xpData.bar} **\`${xpData.percentage}%\`**`, 
                    inline: false 
                }
            )
            .setFooter({ text: `Diminta oleh ${interaction.user.username} • Naura Leveling System`, iconURL: interaction.user.displayAvatarURL() })
            .setTimestamp();

        // Mengirimkan UI ke Discord
        await interaction.editReply({ embeds: [rankEmbed] });
    }
};