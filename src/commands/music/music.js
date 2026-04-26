const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, AttachmentBuilder } = require('discord.js');
const ui = require('../../config/ui');
const UserProfile = require('../../models/UserProfile');
const GuildSettings = require('../../models/GuildSettings');
const UserPlaylist = require('../../models/UserPlaylist');
const spotifyHelper = require('../../utils/spotifyHelper');
const { generateMusicProfileImage } = require('../../utils/canvasHelper'); 

const formatDuration = (ms) => {
    if (!ms || isNaN(ms)) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

// ==========================================
// 🧠 CORE LOGIC (UNTUK SLASH & PREFIX)
// ==========================================
async function runMusicLogic(client, user, member, guild, channel, subcommand, args, sendReply, isSlash) {
    const poru = client.musicManager.poru;
    const memberVoice = member?.voice?.channel;
    const eError = ui.getEmoji('error') || '❌';
    const errorEmbed = new EmbedBuilder().setColor(ui.getColor('error') || '#ff0000');

    if (subcommand === 'profile') {
        let target = user;
        if (isSlash && args.target) target = args.target;

        if (target.bot) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Bot tidak memiliki kartu profil musik!`)] });

        try {
            const [profile] = await UserProfile.findOrCreate({ where: { userId: target.id } });
            const stats = { 
                tracksListened: profile.music_tracksListened || 0, 
                totalDurationMs: profile.music_totalDurationMs || 0, 
                lastListened: profile.music_lastListened || 'Belum ada data pemutaran.' 
            };
            const imageBuffer = await generateMusicProfileImage(target, stats, client.user.displayAvatarURL({ extension: 'png' }));
            const attachment = new AttachmentBuilder(imageBuffer, { name: 'naura-audiophile.png' });
            return sendReply({ content: null, embeds: [], files: [attachment] });
        } catch (error) { 
            return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Gagal merender kartu profil dari server render Naura.`)] }); 
        }
    }

    if (!memberVoice) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Anda harus berada di dalam Voice Channel terlebih dahulu!`)] });

    let player = poru.players.get(guild.id);

    if (subcommand === 'play') {
        if (player && player.voiceChannel !== memberVoice.id) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Naura sedang aktif di Voice Channel lain.`)] });

        if (!player) {
            player = poru.createConnection({ guildId: guild.id, voiceChannel: memberVoice.id, textChannel: channel.id, deaf: true });
            player.is247 = false; 
        }

        const query = args.query;
        if (!query) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Harap masukkan judul lagu atau URL yang ingin diputar.`)] });

        let res;
        if (query.match(/^(https?:\/\/)/)) {
            // Karena ada Lavasrc, lempar URL mentah ke server Lavalink.
            res = await poru.resolve({ query: query, requester: user });
            
            // FALLBACK: Jika Lavalink gagal memutar Spotify (Mungkin tidak ada API Key disana)
            if ((!res || !res.tracks || res.tracks.length === 0 || res.loadType === 'empty' || res.loadType === 'NO_MATCHES') && (query.includes('spotify.com/playlist') || query.includes('spotify.com/album'))) {
                const playlistData = await spotifyHelper.getPlaylistTracks(query);
                if (playlistData && playlistData.tracks && playlistData.tracks.length > 0) {
                    const actionEmbed2 = new EmbedBuilder().setColor('#1DB954')
                        .setDescription(`⏳ Memuat \`${playlistData.tracks.length}\` lagu dari Spotify... (Trik Anonim Berhasil)`);
                    await sendReply({ embeds: [actionEmbed2] });
                    
                    let loaded = 0;
                    let firstTrack = null;
                    
                    // Proses background tanpa membuat interaksi nyangkut
                    (async () => {
                        for (const q of playlistData.tracks) {
                            try {
                                const sr = await poru.resolve({ query: q, source: 'ytmsearch', requester: user });
                                if (sr && sr.tracks && sr.tracks.length > 0) {
                                    player.queue.add(sr.tracks[0]);
                                    loaded++;
                                    if (!firstTrack) {
                                        firstTrack = sr.tracks[0];
                                        if (!player.isPlaying && !player.isPaused) player.play();
                                        actionEmbed2.setDescription(`### 🟢 Playlist: ${playlistData.name}\n${ui.getEmoji('nowplaying')} **Mulai:** [${firstTrack.info.title}](${firstTrack.info.uri})\n*Sisa lagu akan ditambahkan di latar belakang...*`);
                                        sendReply({ embeds: [actionEmbed2] });
                                    }
                                }
                            } catch(e){}
                        }
                    })();
                    return;
                }
            }
        } else {
            // Lavasrc mendukung 'spsearch' (Pencarian teks menggunakan API Spotify)
            res = await poru.resolve({ query: query, source: 'spsearch', requester: user });
            
            // Fallback ke YouTube Music jika tidak ditemukan di Spotify
            if (!res || !res.tracks || res.tracks.length === 0) {
                res = await poru.resolve({ query: query, source: 'ytmsearch', requester: user });
            }
        }

        if (!res || !res.tracks || res.tracks.length === 0 || res.loadType === 'empty' || res.loadType === 'NO_MATCHES') {
            return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada frekuensi audio yang ditemukan dari database global.`)] });
        }

        const actionEmbed = new EmbedBuilder().setColor(ui.getColor('primary') || '#00D9FF');

        if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED' || query.includes('list=')) {
            const trackToPlay = res.tracks[0];
            for (const track of res.tracks) player.queue.add(track);
            actionEmbed
                .setThumbnail(trackToPlay.info.image || client.user.displayAvatarURL())
                .setDescription(`### ${ui.getEmoji('nowplaying')} Playlist Dimuat\n${ui.getEmoji('musicArtist')} **Total:** \`${res.tracks.length} Lagu\`\n⏳ Memasukkan ke dalam antrean sistem.`);
            sendReply({ embeds: [actionEmbed] });
            if (!player.isPlaying && !player.isPaused) player.play();
            return;
        }

        const track = res.tracks[0];
        player.queue.add(track);
        if (!player.isPlaying && !player.isPaused) player.play();

        actionEmbed
            .setThumbnail(track.info.image || client.user.displayAvatarURL())
            .setDescription(`### ${ui.getEmoji('nowplaying')} [${track.info.title}](${track.info.uri})\n${ui.getEmoji('musicArtist')} **Artis:** \`${track.info.author}\`\n⏳ **Durasi:** \`${formatDuration(track.info.length)}\``);

        return sendReply({ embeds: [actionEmbed] }); 
    }

    if (subcommand === 'import') {
        const url = args.url || args.query;
        if (!url || !url.match(/^https?:\/\//)) {
            return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Harap masukkan URL Playlist yang valid (Spotify/YouTube/Soundcloud).`)] });
        }

        const actionEmbed = new EmbedBuilder().setColor('#1DB954'); 
        actionEmbed.setDescription(`⏳ Sedang menganalisis URL dan mengimpor playlist...`);
        await sendReply({ embeds: [actionEmbed] });

        let playlistName = 'Imported Playlist';
        let tracksToSave = [];

        try {
            // Mencoba menggunakan Lavalink (Poru) secara native terlebih dahulu (mendukung YT, Spotify Lavasrc, dll)
            const res = await poru.resolve({ query: url, requester: user });
            
            if (res && (res.loadType === 'PLAYLIST_LOADED' || res.loadType === 'playlist')) {
                playlistName = res.playlistInfo.name || 'Imported Playlist';
                tracksToSave = res.tracks.map(t => t.info.uri || t.info.title);
            } else if (url.includes('spotify.com')) {
                // Fallback ke Scraper Web jika Lavalink tidak mendukung Spotify (Lavasrc 403 Forbidden Error)
                const playlistData = await spotifyHelper.getPlaylistTracks(url);
                if (playlistData && playlistData.tracks && playlistData.tracks.length > 0) {
                    playlistName = playlistData.name || 'Spotify Playlist';
                    tracksToSave = playlistData.tracks;
                }
            }

            if (tracksToSave.length === 0) {
                return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Gagal mengimpor data. Pastikan URL playlist bersifat publik dan valid.`)] });
            }

            await UserPlaylist.create({
                userId: user.id,
                name: playlistName,
                tracks: tracksToSave,
                spotifyUrl: url
            });

            actionEmbed.setDescription(`### 🟢 Berhasil Diimpor\n**Nama:** \`${playlistName}\`\n**Total Lagu:** \`${tracksToSave.length} Trek\`\n\nGunakan perintah \`/music myplaylist\` untuk melihat, dan \`/music playplaylist\` untuk memutarnya!`);
            return sendReply({ embeds: [actionEmbed] });
        } catch (error) {
            console.error(error);
            return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Terjadi kesalahan saat memproses URL tersebut.`)] });
        }
    }

    if (subcommand === 'myplaylist') {
        const playlists = await UserPlaylist.findAll({ where: { userId: user.id } });
        if (playlists.length === 0) {
            return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Kamu belum memiliki playlist tersimpan. Gunakan \`/music import <url>\` terlebih dahulu.`)] });
        }

        const embed = new EmbedBuilder().setColor(ui.getColor('primary')).setTitle('📁 Daftar Playlist Tersimpan');
        let desc = '';
        playlists.forEach((p, i) => {
            desc += `**${i + 1}.** ${p.name} (\`${p.tracks.length} Lagu\`)\n*ID Play:* \`${p.id}\`\n\n`;
        });
        embed.setDescription(desc || 'Kosong');
        return sendReply({ embeds: [embed] });
    }

    if (subcommand === 'playplaylist') {
        if (!memberVoice) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Anda harus berada di dalam Voice Channel terlebih dahulu!`)] });

        const pid = args.id;
        if (!pid) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Harap masukkan ID Playlist yang ingin diputar.`)] });

        const playlist = await UserPlaylist.findOne({ where: { id: pid, userId: user.id } });
        if (!playlist) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Playlist dengan ID tersebut tidak ditemukan atau bukan milikmu.`)] });

        if (!player) {
            player = poru.createConnection({ guildId: guild.id, voiceChannel: memberVoice.id, textChannel: channel.id, deaf: true });
            player.is247 = false; 
        }

        if (player && player.voiceChannel !== memberVoice.id) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Naura sedang aktif di Voice Channel lain.`)] });

        const actionEmbed = new EmbedBuilder().setColor('#1DB954')
            .setDescription(`⏳ Memuat \`${playlist.tracks.length}\` lagu dari **${playlist.name}**...\n*Naura akan otomatis menkonversi playlist ini ke YouTube.*`);
        await sendReply({ embeds: [actionEmbed] });

        let loaded = 0;
        let firstTrack = null;

        (async () => {
            for (const query of playlist.tracks) {
                try {
                    const res = await poru.resolve({ query: query, source: 'ytmsearch', requester: user });
                    if (res && res.tracks && res.tracks.length > 0) {
                        player.queue.add(res.tracks[0]);
                        loaded++;
                        if (!firstTrack) {
                            firstTrack = res.tracks[0];
                            if (!player.isPlaying && !player.isPaused) player.play();
                            actionEmbed.setDescription(`### 🟢 Memutar Playlist Tersimpan\n**Nama:** \`${playlist.name}\`\n${ui.getEmoji('nowplaying')} **Lagu Pertama:** [${firstTrack.info.title}](${firstTrack.info.uri})\n*Sedang memuat sisa lagu secara asinkron di latar belakang...*`);
                            sendReply({ embeds: [actionEmbed] });
                        }
                    }
                } catch (e) {}
            }
            
            // Konfirmasi akhir (bisa dikirim sbg followUp ke text channel agar tidak mengganggu)
            actionEmbed.setDescription(`### ✅ Sinkronisasi Selesai\n**Nama:** \`${playlist.name}\`\n**Berhasil Dimuat:** \`${loaded} / ${playlist.tracks.length} Lagu\``);
            channel.send({ embeds: [actionEmbed] }).catch(()=>{});
        })();

        return;
    }

    if (subcommand === 'pause') {
        if (!player || !player.isPlaying) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada lagu yang sedang diputar.`)] });
        if (player.isPaused) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Musik sudah dalam keadaan dijeda.`)] });
        player.pause(true);
        return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF').setDescription(`⏸️ | Transmisi audio telah dijeda.`)] });
    }

    if (subcommand === 'resume') {
        if (!player || !player.isPlaying) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada lagu yang sedang diputar.`)] });
        if (!player.isPaused) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Musik tidak sedang dijeda.`)] });
        player.pause(false);
        return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF').setDescription(`▶️ | Transmisi audio dilanjutkan.`)] });
    }

    if (subcommand === 'nowplaying') {
        if (!player || !player.currentTrack) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada lagu yang sedang diputar.`)] });
        const track = player.currentTrack.info;
        const npEmbed = new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF')
            .setTitle('🎶 Memutar Saat Ini')
            .setDescription(`**[${track.title}](${track.uri})**`)
            .addFields(
                { name: 'Artis', value: track.author || 'Tidak diketahui', inline: true },
                { name: 'Durasi', value: formatDuration(track.length), inline: true }
            );
        return sendReply({ embeds: [npEmbed] });
    }

    if (subcommand === 'queue') {
        if (!player || player.queue.length === 0) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Antrean lagu kosong.`)] });
        const q = player.queue.slice(0, 10).map((t, i) => `**${i + 1}.** [${t.info.title}](${t.info.uri}) - \`${formatDuration(t.info.length)}\``).join('\n');
        const qEmbed = new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF')
            .setTitle('📜 Antrean Musik')
            .setDescription(q + (player.queue.length > 10 ? `\n\n*...dan ${player.queue.length - 10} lagu lainnya.*` : ''));
        return sendReply({ embeds: [qEmbed] });
    }

    if (subcommand === 'loop') {
        if (!player) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada lagu yang sedang diputar.`)] });
        const mode = args.mode || args.query; 
        if (mode === 'track') { player.setLoop('TRACK'); return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF').setDescription(`🔂 | Mode pengulangan **LAGU SAAT INI** diaktifkan.`)] }); }
        if (mode === 'queue') { player.setLoop('QUEUE'); return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF').setDescription(`🔁 | Mode pengulangan **SELURUH ANTREAN** diaktifkan.`)] }); }
        player.setLoop('NONE'); return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF').setDescription(`❌ | Mode pengulangan **DIMATIKAN**.`)] });
    }

    if (subcommand === 'shuffle') {
        if (!player || player.queue.length === 0) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Antrean lagu kosong.`)] });
        player.queue.shuffle();
        return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF').setDescription(`🔀 | Urutan ${player.queue.length} lagu di antrean telah diacak.`)] });
    }

    if (subcommand === 'clear') {
        if (!player || player.queue.length === 0) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Antrean lagu kosong.`)] });
        player.queue.clear();
        return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary') || '#00FFFF').setDescription(`🗑️ | Seluruh antrean lagu telah dibersihkan.`)] });
    }

    if (subcommand === 'stop') {
        if (!player) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada frekuensi aktif yang sedang diputar.`)] });
        player.is247 = false; player.destroy();
        return sendReply({ embeds: [errorEmbed.setColor('#ff0000').setDescription(`${ui.getEmoji('musicStop')} | Sesi transmisi audio dihentikan sepenuhnya. Naura pamit!`)] });
    }

    if (subcommand === 'skip') {
        if (!player || !player.currentTrack) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada musik yang bisa dilewati.`)] });
        if (typeof player.stopTrack === 'function') player.stopTrack();
        else if (player.node && player.node.rest) player.node.rest.updatePlayer({ guildId: player.guildId, data: { track: { encoded: null } } }).catch(()=>{});
        return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary')).setDescription(`${ui.getEmoji('musicSkip')} | Melewati trek saat ini. Memutar urutan selanjutnya...`)] });
    }

    if (subcommand === 'volume') {
        if (!player) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Tidak ada frekuensi aktif yang sedang diputar.`)] });
        const vol = args.persen;
        if (!vol || isNaN(vol) || vol < 10 || vol > 100) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Harap masukkan angka volume antara 10 - 100.`)] });
        player.setVolume(vol);
        return sendReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary')).setDescription(`${vol >= 50 ? ui.getEmoji('musicVolUp') : ui.getEmoji('musicVolDown')} | Intensitas volume audio disetel ke **${vol}%**.`)] });
    }

    if (subcommand === '247') {
        // --- PREMIUM LOCK ---
        let [profile] = await UserProfile.findOrCreate({ where: { userId: user.id } });
        if (!profile.isPremium || !profile.premiumUntil || profile.premiumUntil <= new Date()) {
            return sendReply({ 
                embeds: [
                    new EmbedBuilder()
                        .setColor(ui.getColor('error') || '#FF0000')
                        .setTitle('💎 Fitur V.I.P Terkunci')
                        .setDescription(`${eError} | Akses ditolak! Mode siaga 24/7 membebani memori server musik. Ini adalah fitur eksklusif untuk member **Premium** Naura. Hubungi Developer untuk akses.`)
                ] 
            });
        }
        // --------------------

        if (!player) return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Putar lagu terlebih dahulu untuk mengaktifkan Mode 24/7.`)] });
        player.is247 = !player.is247;
        try {
            const [guildData] = await GuildSettings.findOrCreate({ where: { guildId: guild.id } });
            let musicData = guildData.music || {};
            musicData.twentyFourSeven = player.is247;
            musicData.voiceChannel = player.is247 ? player.voiceChannel : null;
            musicData.textChannel = player.is247 ? player.textChannel : null;
            guildData.music = musicData;
            guildData.changed('music', true);
            await guildData.save();
        } catch (e) {}
        return sendReply({ embeds: [new EmbedBuilder().setColor(player.is247 ? ui.getColor('primary') : '#2b2d31').setDescription(`${ui.getEmoji('music247')} | Mode Siaga 24/7 **${player.is247 ? 'DIAKTIFKAN' : 'DIMATIKAN'}**.\n*Naura ${player.is247 ? 'akan menetap di' : 'akan keluar dari'} Voice Channel saat antrean habis.*`)] });
    }

    // Jika subcommand tidak dikenal
    return sendReply({ embeds: [errorEmbed.setDescription(`${eError} | Perintah audio tidak dikenali.`)] });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('🎵 Sistem Audio Premium Resolusi Tinggi Naura')
        .addSubcommand(sub => sub.setName('play').setDescription('Putar mahakarya musik dari internet.')
            .addStringOption(opt => opt.setName('query').setDescription('Ketik judul lagu atau link Spotify').setRequired(true).setAutocomplete(true)))
        .addSubcommand(sub => sub.setName('import').setDescription('Impor dan simpan Playlist Spotify ke database pribadi.')
            .addStringOption(opt => opt.setName('url').setDescription('Masukkan URL Playlist Spotify').setRequired(true)))
        .addSubcommand(sub => sub.setName('myplaylist').setDescription('Lihat daftar playlist Spotify yang sudah kamu impor.'))
        .addSubcommand(sub => sub.setName('playplaylist').setDescription('Putar playlist tersimpan ke dalam antrean.')
            .addIntegerOption(opt => opt.setName('id').setDescription('ID Playlist (Cek di /music myplaylist)').setRequired(true)))
        .addSubcommand(sub => sub.setName('pause').setDescription('⏸️ Jeda musik yang sedang diputar saat ini'))
        .addSubcommand(sub => sub.setName('resume').setDescription('▶️ Lanjutkan musik yang sedang dijeda'))
        .addSubcommand(sub => sub.setName('nowplaying').setDescription('ℹ️ Tampilkan informasi lagu yang sedang diputar'))
        .addSubcommand(sub => sub.setName('queue').setDescription('📜 Tampilkan daftar antrean lagu saat ini'))
        .addSubcommand(sub => sub.setName('loop').setDescription('🔁 Atur mode pengulangan musik')
            .addStringOption(opt => opt.setName('mode').setDescription('Pilih mode pengulangan').setRequired(true).addChoices(
                { name: '❌ Mati', value: 'none' },
                { name: '🔂 Ulangi Lagu (Track)', value: 'track' },
                { name: '🔁 Ulangi Antrean (Queue)', value: 'queue' }
            )))
        .addSubcommand(sub => sub.setName('shuffle').setDescription('🔀 Acak urutan lagu di antrean'))
        .addSubcommand(sub => sub.setName('clear').setDescription('🗑️ Bersihkan seluruh daftar antrean lagu'))
        .addSubcommand(sub => sub.setName('stop').setDescription('Matikan audio dan putuskan koneksi.'))
        .addSubcommand(sub => sub.setName('skip').setDescription('Lewati trek audio saat ini.'))
        .addSubcommand(sub => sub.setName('volume').setDescription('Atur intensitas suara Naura (10-100%).')
            .addIntegerOption(opt => opt.setName('persen').setDescription('Persentase volume').setRequired(true).setMinValue(10).setMaxValue(100)))
        .addSubcommand(sub => sub.setName('247').setDescription('Toggle Mode Radio 24/7 (Menetap di Voice).'))
        .addSubcommand(sub => sub.setName('profile').setDescription('🎵 Lihat Kartu Statistik Musik.')
            .addUserOption(opt => opt.setName('target').setDescription('Pilih pengguna (Opsional)').setRequired(false))),

    // ==========================================
    // 🔍 AUTOCOMPLETE (Khusus Slash Command)
    // ==========================================
    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused();
        if (!focusedValue) return interaction.respond([]);

        // 1. Intercept URL Langsung agar tidak menyebabkan Lavalink API Timeout
        if (focusedValue.match(/^https?:\/\//)) {
            let platformName = 'URL Eksternal';
            if (focusedValue.includes('spotify')) platformName = 'Spotify';
            else if (focusedValue.includes('youtube') || focusedValue.includes('youtu.be')) platformName = 'YouTube';
            else if (focusedValue.includes('soundcloud')) platformName = 'Soundcloud';

            return interaction.respond([{
                name: `🎵 Impor dari ${platformName}: ${focusedValue.length > 50 ? focusedValue.substring(0, 47) + '...' : focusedValue}`,
                value: focusedValue.substring(0, 100)
            }]);
        }

        if (focusedValue.length < 3) return interaction.respond([]);

        // 2. Pencarian Teks Biasa (Menggunakan Lavalink)
        try {
            const poru = interaction.client.musicManager.poru;
            const timeoutPromise = new Promise((resolve) => setTimeout(() => resolve(null), 2500));
            
            let searchPromise = poru.resolve({ query: focusedValue, source: 'spsearch', requester: interaction.user });
            let res = await Promise.race([searchPromise, timeoutPromise]); 
            
            if (!res || !res.tracks || res.tracks.length === 0) {
                searchPromise = poru.resolve({ query: focusedValue, source: 'ytmsearch', requester: interaction.user });
                res = await Promise.race([searchPromise, timeoutPromise]);
            }
            
            if (res && res.tracks && res.tracks.length > 0) {
                const choices = res.tracks.slice(0, 5).map(track => {
                    let icon = track.info.sourceName === 'youtube' ? '📺' : (track.info.sourceName === 'spotify' ? '🟢' : '🎵');
                    return { 
                        name: (`${icon} ${track.info.title} - ${track.info.author}`).substring(0, 95), 
                        value: track.info.uri.substring(0, 100) || track.info.title.substring(0, 100) 
                    };
                });
                await interaction.respond(choices);
            } else { await interaction.respond([]); }
        } catch (error) { await interaction.respond([]); }
    },

    // ==========================================
    // 💻 PINTU MASUK SLASH COMMAND (/music)
    // ==========================================
    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        
        const args = {
            query: interaction.options.getString('query'),
            url: interaction.options.getString('url'),
            mode: interaction.options.getString('mode'),
            persen: interaction.options.getInteger('persen'),
            target: interaction.options.getUser('target'),
            id: interaction.options.getInteger('id')
        };

        const sendReply = async (payload) => await interaction.editReply(payload).catch(()=>{});

        await runMusicLogic(interaction.client, interaction.user, interaction.member, interaction.guild, interaction.channel, subcommand, args, sendReply, true);
    },

    // ==========================================
    // ⌨️ PINTU MASUK PREFIX COMMAND (n!music)
    // ==========================================
    async executePrefix(message, args, client) {
        if (!args || args.length === 0) {
            return message.reply({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`❌ Harap masukkan aksi! Contoh: \`n!music play <lagu>\` atau \`n!music import <url>\``)] });
        }

        const subcommand = args.shift().toLowerCase();
        
        const parsedArgs = {
            query: args.join(' '),
            url: args[0], // Ambil parameter pertama sebagai URL (kalau ada)
            persen: parseInt(args[0]),
            target: message.mentions.users.first(),
            id: parseInt(args[0])
        };

        const sentMsg = await message.reply({ embeds: [new EmbedBuilder().setColor(ui.getColor('dark')).setDescription(`⏳ | \`Memproses sistem audio...\``)] });
        const sendReply = async (payload) => await sentMsg.edit(payload).catch(()=>{});

        await runMusicLogic(client, message.author, message.member, message.guild, message.channel, subcommand, parsedArgs, sendReply, false);
    }
};