const { Poru } = require('poru');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const ui = require('../config/ui');
const { logError } = require('./logger');
const GuildSettings = require('../models/GuildSettings');
const UserProfile = require('../models/UserProfile');
const { generateMusicPanelImage } = require('../utils/canvasHelper'); 

const loopBreakers = new Map();

const formatDur = (ms) => {
    if (!ms || ms === 0 || !isFinite(ms)) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const buildProgressBar = (current, total, e) => {
    if (total === 0 || !isFinite(total)) return `${e('nowplaying') || '🎵'} **LIVE STREAM**`;
    const totalSegments = 12; 
    let progress = Math.round((current / total) * totalSegments);
    if (progress > totalSegments) progress = totalSegments;
    if (progress < 0) progress = 0;
    
    let bar = '';
    for (let i = 0; i < totalSegments; i++) {
        if (i < progress) bar += (e('progressLineBefore') || '━');
        else if (i === progress) bar += (e('progressDot') || '🔘');
        else bar += (e('progressLineAfter') || '━');
    }
    return bar;
};

class MusicManager {
    constructor(client) {
        this.client = client;
        const nodes = [{
            name: 'Naura VIP Node',
            host: process.env.LAVALINK_HOST || '127.0.0.1',
            port: parseInt(process.env.LAVALINK_PORT) || 2333,
            password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
            secure: process.env.LAVALINK_SECURE === 'true'
        }];

        this.poru = new Poru(client, nodes, { 
            library: 'discord.js', 
            defaultPlatform: 'ytmsearch' 
        });
    }

    initialize() {
        console.log('\x1b[45m\x1b[37m 🎵 AUDIO \x1b[0m \x1b[35mMenginisialisasi ekosistem Lavalink...\x1b[0m');
        this.poru.init(this.client);

        this.poru.on('nodeConnect', async (node) => {
            console.log(`\x1b[42m\x1b[30m ✨ SUCCESS \x1b[0m \x1b[32mAudio Node [${node.name}] Stabil.\x1b[0m`);
            try {
                const allSettings = await GuildSettings.findAll().catch(() => []);
                let restoredCount = 0;
                if (allSettings && allSettings.length > 0) {
                    for (const guildData of allSettings) {
                        if (guildData.music && guildData.music.twentyFourSeven === true) {
                            const guildId = guildData.guildId;
                            const vcId = guildData.music.voiceChannel;
                            const tcId = guildData.music.textChannel;
                            if (!vcId || !tcId) continue;
                            const guild = this.client.guilds.cache.get(guildId);
                            if (guild) {
                                const voiceChannel = guild.channels.cache.get(vcId);
                                if (voiceChannel) {
                                    const player = this.poru.createConnection({ guildId: guildId, voiceChannel: vcId, textChannel: tcId, deaf: true });
                                    player.is247 = true;
                                    restoredCount++;
                                }
                            }
                        }
                    }
                }
                if (restoredCount > 0) console.log(`\x1b[45m\x1b[37m 🔄 RESURRECT \x1b[0m \x1b[35mBerhasil membangkitkan Naura ke ${restoredCount} Voice Channel!\x1b[0m`);
            } catch (e) {}
        });

        this.poru.on('nodeError', (node, error) => logError(`Lavalink Error (${node.name})`, error));
        this.poru.on('nodeDisconnect', (node) => console.log(`\x1b[43m\x1b[30m ⚠️ WARNING \x1b[0m \x1b[33mKoneksi Lavalink Terputus!\x1b[0m`));

        // ==========================================
        // 🎮 SISTEM PENANGKAP TOMBOL & FILTER
        // ==========================================
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
            if (!interaction.customId.startsWith('music_')) return;

            const player = this.poru.players.get(interaction.guildId);
            if (!player) return interaction.reply({ content: `❌ | Sesi transmisi telah berakhir.`, ephemeral: true }).catch(()=>{});

            const memberVoice = interaction.member.voice.channel;
            if (!memberVoice || memberVoice.id !== player.voiceChannel) {
                return interaction.reply({ content: `❌ | Akses ditolak. Anda tidak berada di Voice Channel yang sama.`, ephemeral: true }).catch(()=>{});
            }

            try { await interaction.deferReply({ ephemeral: true }); } catch (err) { return; }

            if (interaction.isStringSelectMenu() && interaction.customId === 'music_recommendation') {
                const trackIdentifier = interaction.values[0];
                try {
                    const res = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${trackIdentifier}`, source: 'youtube', requester: interaction.user });
                    if (res && res.tracks.length > 0) {
                        player.queue.add(res.tracks[0]);
                        if (!player.isPlaying && !player.isPaused) player.play();
                        return interaction.editReply({ content: `✅ | **${res.tracks[0].info.title}** ditambahkan ke antrean.` }).catch(()=>{});
                    }
                } catch(e) { return interaction.editReply({ content: `❌ | Gagal memuat trek rekomendasi.` }).catch(()=>{}); }
                return;
            }

            const isRequester = player.currentTrack?.info?.requester?.id === interaction.user.id;
            const isDJ = interaction.member.permissions.has('ManageChannels') || interaction.member.roles.cache.some(r => r.name.toLowerCase() === 'dj');
            const requiresDJ = ['music_stop', 'music_skip', 'music_pause', 'music_filter', 'music_247', 'music_autoplay', 'music_loop', 'music_shuffle'];

            if (requiresDJ.includes(interaction.customId) && !isRequester && !isDJ) {
                return interaction.editReply({ content: `🛡️ | **Akses Ditolak!** Hanya peminta lagu atau Staff yang diizinkan.` });
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'music_filter') {
                const filterType = interaction.values[0];
                const applyFilter = (filterPayload, name) => {
                    player.currentFilterName = name;
                    player.node.rest.updatePlayer({ guildId: player.guildId, data: { filters: filterPayload } });
                };

                if (filterType === 'clear') applyFilter({}, 'Original Audio');
                if (filterType === 'bassboost') applyFilter({ equalizer: [{ band: 0, gain: 0.6 }, { band: 1, gain: 0.6 }, { band: 2, gain: 0.4 }] }, 'Sub-Bassboost');
                if (filterType === 'nightcore') applyFilter({ timescale: { speed: 1.2, pitch: 1.2, rate: 1 } }, 'Nightcore Shift');
                if (filterType === 'vaporwave') applyFilter({ timescale: { speed: 0.8, pitch: 0.8, rate: 1 } }, 'Vaporwave Reverb');
                
                this.updatePanelEmbed(player);
                return interaction.editReply({ content: `🎛️ | Filter audio diubah ke: **${player.currentFilterName}**` });
            }

            if (interaction.isButton()) {
                const id = interaction.customId;
                
                if (id === 'music_save') {
                    try {
                        let [userProfile] = await UserProfile.findOrCreate({ where: { userId: interaction.user.id } });
                        if (!player.currentTrack || !player.currentTrack.info) return interaction.editReply({ content: `❌ | Tidak ada data trek untuk disimpan.` });
                        const savedData = `${player.currentTrack.info.title} | ${player.currentTrack.info.uri}`;
                        let playlist = userProfile.music_playlist ? JSON.parse(userProfile.music_playlist) : [];
                        if (!playlist.includes(savedData)) {
                            playlist.push(savedData);
                            userProfile.music_playlist = JSON.stringify(playlist);
                            await userProfile.save();
                            return interaction.editReply({ content: `💖 | Trek ditambahkan ke **Naura Cloud Playlist**!` });
                        } else {
                            return interaction.editReply({ content: `⚠️ | Lagu ini sudah ada di daftar favorit Anda.` });
                        }
                    } catch (e) { return interaction.editReply({ content: `❌ | Sinkronisasi database gagal.` }); }
                }

                if (id === 'music_autoplay') {
                    player.autoplay = !player.autoplay;
                    if (player.autoplay) player.setLoop('NONE'); 
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ content: `📻 | Autoplay diatur menjadi: **${player.autoplay ? 'Aktif' : 'Nonaktif'}**` });
                }

                if (id === 'music_shuffle') {
                    player.queue.shuffle();
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ content: `🔀 | Antrean audio berhasil diacak!` });
                }

                if (id === 'music_loop') {
                    const modes = { 'NONE': 'TRACK', 'TRACK': 'QUEUE', 'QUEUE': 'NONE' };
                    player.setLoop(modes[player.loop] || 'NONE');
                    if (player.loop !== 'NONE') player.autoplay = false; 
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ content: `🔁 | Pengulangan diatur ke: **${player.loop}**` });
                }

                if (id === 'music_247') {
                    player.is247 = !player.is247;
                    this.updatePanelEmbed(player);
                    try {
                        const [guildData] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guildId } });
                        let musicData = guildData.music || {};
                        musicData.twentyFourSeven = player.is247;
                        musicData.voiceChannel = player.is247 ? player.voiceChannel : null;
                        musicData.textChannel = player.is247 ? player.textChannel : null;
                        guildData.music = musicData;
                        guildData.changed('music', true);
                        await guildData.save();
                    } catch (e) {}
                    return interaction.editReply({ content: `🌙 | Mode 24/7 diatur menjadi: **${player.is247 ? 'Aktif' : 'Nonaktif'}**` });
                }
                
                if (id === 'music_voldown') {
                    player.setVolume(Math.max(10, player.volume - 10));
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ content: `🔉 | Volume diturunkan ke: **${player.volume}%**` });
                }
                if (id === 'music_volup') {
                    player.setVolume(Math.min(100, player.volume + 10));
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ content: `🔊 | Volume dinaikkan ke: **${player.volume}%**` });
                }
                if (id === 'music_pause') {
                    player.pause(!player.isPaused);
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ content: player.isPaused ? `⏸️ | Transmisi dijeda.` : `▶️ | Transmisi dilanjutkan.` });
                } 
                if (id === 'music_skip') {
                    player.stop();
                    return interaction.editReply({ content: `⏭️ | Melewati lagu saat ini.` });
                }
                if (id === 'music_stop') {
                    player.is247 = false; 
                    player.destroy();
                    return interaction.editReply({ content: `⏹️ | Audio dimatikan sepenuhnya.` });
                }
            }
        });

        // ==========================================
        // 🎨 UI PANEL & PROGRESS BAR ENGINE
        // ==========================================
        this.poru.on('trackStart', async (player, track) => {
            try {
                const now = Date.now();
                const breaker = loopBreakers.get(player.guildId) || { count: 0, lastTime: now };
                if (now - breaker.lastTime < 2000) { breaker.count++; } 
                else { breaker.count = 1; breaker.lastTime = now; }
                loopBreakers.set(player.guildId, breaker);

                if (breaker.count >= 5) {
                    const channel = this.client.channels.cache.get(player.textChannel);
                    if (channel) channel.send('🚨 | **Sistem Anti-Spam:** Lagu diblokir beruntun. Koneksi diputus demi keamanan.').catch(()=>{});
                    player.destroy();
                    loopBreakers.delete(player.guildId);
                    return;
                }

                const activeTrack = track || player.currentTrack;
                if (!activeTrack || !activeTrack.info || !activeTrack.info.title) return player.stop();

                player.autoplayErrorCount = 0;
                player.previousTrack = activeTrack;

                if (!player.playedHistory) player.playedHistory = new Set();
                player.playedHistory.add(activeTrack.info.identifier);

                if (activeTrack.info.requester && activeTrack.info.length > 0) {
                    try {
                        const [userProfile] = await UserProfile.findOrCreate({ where: { userId: activeTrack.info.requester.id } });
                        userProfile.music_tracksListened = (userProfile.music_tracksListened || 0) + 1;
                        userProfile.music_totalDurationMs = BigInt(userProfile.music_totalDurationMs || 0) + BigInt(activeTrack.info.length);
                        userProfile.music_lastListened = activeTrack.info.title.substring(0, 100);
                        await userProfile.save();
                    } catch (e) { }
                }

                let recommendedTracks = [];
                try {
                    const searchRes = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${activeTrack.info.identifier}&list=RD${activeTrack.info.identifier}`, source: 'youtube' });
                    if (searchRes && searchRes.tracks) {
                        recommendedTracks = searchRes.tracks.filter(t => t.info.identifier !== activeTrack.info.identifier).slice(0, 5);
                    }
                } catch (e) {}

                const channel = this.client.channels.cache.get(player.textChannel);
                if (!channel) return;

                if (!player.currentFilterName) player.currentFilterName = 'Original Audio';
                if (player.progressInterval) clearInterval(player.progressInterval);

                const e = (name) => ui.getEmoji(name);
                const fallbackGetUIEmoji = (name, fallback) => ui.getEmoji ? ui.getEmoji(name) : fallback;

                const generatePanelPayload = async (currentPos) => {
                    const imageBuffer = await generateMusicPanelImage(activeTrack, currentPos, this.client.user.displayAvatarURL({ extension: 'png' }));
                    const attachment = new AttachmentBuilder(imageBuffer, { name: 'naura-audio-panel.png' });

                    const pBar = buildProgressBar(currentPos, activeTrack.info.length, e);
                    const timeStr = activeTrack.info.isStream ? 'LIVE' : `${formatDur(currentPos)} / ${formatDur(activeTrack.info.length)}`;
                    const requesterText = activeTrack.info.requester?.id ? `<@${activeTrack.info.requester.id}>` : `\`📻 Autoplay\``;

                    // 🌟 MENGEMBALIKAN DESKRIPSI PANEL YANG MEGAH & PANJANG
                    const panelEmbed = new EmbedBuilder()
                        .setColor(ui.getColor('primary'))
                        .setAuthor({ name: '✦  N A U R A   A U D I O   P A N E L  ✦', iconURL: this.client.user.displayAvatarURL() })
                        .setDescription(
                            `### ${e('nowplaying') || '🎵'} [${activeTrack.info.title}](${activeTrack.info.uri})\n` +
                            `${e('musicArtist') || '🎤'} **Artis:** \`${activeTrack.info.author}\`\n` +
                            `${e('musicListener') || '🎧'} **Permintaan:** ${requesterText}\n\n` +
                            `> ${pBar} \`[ ${timeStr} ]\`\n\n` +
                            `**━━━ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐏𝐀𝐑𝐀𝐌𝐄𝐓𝐄𝐑𝐒 ━━━**\n` +
                            `> 🔊 **Volume:** \`${player.volume}%\`\n` +
                            `> 🎛️ **Filter DSP:** \`${player.currentFilterName}\`\n` +
                            `> ${e('musicLoop') || '🔁'} **Looping:** \`${player.loop}\`\n` +
                            `> ${e('musicAutoplay') || '📻'} **Autoplay:** \`${player.autoplay ? 'Aktif' : 'Nonaktif'}\`\n` +
                            `> ${e('music247') || '🌙'} **Mode 24/7:** \`${player.is247 ? 'Aktif' : 'Nonaktif'}\``
                        )
                        .setImage('attachment://naura-audio-panel.png')
                        .setFooter({ text: 'Naura Intelligence • Pembaruan waktu nyata (Real-Time)' });

                    const rowDropdown = recommendedTracks.length > 0 ? new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('music_recommendation')
                            .setPlaceholder('📻 Rekomendasi Trek Audio Berikutnya')
                            .addOptions(recommendedTracks.map(t => ({
                                label: t.info.title.substring(0, 95),
                                description: t.info.author.substring(0, 40),
                                value: t.info.identifier,
                                emoji: '🎶'
                            })))
                    ) : null;

                    const rowFilter = new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('music_filter')
                            .setPlaceholder(`🎛️ DSP Filter: ${player.currentFilterName}`)
                            .addOptions([
                                { label: 'Original Audio', description: 'Frekuensi murni', value: 'clear', emoji: '💿' },
                                { label: 'Sub-Bassboost', description: 'Peningkatan nada rendah', value: 'bassboost', emoji: '🔊' },
                                { label: 'Nightcore Shift', description: 'Peningkatan tempo & pitch', value: 'nightcore', emoji: '🐹' },
                                { label: 'Vaporwave Reverb', description: 'Gema ruang (Slowed)', value: 'vaporwave', emoji: '🌌' }
                            ])
                    );

                    // 🌟 MEMPERTAHANKAN 2 BARIS TOMBOL (SIMETRIS & DINAMIS)
                    const rowMedia = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('music_pause').setEmoji(fallbackGetUIEmoji('musicPlayPause', '⏯️')).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('music_stop').setEmoji(fallbackGetUIEmoji('musicStop', '⏹️')).setStyle(ButtonStyle.Danger),
                        new ButtonBuilder().setCustomId('music_skip').setEmoji(fallbackGetUIEmoji('musicSkip', '⏭️')).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('music_loop').setEmoji(fallbackGetUIEmoji('musicLoop', '🔁')).setStyle(player.loop !== 'NONE' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('music_autoplay').setEmoji(fallbackGetUIEmoji('musicAutoplay', '📻')).setStyle(player.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary)
                    );

                    const rowUtils = new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('music_voldown').setEmoji(fallbackGetUIEmoji('musicVolDown', '🔉')).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('music_volup').setEmoji(fallbackGetUIEmoji('musicVolUp', '🔊')).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('music_shuffle').setEmoji(fallbackGetUIEmoji('musicShuffle', '🔀')).setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('music_247').setEmoji(fallbackGetUIEmoji('music247', '🌙')).setStyle(player.is247 ? ButtonStyle.Primary : ButtonStyle.Secondary),
                        new ButtonBuilder().setCustomId('music_save').setEmoji('💖').setStyle(ButtonStyle.Success)
                    );

                    const components = [rowFilter, rowMedia, rowUtils];
                    if (rowDropdown) components.unshift(rowDropdown);

                    return { embeds: [panelEmbed], components: components, files: [attachment] };
                };

                const payload = await generatePanelPayload(0);
                const message = await channel.send(payload);
                
                if (player.nowPlayingMessage) {
                    const oldMsg = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                    if (oldMsg) await oldMsg.delete().catch(() => {});
                }
                player.nowPlayingMessage = message.id;

                player.progressInterval = setInterval(async () => {
                    if (!player.isPlaying || player.isPaused) return;
                    try {
                        const currentMsg = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                        if (!currentMsg) return clearInterval(player.progressInterval);
                        const updatePayload = await generatePanelPayload(player.position);
                        await currentMsg.edit(updatePayload).catch(()=>{});
                    } catch(e) {}
                }, 15000); 
                player.generatePanelPayload = generatePanelPayload;

            } catch (error) { logError('Poru TrackStart Error', error); }
        });

        // ==========================================
        // 🚨 EVENT ERROR & QUEUE END (SMART AUTOPLAY)
        // ==========================================
        const handleBrokenTrack = (player, track, eventType) => {
            if (player.progressInterval) clearInterval(player.progressInterval);
            player.setLoop('NONE'); 
        };

        this.poru.on('trackError', (player, track, error) => handleBrokenTrack(player, track, 'trackError'));
        this.poru.on('trackStuck', (player, track) => handleBrokenTrack(player, track, 'trackStuck'));

        const killInterval = (player) => {
            if (player.progressInterval) { clearInterval(player.progressInterval); player.progressInterval = null; }
        };

        this.poru.on('trackEnd', (player) => killInterval(player));
        
        this.poru.on('playerDestroy', (player) => {
            killInterval(player);
            loopBreakers.delete(player.guildId);
            if (player.nowPlayingMessage) {
                const channel = this.client.channels.cache.get(player.textChannel);
                if (channel) channel.messages.fetch(player.nowPlayingMessage).then(m => m.delete().catch(()=>{})).catch(()=>{});
            }
        });

        this.poru.on('queueEnd', async (player) => {
            killInterval(player);
            
            if (player.autoplay && player.previousTrack && player.previousTrack.info) {
                player.autoplayErrorCount = (player.autoplayErrorCount || 0) + 1;
                if (player.autoplayErrorCount > 5) {
                    player.autoplay = false;
                    const channel = this.client.channels.cache.get(player.textChannel);
                    if (channel) channel.send('⚠️ | **Autoplay Dimatikan:** Algoritma gagal menemukan lagu yang valid.').catch(()=>{});
                    if (!player.is247) player.destroy();
                    return;
                }

                try {
                    const identifier = player.previousTrack.info.identifier;
                    let res = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${identifier}&list=RD${identifier}`, source: 'youtube' });
                    
                    if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') {
                        if (!player.playedHistory) player.playedHistory = new Set();
                        const unplayedTracks = res.tracks.filter(t => !player.playedHistory.has(t.info.identifier));
                        const nextTrack = unplayedTracks.length > 0 ? unplayedTracks[0] : res.tracks[Math.floor(Math.random() * res.tracks.length)];

                        if (nextTrack) {
                            player.queue.add(nextTrack);
                            return player.play();
                        }
                    } else {
                        const fallbackRes = await this.poru.resolve({ query: `spsearch:${player.previousTrack.info.author}`, source: 'spotify' });
                        if (fallbackRes && fallbackRes.tracks.length > 0) {
                            player.queue.add(fallbackRes.tracks[Math.floor(Math.random() * Math.min(3, fallbackRes.tracks.length))]);
                            return player.play();
                        }
                    }
                } catch(e) {}
            }

            if (player.is247) return;
            player.destroy();
            const channel = this.client.channels.cache.get(player.textChannel);
            if (channel && !player.autoplayErrorCount) channel.send(`⏹️ | Antrean lagu telah habis. Naura pamit dari Voice!`).then(m => setTimeout(() => m.delete().catch(()=>{}), 10000)).catch(()=>{});
        });
    }

    async updatePanelEmbed(player) {
        if (!player.nowPlayingMessage || !player.generatePanelPayload) return;
        try {
            const channel = this.client.channels.cache.get(player.textChannel);
            if (!channel) return;
            const msg = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
            if (msg) {
                const payload = await player.generatePanelPayload(player.position);
                await msg.edit(payload).catch(()=>{});
            }
        } catch(e) {}
    }
}

module.exports = MusicManager;