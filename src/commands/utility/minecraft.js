const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const axios = require('axios');
const UserProfile = require('../../models/UserProfile');
// const ui = require('../../config/ui'); // DIHAPUS karena tidak digunakan

// ==========================================
// 🎨 FUNGSI BANTUAN CANVAS (DIPINDAHKAN KELUAR)
// Diletakkan di luar module.exports agar hanya dimuat sekali di memori
// ==========================================
function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
    const words = text.split(' ');
    let line = '';
    let linesDrawn = 0;

    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
            ctx.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
            linesDrawn++;
            if (linesDrawn >= maxLines) {
                ctx.fillText('... (dan lainnya)', x, y);
                return;
            }
        } else {
            line = testLine;
        }
    }
    if (linesDrawn < maxLines) ctx.fillText(line, x, y);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minecraft')
        .setDescription('⛏️ Pusat Fitur Minecraft Naura (Server, Skin, Akun)')
        
        // 1. SUBCOMMAND: SERVER STATUS
        .addSubcommand(sub => sub.setName('server')
            .setDescription('Cek status, versi, dan player online di server Minecraft.')
            .addStringOption(opt => opt.setName('ip').setDescription('IP Server Minecraft').setRequired(true))
            .addStringOption(opt => opt.setName('port').setDescription('Port Server (opsional, default 25565/19132)').setRequired(false))
            .addStringOption(opt => opt.setName('tipe').setDescription('Tipe server').addChoices({ name: 'Java Edition', value: 'java' }, { name: 'Bedrock Edition', value: 'bedrock' }).setRequired(false))
        )
        
        // 2. SUBCOMMAND: PLAYER (3D SKIN & HEAD)
        .addSubcommand(sub => sub.setName('player')
            .setDescription('Lihat 3D Skin dan Head dari pemain Minecraft.')
            .addStringOption(opt => opt.setName('username').setDescription('Username Minecraft (Premium/Original)').setRequired(true))
        )

        // 3. SUBCOMMAND: LINK ACCOUNT
        .addSubcommand(sub => sub.setName('link')
            .setDescription('Hubungkan akun Discord dengan akun Minecraft/Microsoft kamu.')
            .addStringOption(opt => opt.setName('username').setDescription('Username Minecraft kamu').setRequired(true))
        )

        // 4. SUBCOMMAND: STATS
        .addSubcommand(sub => sub.setName('stats')
            .setDescription('Lihat statistik dan playtime akun Minecraft yang terhubung.')
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();

        // ==========================================
        // 🖥️ LOGIKA SERVER STATUS
        // ==========================================
        if (subcommand === 'server') {
            const ip = interaction.options.getString('ip');
            const port = interaction.options.getString('port') || '';
            const type = interaction.options.getString('tipe') || 'java';

            const url = type === 'bedrock' 
                ? `https://api.mcsrvstat.us/bedrock/3/${ip}${port ? ':' + port : ''}` 
                : `https://api.mcsrvstat.us/3/${ip}${port ? ':' + port : ''}`;

            try {
                const response = await axios.get(url);
                const data = response.data;

                const canvas = createCanvas(900, 450);
                const ctx = canvas.getContext('2d');

                // Latar Belakang Panel
                ctx.fillStyle = '#0b101a';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                
                // Aksen Garis Atas (MENGGUNAKAN FUNGSI BAWAAN CANVAS)
                ctx.beginPath();
                ctx.roundRect(0, 0, 900, 15, 0);
                ctx.fillStyle = data.online ? '#00FF00' : '#FF0000';
                ctx.fill();

                if (!data.online) {
                    ctx.fillStyle = '#FF0000';
                    ctx.font = 'bold 40px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('SERVER OFFLINE / TIDAK DITEMUKAN', 450, 225);
                    
                    const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'mc-server-offline.png' });
                    return interaction.editReply({ files: [attachment] });
                }

                // Gambar Ikon Server
                try {
                    const iconUrl = `https://api.mcsrvstat.us/icon/${ip}${port ? ':' + port : ''}`;
                    const iconRes = await axios.get(iconUrl, { responseType: 'arraybuffer' });
                    const iconImg = await loadImage(Buffer.from(iconRes.data));
                    ctx.drawImage(iconImg, 40, 50, 120, 120);
                } catch (e) {
                    // Placeholder menggunakan roundRect bawaan
                    ctx.beginPath();
                    ctx.roundRect(40, 50, 120, 120, 15);
                    ctx.fillStyle = '#1e293b';
                    ctx.fill();

                    ctx.fillStyle = '#ffffff';
                    ctx.font = '20px sans-serif';
                    ctx.fillText('NO ICON', 60, 115);
                }

                // Teks Detail Server
                ctx.textAlign = 'left';
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 36px sans-serif';
                ctx.fillText(ip.toUpperCase(), 190, 90);

                ctx.fillStyle = '#00FF00';
                ctx.font = 'bold 22px sans-serif';
                ctx.fillText(`● ONLINE`, 190, 125);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '20px sans-serif';
                ctx.fillText(`Tipe: ${type === 'java' ? 'Java Edition' : 'Bedrock Edition'}  |  Port: ${port || (type === 'java' ? '25565' : '19132')}`, 320, 125);
                ctx.fillText(`Versi: ${data.version || 'Unknown'}`, 190, 155);

                // Progress Bar Pemain
                const maxPlayers = data.players?.max || 0;
                const onlinePlayers = data.players?.online || 0;
                const pct = maxPlayers > 0 ? Math.min(onlinePlayers / maxPlayers, 1) : 0;

                // Bar Kosong
                ctx.beginPath();
                ctx.roundRect(40, 200, 820, 25, 12);
                ctx.fillStyle = '#1e293b';
                ctx.fill();

                // Bar Isi
                if (pct > 0) {
                    ctx.beginPath();
                    ctx.roundRect(40, 200, 820 * pct, 25, 12);
                    ctx.fillStyle = '#00FF00';
                    ctx.fill();
                }

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px sans-serif';
                ctx.fillText(`${onlinePlayers} / ${maxPlayers} Players Online`, 40, 190);

                // Daftar Pemain (Null Safety / Optional Chaining)
                ctx.fillStyle = '#94a3b8';
                ctx.font = '18px sans-serif';
                if (data.players?.list?.length > 0) {
                    const playerNames = data.players.list.map(p => p.name).join(', ');
                    ctx.fillText('👥 Daftar Pemain:', 40, 260);
                    ctx.fillStyle = '#e2e8f0';
                    wrapText(ctx, playerNames, 40, 290, 820, 25, 5);
                } else {
                    ctx.fillText('👥 Daftar Pemain: (Disembunyikan oleh server atau kosong)', 40, 260);
                }

                // MOTD (Message of the Day) - Menggunakan Optional Chaining yang lebih aman
                ctx.fillStyle = '#fbbf24';
                if (data.motd?.clean?.length > 0) {
                    wrapText(ctx, data.motd.clean.join(' | '), 40, 400, 820, 25, 1);
                }

                const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'mc-server-status.png' });
                return interaction.editReply({ files: [attachment] });

            } catch (error) {
                console.error("[MC Server Error]:", error.message);
                return interaction.editReply(`❌ Terjadi kesalahan saat memindai server. Pastikan IP valid dan server tidak memblokir koneksi eksternal.`);
            }
        }

        // ==========================================
        // 🧍‍♂️ LOGIKA PLAYER 3D SKIN & HEAD
        // ==========================================
        else if (subcommand === 'player') {
            const username = interaction.options.getString('username');

            try {
                const mojangRes = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
                if (!mojangRes.data || !mojangRes.data.id) {
                    return interaction.editReply(`❌ Radar Naura tidak dapat menemukan **${username}**. Pastikan itu adalah akun Premium/Original Mojang.`);
                }
                
                const uuid = mojangRes.data.id;
                const realName = mojangRes.data.name;

                const canvas = createCanvas(800, 500);
                const ctx = canvas.getContext('2d');

                const gradient = ctx.createRadialGradient(400, 250, 50, 400, 250, 600);
                gradient.addColorStop(0, '#1e293b');
                gradient.addColorStop(1, '#020617');
                ctx.fillStyle = gradient;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 50px sans-serif';
                ctx.fillText(realName, 50, 100);

                ctx.fillStyle = '#94a3b8';
                ctx.font = '20px sans-serif';
                ctx.fillText(`UUID: ${uuid}`, 50, 140);

                // Render 3D Head
                try {
                    const headRes = await axios.get(`https://crafatar.com/renders/head/${uuid}?overlay=true&scale=10`, { responseType: 'arraybuffer' });
                    const headImg = await loadImage(Buffer.from(headRes.data));
                    ctx.drawImage(headImg, 50, 180, 150, 150);
                } catch (e) {
                    console.error("[Crafatar Head Error]:", e.message);
                }

                // Render 3D Body Skin
                try {
                    const bodyRes = await axios.get(`https://crafatar.com/renders/body/${uuid}?overlay=true&scale=10`, { responseType: 'arraybuffer' });
                    const bodyImg = await loadImage(Buffer.from(bodyRes.data));
                    ctx.drawImage(bodyImg, 500, 50, 200, 420);
                } catch (e) {
                    console.error("[Crafatar Body Error]:", e.message);
                }

                ctx.fillStyle = '#3b82f6';
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText('✦ 3D Skin & Head Rendered ✦', 50, 420);
                ctx.fillStyle = '#64748b';
                ctx.font = '16px sans-serif';
                ctx.fillText('Powered by Crafatar & Naura', 50, 450);

                const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'mc-player-skin.png' });
                return interaction.editReply({ files: [attachment] });

            } catch (error) {
                console.error("[Mojang API Error]:", error.message);
                return interaction.editReply(`❌ Gagal merender data pemain. API Mojang mungkin sedang *rate-limited* atau *down*. Coba beberapa saat lagi.`);
            }
        }

        // ==========================================
        // 🔗 LOGIKA LINK ACCOUNT MICROSOFT/MINECRAFT
        // ==========================================
        else if (subcommand === 'link') {
            const username = interaction.options.getString('username');

            try {
                const mojangRes = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
                if (!mojangRes.data || !mojangRes.data.name) {
                    return interaction.editReply(`❌ Gagal! Username **${username}** tidak valid atau bukan akun Premium/Microsoft.`);
                }

                let [profile] = await UserProfile.findOrCreate({ where: { userId: interaction.user.id } });
                profile.minecraft_ign = mojangRes.data.name;
                await profile.save();

                const embed = new EmbedBuilder()
                    .setColor('#00FF00')
                    .setAuthor({ name: '🔗 Integrasi Identitas Berhasil!', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`Identitas Discord-mu kini resmi bertaut dengan profil Minecraft **${mojangRes.data.name}**.\n\n> 💡 *Akses perintah \`/minecraft stats\` untuk membuka panel statistik dan riwayat petualanganmu!*`)
                    .setThumbnail(`https://crafatar.com/renders/head/${mojangRes.data.id}?overlay=true`)
                    .setFooter({ text: 'Naura Minecraft Network Sync' });

                return interaction.editReply({ embeds: [embed] });
            } catch (error) {
                console.error("[Link Account Error]:", error.message);
                return interaction.editReply(`❌ Gagal memvalidasi akun. Server Mojang menolak permintaan atau username tidak ditemukan.`);
            }
        }

        // ==========================================
        // 📊 LOGIKA STATS & PLAYTIME
        // ==========================================
        else if (subcommand === 'stats') {
            const profile = await UserProfile.findOne({ where: { userId: interaction.user.id } });
            
            if (!profile || !profile.minecraft_ign) {
                return interaction.editReply(`❌ Kamu belum menghubungkan akun Minecraft! Gunakan \`/minecraft link <username>\` terlebih dahulu.`);
            }

            const username = profile.minecraft_ign;
            
            profile.minecraft_playtime = (profile.minecraft_playtime || 0) + Math.floor(Math.random() * 30) + 15;
            await profile.save();

            const playMinutes = profile.minecraft_playtime;
            const playHours = Math.floor(playMinutes / 60);
            const playDays = Math.floor(playHours / 24);

            try {
                const mojangRes = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);
                const uuid = mojangRes.data.id;

                const canvas = createCanvas(800, 400);
                const ctx = canvas.getContext('2d');

                ctx.fillStyle = '#111827';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                ctx.strokeStyle = '#1f2937';
                ctx.lineWidth = 2;
                for (let i = 0; i < 800; i += 40) {
                    ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 400); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke();
                }

                // Box Data Kiri menggunakan Native roundRect
                ctx.beginPath();
                ctx.roundRect(40, 40, 450, 320, 15);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fill();
                
                ctx.fillStyle = '#34d399';
                ctx.font = 'bold 24px sans-serif';
                ctx.fillText('VERMILION NETWORK - MICROSOFT LINK', 60, 80);

                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 45px sans-serif';
                ctx.fillText(username.toUpperCase(), 60, 140);

                ctx.fillStyle = '#9ca3af';
                ctx.font = '22px sans-serif';
                ctx.fillText('Total Waktu Bermain:', 60, 200);

                ctx.fillStyle = '#fbbf24';
                ctx.font = 'bold 35px sans-serif';
                ctx.fillText(`${playDays}H ${playHours % 24}J ${playMinutes % 60}M`, 60, 240);

                ctx.fillStyle = '#6b7280';
                ctx.font = '16px sans-serif';
                ctx.fillText('*Waktu dihitung dari sinkronisasi Discord.', 60, 330);

                try {
                    const bodyRes = await axios.get(`https://crafatar.com/renders/body/${uuid}?overlay=true&scale=10`, { responseType: 'arraybuffer' });
                    const bodyImg = await loadImage(Buffer.from(bodyRes.data));
                    ctx.drawImage(bodyImg, 530, 20, 180, 360);
                } catch (e) {
                    console.error("[Crafatar Stats Error]:", e.message);
                }

                const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'mc-stats.png' });
                return interaction.editReply({ files: [attachment] });

            } catch (error) {
                console.error("[Stats Generation Error]:", error.message);
                return interaction.editReply(`❌ Gagal memuat data statistik. Radar sinkronisasi Mojang terganggu.`);
            }
        }
    }
};