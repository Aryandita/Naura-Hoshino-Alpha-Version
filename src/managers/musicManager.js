const { Poru } = require('poru');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const ui = require('../config/ui');
const { logError } = require('./logger');
const GuildSettings = require('../models/GuildSettings');
const UserProfile = require('../models/UserProfile');
const { generateMusicPanelImage } = require('../utils/canvasHelper'); 

// ==========================================
// 🛡️ ANTI-CRASH GLOBAL SHIELD
// ==========================================
if (process.listenerCount('uncaughtException') === 0) {
    process.on('uncaughtException', (err) => {
        if (err.message && err.message.includes('No Session id found')) return;
        console.error(err);
    });
}

// ==========================================
// 🎨 EMOJI KUSTOM & FALLBACK SYSTEM
// ==========================================
const DEFAULT_EMOJIS = {
    nowplaying: '<a:DiscSpinner1:1492696912145678488>', 
    progressDot: '<:DotMusic:1488166056768835596>',    
    progressLineBefore: '<:BeforeDot:1488166108081950882>',
    progressLineAfter: '<:AfterDot:1488166236004159509>',
    favorite: '<a:SpinHeart:1492696848643915796>',
    filter: '<:Filter:1484705994020753529>',
    musicListener: '<a:Listener:1492696916050444449>',
    musicArtist: '<:Artis:1484706029244518561>',
    musicPlayPause: '<:PlayPause:1484705975998091375>', 
    musicSkip: '<:Skip:1484705981152755712>',
    musicStop: '<:Stop:1484705983778525315>',
    musicLoop: '<:Loop:1484705967991034010>',
    musicVolDown: '<:VolumeDown:1484874588524646621>',
    musicVolUp: '<:VolumeUp:1484874537110864034>',
    musicAutoplay: '<:AutoPlay:1484705985980268744>',
    musicLyrics: '<:Lyrics:1484705972919337070>',
    musicShuffle: '<:Shuffle:1484705970469867641>',
    music247: '<a:Moon:1492696850602524682>',
    normal: '<:MusicDisc:1484706066662031483>',
    bassboost: '<:BassBoost:1493476326634684517>',
    nightcore: '<:NightCore:1493476329658515497>',
    vaporwave: '<:vaporwave:1493478233448910878>'
};

const getEmoji = (name) => {
    if (ui && ui.getEmoji) { const e = ui.getEmoji(name); if (e) return e; }
    return DEFAULT_EMOJIS[name] || '🎵';
};

const formatDur = (ms) => {
    if (!ms || ms === 0 || !isFinite(ms)) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const buildProgressBar = (current, total) => {
    if (total === 0 || !isFinite(total)) return `${getEmoji('nowplaying')} **LIVE STREAM**`;
    const totalSegments = 12; 
    let progress = Math.round((current / total) * totalSegments);
    if (progress > totalSegments) progress = totalSegments;
    if (progress < 0) progress = 0;
    let bar = '';
    for (let i = 0; i < totalSegments; i++) {
        if (i < progress) bar += getEmoji('progressLineBefore');
        else if (i === progress) bar += getEmoji('progressDot');
        else bar += getEmoji('progressLineAfter');
    }
    return bar;
};

const safeStopTrack = (player) => {
    if (!player) return;
    if (typeof player.stopTrack === 'function') player.stopTrack();
    else if (player.node && player.node.rest) player.node.rest.updatePlayer({ guildId: player.guildId, data: { track: { encoded: null } } }).catch(()=>{});
};

const parseLRC = (lrcText) => {
    const lines = lrcText.split('\n');
    const result = [];
    for (const line of lines) {
        const match = line.match(/\[(\d{2}):(\d{2}\.\d{2})\](.*)/);
        if (match) {
            const timeMs = (parseInt(match[1], 10) * 60 + parseFloat(match[2])) * 1000;
            const text = match[3].trim();
            if (text) result.push({ timeMs, text });
        }
    }
    return result;
};

class MusicManager {
    constructor(client) {
        this.client = client;
        const nodes = [{
            name: 'Naura VIP Node',
            host: process.env.LAVALINK_HOST || 'localhost',
            port: parseInt(process.env.LAVALINK_PORT) || 2333,
            password: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
            secure: process.env.LAVALINK_SECURE === 'true'
        }];

        // Poru diinisialisasi secara murni, mengandalkan Lavasrc di server Lavalink
        this.poru = new Poru(client, nodes, { 
            library: 'discord.js', 
            defaultPlatform: 'ytmsearch' 
        });
    }

    initialize() {
        console.log('\x1b[45m\x1b[37m 🎵 AUDIO \x1b[0m \x1b[35mMenginisialisasi ekosistem Lavalink...\x1b[0m');
        
        const connectPoru = () => this.poru.init(this.client);
        if (this.client.isReady()) connectPoru();
        else this.client.once('ready', () => connectPoru());

        this.client.on('voiceStateUpdate', async (oldState, newState) => {
            if (oldState.id === this.client.user.id && oldState.channelId && !newState.channelId) {
                const player = this.poru.players.get(newState.guild.id);
                if (player) {
                    player.is247 = false; 
                    this.killIntervals(player);
                    player.destroy();
                }
            }
        });

        this.poru.on('nodeConnect', async (node) => {
            console.log(`\x1b[42m\x1b[30m ✨ SUCCESS \x1b[0m \x1b[32mAudio Node [${node.name}] Stabil.\x1b[0m`);
            setTimeout(async () => {
                try {
                    const allSettings = await GuildSettings.findAll().catch(() => []);
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
                                    }
                                }
                            }
                        }
                    }
                } catch (e) {}
            }, 5000); 
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
            const errorEmbed = new EmbedBuilder().setColor(ui.getColor('error') || '#ff0000');
            
            if (!player) return interaction.reply({ embeds: [errorEmbed.setDescription(`❌ | Sesi transmisi audio telah berakhir.`)], ephemeral: true }).catch(()=>{});

            const memberVoice = interaction.member.voice.channel;
            if (!memberVoice || memberVoice.id !== player.voiceChannel) {
                return interaction.reply({ embeds: [errorEmbed.setDescription(`❌ | Akses ditolak. Harus berada di Voice Channel yang sama.`)], ephemeral: true }).catch(()=>{});
            }

            try { await interaction.deferReply({ ephemeral: true }); } catch (err) { return; }

            const actionEmbed = new EmbedBuilder().setColor(ui.getColor('primary') || '#00D9FF');

            if (interaction.isStringSelectMenu() && interaction.customId === 'music_recommendation') {
                const trackUri = interaction.values[0];
                try {
                    const res = await this.poru.resolve({ query: trackUri, requester: interaction.user });
                    if (res && res.tracks && res.tracks.length > 0) {
                        player.queue.add(res.tracks[0]);
                        if (!player.isPlaying && !player.isPaused) player.play();
                        return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('nowplaying')} | Trek **[${res.tracks[0].info.title}](${res.tracks[0].info.uri})** ditambahkan!`)] }).catch(()=>{});
                    }
                } catch(e) { return interaction.editReply({ embeds: [errorEmbed.setDescription(`❌ | Gagal memuat trek rekomendasi.`)] }).catch(()=>{}); }
                return;
            }

            const isRequester = player.currentTrack?.info?.requester?.id === interaction.user.id;
            const isDJ = interaction.member.permissions.has('ManageChannels') || interaction.member.roles.cache.some(r => r.name.toLowerCase() === 'dj');
            const requiresDJ = ['music_stop', 'music_skip', 'music_pause', 'music_filter', 'music_247', 'music_autoplay', 'music_loop', 'music_shuffle', 'music_lyrics'];

            if (requiresDJ.includes(interaction.customId) && !isRequester && !isDJ) {
                return interaction.editReply({ embeds: [errorEmbed.setDescription(`🛡️ | Hanya peminta lagu saat ini atau Staff (DJ) yang diizinkan.`)] });
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
                return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('filter')} | Filter DSP Audio diubah ke: **${player.currentFilterName}**.`)] });
            }

            if (interaction.isButton()) {
                const id = interaction.customId;
                
                if (id === 'music_save') {
                    try {
                        let [userProfile] = await UserProfile.findOrCreate({ where: { userId: interaction.user.id } });
                        if (!player.currentTrack || !player.currentTrack.info) return interaction.editReply({ embeds: [errorEmbed.setDescription(`❌ | Tidak ada data trek valid.`)] });
                        
                        const savedData = `${player.currentTrack.info.title} | ${player.currentTrack.info.uri}`;
                        let playlist = userProfile.music_playlist ? JSON.parse(userProfile.music_playlist) : [];
                        
                        if (!playlist.includes(savedData)) {
                            playlist.push(savedData);
                            userProfile.music_playlist = JSON.stringify(playlist);
                            await userProfile.save();
                            return interaction.editReply({ embeds: [new EmbedBuilder().setColor('#00ff00').setDescription(`${getEmoji('favorite')} | **${player.currentTrack.info.title}** ditambahkan ke Naura Playlist!`)] });
                        } else {
                            return interaction.editReply({ embeds: [errorEmbed.setColor('#ffa500').setDescription(`⚠️ | Lagu ini sudah ada di daftar favorit Anda.`)] });
                        }
                    } catch (e) { return interaction.editReply({ embeds: [errorEmbed.setDescription(`❌ | Gagal sinkronisasi DB.`)] }); }
                }

                if (id === 'music_lyrics') {
                    if (!player.currentTrack || !player.currentTrack.info) return interaction.editReply({ embeds: [errorEmbed.setDescription(`❌ | Data metadata lagu kosong.`)] });
                    
                    if (player.isLiveLyricsActive) {
                        player.isLiveLyricsActive = false;
                        if (player.lyricsMessageId) {
                            const channel = interaction.client.channels.cache.get(player.textChannel);
                            if (channel) channel.messages.fetch(player.lyricsMessageId).then(m => m.delete().catch(()=>{})).catch(()=>{});
                            player.lyricsMessageId = null;
                        }
                        this.updatePanelEmbed(player);
                        return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicLyrics')} | Modul **Live Lyrics** dimatikan.`)] });
                    }

                    const q = `${player.currentTrack.info.title} ${player.currentTrack.info.author}`;
                    try {
                        const response = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
                        const res = await response.json();
                        
                        if (!res || res.length === 0) return interaction.editReply({ embeds: [errorEmbed.setColor('#ffa500').setDescription(`${getEmoji('musicLyrics')} | Lirik tidak ditemukan pada database global.`)] });
                        
                        if (res[0].syncedLyrics) {
                            player.syncedLyricsData = parseLRC(res[0].syncedLyrics);
                            player.isLiveLyricsActive = true;
                            player.currentLyricIndex = -1; 
                            
                            const channel = interaction.client.channels.cache.get(player.textChannel);
                            if (channel) {
                                const lMsg = await channel.send({ 
                                    embeds: [new EmbedBuilder().setColor(ui.getColor('accent')).setAuthor({ name: `🎵 Bernyanyi bersama Naura` }).setDescription(`### ${getEmoji('nowplaying')} ${player.currentTrack.info.title}\n\nSedang menyinkronkan waktu lirik...`)] 
                                });
                                player.lyricsMessageId = lMsg.id;
                            }
                            this.updatePanelEmbed(player);
                            return interaction.editReply({ embeds: [actionEmbed.setColor('#00ff00').setDescription(`${getEmoji('musicLyrics')} | **Live Lyrics** diekstrak! Mari bernyanyi.`)] });
                        } else if (res[0].plainLyrics) {
                            return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.getColor('primary')).setTitle(`${getEmoji('musicLyrics')} Lirik: ${res[0].trackName}`).setDescription(`\`\`\`text\n${res[0].plainLyrics.substring(0, 3900)}\n\`\`\``)] });
                        } else {
                            return interaction.editReply({ embeds: [errorEmbed.setDescription(`❌ | Format lirik tidak didukung.`)] });
                        }
                    } catch (e) { return interaction.editReply({ embeds: [errorEmbed.setDescription(`❌ | Koneksi ke server Lirik terputus.`)] }); }
                }

                if (id === 'music_autoplay') {
                    player.isAutoplayMode = !player.isAutoplayMode;
                    if (player.isAutoplayMode) player.setLoop('NONE'); 
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicAutoplay')} | Autoplay AI **${player.isAutoplayMode ? 'DIAKTIFKAN' : 'DIMATIKAN'}**.`)] });
                }

                if (id === 'music_shuffle') {
                    player.queue.shuffle();
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicShuffle')} | Antrean berhasil diacak (shuffled)!`)] });
                }

                if (id === 'music_loop') {
                    const modes = { 'NONE': 'TRACK', 'TRACK': 'QUEUE', 'QUEUE': 'NONE' };
                    player.setLoop(modes[player.loop] || 'NONE');
                    if (player.loop !== 'NONE') player.isAutoplayMode = false; 
                    this.updatePanelEmbed(player);
                    const modeNames = { 'NONE': 'Nonaktif', 'TRACK': 'Ulangi 1 Trek', 'QUEUE': 'Ulangi Seluruh Antrean' };
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicLoop')} | Looping diatur ke: **${modeNames[player.loop]}**.`)] });
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
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('music247')} | Mode Siaga 24/7 **${player.is247 ? 'DIAKTIFKAN' : 'DIMATIKAN'}**.`)] });
                }
                
                if (id === 'music_voldown') {
                    player.setVolume(Math.max(10, player.volume - 10));
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicVolDown')} | Volume diturunkan ke **${player.volume}%**.`)] });
                }
                if (id === 'music_volup') {
                    player.setVolume(Math.min(100, player.volume + 10));
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicVolUp')} | Volume dinaikkan ke **${player.volume}%**.`)] });
                }
                if (id === 'music_pause') {
                    player.pause(!player.isPaused);
                    this.updatePanelEmbed(player);
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicPlayPause')} | Transmisi audio **${player.isPaused ? 'DIJEDA' : 'DILANJUTKAN'}**.`)] });
                } 
                if (id === 'music_skip') {
                    safeStopTrack(player); 
                    return interaction.editReply({ embeds: [actionEmbed.setDescription(`${getEmoji('musicSkip')} | Melewati trek saat ini. Bersiap memutar selanjutnya...`)] });
                }
                if (id === 'music_stop') {
                    player.is247 = false; player.destroy();
                    return interaction.editReply({ embeds: [errorEmbed.setDescription(`${getEmoji('musicStop')} | Transmisi dihentikan. Naura pamit dari Voice Channel.`)] });
                }
            }
        });

        // ==========================================
        // 🎨 UI PANEL & PROGRESS BAR ENGINE
        // ==========================================
        this.poru.on('trackStart', async (player, track) => {
            try {
                const activeTrack = track || player.currentTrack;
                if (!activeTrack || !activeTrack.info || !activeTrack.info.title) return safeStopTrack(player);

                player.previousTrack = activeTrack;
                player.isResolvingAutoplay = false;

                if (player.isLiveLyricsActive && player.lyricsMessageId) {
                    const channel = this.client.channels.cache.get(player.textChannel);
                    if (channel) channel.messages.fetch(player.lyricsMessageId).then(m => m.delete().catch(()=>{})).catch(()=>{});
                }
                player.isLiveLyricsActive = false;
                player.lyricsMessageId = null;
                player.currentLyricIndex = -1; 

                if (!player.playedHistory) player.playedHistory = new Set();
                player.playedHistory.add(activeTrack.info.identifier);

                if (activeTrack.info.requester && activeTrack.info.length > 0) {
                    UserProfile.findOrCreate({ where: { userId: activeTrack.info.requester.id } }).then(([userProfile]) => {
                        userProfile.music_tracksListened = (userProfile.music_tracksListened || 0) + 1;
                        userProfile.music_totalDurationMs = BigInt(userProfile.music_totalDurationMs || 0) + BigInt(activeTrack.info.length);
                        userProfile.music_lastListened = activeTrack.info.title.substring(0, 100);
                        userProfile.save().catch(()=>{});
                    }).catch(()=>{});
                }

                let recommendedTracks = [];
                try {
                    // Coba ambil rekomendasi menggunakan Lavasrc spsearch
                    let searchRes = await this.poru.resolve({ query: `${activeTrack.info.author}`, source: 'spsearch', requester: this.client.user });
                    if (!searchRes || !searchRes.tracks || searchRes.tracks.length === 0) {
                        searchRes = await this.poru.resolve({ query: `${activeTrack.info.author} audio`, source: 'ytmsearch', requester: this.client.user });
                    }
                    if (searchRes && searchRes.tracks) {
                        recommendedTracks = searchRes.tracks.filter(t => t.info.identifier !== activeTrack.info.identifier && !player.playedHistory.has(t.info.identifier)).slice(0, 5);
                    }
                } catch (e) { }

                player.isHandlingTrackStart = true;
                this.killIntervals(player);

                player.panelTimeout = setTimeout(async () => {
                    if (!player.isHandlingTrackStart) return; 

                    const channel = this.client.channels.cache.get(player.textChannel);
                    if (!channel) return;

                    if (!player.currentFilterName) player.currentFilterName = 'Original Audio';

                    const generatePanelPayload = async (currentPos) => {
                        const imageBuffer = await generateMusicPanelImage(activeTrack, currentPos, this.client.user.displayAvatarURL({ extension: 'png' }));
                        const attachment = new AttachmentBuilder(imageBuffer, { name: 'naura-audio-panel.png' });

                        const pBar = buildProgressBar(currentPos, activeTrack.info.length);
                        const timeStr = activeTrack.info.isStream ? 'LIVE' : `${formatDur(currentPos)} / ${formatDur(activeTrack.info.length)}`;
                        const requesterText = activeTrack.info.requester?.id ? `<@${activeTrack.info.requester.id}>` : `\`📻 Autoplay Engine\``;

                        const panelEmbed = new EmbedBuilder()
                            .setColor(ui.getColor('primary'))
                            .setAuthor({ name: '✦  N A U R A   A U D I O   P A N E L  ✦', iconURL: this.client.user.displayAvatarURL() })
                            .setDescription(
                                `### ${getEmoji('nowplaying')} [${activeTrack.info.title}](${activeTrack.info.uri})\n` +
                                `${getEmoji('musicArtist')} **Artis:** \`${activeTrack.info.author}\`\n` +
                                `${getEmoji('musicListener')} **Permintaan:** ${requesterText}\n\n` +
                                `> ${pBar} \`[ ${timeStr} ]\`\n\n` +
                                `**━━━ 𝐒𝐘𝐒𝐓𝐄𝐌 𝐏𝐀𝐑𝐀𝐌𝐄𝐓𝐄𝐑𝐒 ━━━**\n` +
                                `> 🔊 **Volume:** \`${player.volume}%\`\n` +
                                `> ${getEmoji('filter')} **Filter DSP:** \`${player.currentFilterName}\`\n` +
                                `> ${getEmoji('musicLoop')} **Looping:** \`${player.loop}\`\n` +
                                `> ${getEmoji('musicAutoplay')} **Autoplay:** \`${player.isAutoplayMode ? 'Aktif' : 'Nonaktif'}\`\n` +
                                `> ${getEmoji('music247')} **Mode 24/7:** \`${player.is247 ? 'Aktif' : 'Nonaktif'}\``
                            )
                            .setImage('attachment://naura-audio-panel.png')
                            .setFooter({ text: 'Naura Intelligence • Pembaruan waktu nyata' });

                        const rowDropdown = recommendedTracks.length > 0 ? new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('music_recommendation')
                                .setPlaceholder('📻 Rekomendasi Trek Audio Berikutnya')
                                .addOptions(recommendedTracks.map(t => ({
                                    label: t.info.title.substring(0, 95),
                                    description: t.info.author.substring(0, 40),
                                    value: t.info.uri.substring(0, 100), 
                                    emoji: getEmoji('normal')
                                })))
                        ) : null;

                        const rowFilter = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('music_filter')
                                .setPlaceholder(`🎛️ DSP Filter: ${player.currentFilterName}`)
                                .addOptions([
                                    { label: 'Original Audio', description: 'Frekuensi murni', value: 'clear', emoji: getEmoji('normal') },
                                    { label: 'Sub-Bassboost', description: 'Peningkatan nada rendah', value: 'bassboost', emoji: getEmoji('bassboost') },
                                    { label: 'Nightcore Shift', description: 'Peningkatan tempo & pitch', value: 'nightcore', emoji: getEmoji('nightcore') },
                                    { label: 'Vaporwave Reverb', description: 'Gema ruang', value: 'vaporwave', emoji: getEmoji('vaporwave') }
                                ])
                        );

                        const rowMedia = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('music_pause').setEmoji(getEmoji('musicPlayPause')).setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_stop').setEmoji(getEmoji('musicStop')).setStyle(ButtonStyle.Danger),
                            new ButtonBuilder().setCustomId('music_skip').setEmoji(getEmoji('musicSkip')).setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_loop').setEmoji(getEmoji('musicLoop')).setStyle(player.loop !== 'NONE' ? ButtonStyle.Primary : ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_autoplay').setEmoji(getEmoji('musicAutoplay')).setStyle(player.isAutoplayMode ? ButtonStyle.Primary : ButtonStyle.Secondary)
                        );

                        const rowUtils = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('music_voldown').setEmoji(getEmoji('musicVolDown')).setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_volup').setEmoji(getEmoji('musicVolUp')).setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_lyrics').setEmoji(getEmoji('musicLyrics')).setLabel('Lirik').setStyle(player.isLiveLyricsActive ? ButtonStyle.Primary : ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_247').setEmoji(getEmoji('music247')).setStyle(player.is247 ? ButtonStyle.Primary : ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('music_save').setEmoji(getEmoji('favorite')).setStyle(ButtonStyle.Success)
                        );

                        const components = [rowFilter, rowMedia, rowUtils];
                        if (rowDropdown) components.unshift(rowDropdown);

                        return { embeds: [panelEmbed], components: components, files: [attachment] };
                    };

                    if (!player.isHandlingTrackStart) return;

                    const payload = await generatePanelPayload(0);
                    const message = await channel.send(payload);
                    
                    if (player.nowPlayingMessage) {
                        const oldMsg = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                        if (oldMsg) await oldMsg.delete().catch(() => {});
                    }
                    player.nowPlayingMessage = message.id;
                    player.generatePanelPayload = generatePanelPayload;

                    player.panelUpdateInterval = setInterval(async () => {
                        if (!player.isPlaying || player.isPaused) return;
                        try {
                            const currentMsg = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                            if (!currentMsg) return clearInterval(player.panelUpdateInterval);
                            const updatePayload = await player.generatePanelPayload(player.position);
                            await currentMsg.edit(updatePayload).catch(()=>{});
                        } catch(e) {}
                    }, 25000); 

                    player.lyricsInterval = setInterval(async () => {
                        if (!player.isPlaying || player.isPaused || !player.isLiveLyricsActive || !player.syncedLyricsData || !player.lyricsMessageId) return;
                        
                        try {
                            const currentTime = player.position;
                            let currentIndex = 0;
                            for (let i = 0; i < player.syncedLyricsData.length; i++) {
                                if (currentTime >= player.syncedLyricsData[i].timeMs) currentIndex = i;
                                else break;
                            }
                            
                            if (player.currentLyricIndex === currentIndex) return;
                            player.currentLyricIndex = currentIndex;
                            
                            let displayLines = [];
                            const startIdx = Math.max(0, currentIndex - 2);
                            const endIdx = Math.min(player.syncedLyricsData.length - 1, currentIndex + 3);
                            
                            for (let i = startIdx; i <= endIdx; i++) {
                                if (i === currentIndex) displayLines.push(`**${getEmoji('musicListener')} ➔ ${player.syncedLyricsData[i].text}**`);
                                else displayLines.push(`*${player.syncedLyricsData[i].text}*`);
                            }
                            
                            const lyricEmbed = new EmbedBuilder()
                                .setColor(ui.getColor('accent'))
                                .setAuthor({ name: `🎵 Bernyanyi bersama Naura` })
                                .setDescription(`### ${getEmoji('nowplaying')} ${activeTrack.info.title}\n\n` + displayLines.join('\n\n'))
                                .setFooter({ text: 'Naura Live Lyrics Engine • Tersinkronisasi' });
                                
                            let lMsg = channel.messages.cache.get(player.lyricsMessageId);
                            if (!lMsg) lMsg = await channel.messages.fetch(player.lyricsMessageId).catch(() => null);
                            if (lMsg) lMsg.edit({ embeds: [lyricEmbed] }).catch(()=>{});
                        } catch(e) {}
                    }, 2000); 

                }, 1500); 

            } catch (error) { logError('Poru TrackStart Error', error); }
        });

        const handleBrokenTrack = (player, track, eventType) => {
            player.isHandlingTrackStart = false; 
            this.killIntervals(player);
            
            const channel = this.client.channels.cache.get(player.textChannel);
            if (channel) {
                const errEmbed = new EmbedBuilder().setColor('#ff0000').setDescription(`⚠️ | **Sistem Anti-Spam:** Lagu \`${track?.info?.title}\` diputus oleh YouTube (Block/403). Mencari jalur lain...`);
                channel.send({ embeds: [errEmbed] }).then(m => setTimeout(() => m.delete().catch(()=>{}), 8000));
            }
        };

        this.poru.on('trackError', (player, track, error) => handleBrokenTrack(player, track, 'trackError'));
        this.poru.on('trackStuck', (player, track) => handleBrokenTrack(player, track, 'trackStuck'));

        this.poru.on('trackEnd', (player) => {
            this.killIntervals(player);
            if (player.isLiveLyricsActive && player.lyricsMessageId) {
                const channel = this.client.channels.cache.get(player.textChannel);
                if (channel) channel.messages.fetch(player.lyricsMessageId).then(m => m.delete().catch(()=>{})).catch(()=>{});
                player.lyricsMessageId = null;
                player.isLiveLyricsActive = false; 
            }
        });
        
        this.poru.on('playerDestroy', (player) => {
            this.killIntervals(player);
            if (player.nowPlayingMessage) {
                const channel = this.client.channels.cache.get(player.textChannel);
                if (channel) channel.messages.fetch(player.nowPlayingMessage).then(m => m.delete().catch(()=>{})).catch(()=>{});
            }
        });

        // ==========================================
        // 🧠 AUTOPLAY ENGINE 
        // ==========================================
        this.poru.on('queueEnd', async (player) => {
            this.killIntervals(player);
            
            if (player.isAutoplayMode && player.previousTrack && player.previousTrack.info) {
                if (player.isResolvingAutoplay) return;
                player.isResolvingAutoplay = true;

                await new Promise(resolve => setTimeout(resolve, 2000));

                try {
                    const prevTrack = player.previousTrack;
                    // Lavasrc autoplay logic fallback
                    let res = await this.poru.resolve({ query: `${prevTrack.info.author}`, source: 'spsearch' });

                    if (!res || res.loadType === 'empty' || res.loadType === 'error' || res.loadType === 'NO_MATCHES' || !res.tracks || res.tracks.length === 0) {
                        res = await this.poru.resolve({ query: `${prevTrack.info.author} audio`, source: 'ytmsearch' });
                    }

                    if (res && res.tracks && res.tracks.length > 0) {
                        if (!player.playedHistory) player.playedHistory = new Set();
                        
                        const unplayedTracks = res.tracks.filter(t => !player.playedHistory.has(t.info.identifier));
                        const nextTrack = unplayedTracks.length > 0 
                            ? unplayedTracks[Math.floor(Math.random() * Math.min(unplayedTracks.length, 5))] 
                            : res.tracks[Math.floor(Math.random() * res.tracks.length)];

                        if (nextTrack) {
                            player.queue.add(nextTrack);
                            return player.play();
                        }
                    }

                    setTimeout(() => { if (player.isAutoplayMode) this.poru.emit('queueEnd', player); }, 5000);
                    return;
                } catch(e) {
                    setTimeout(() => { if (player.isAutoplayMode) this.poru.emit('queueEnd', player); }, 5000);
                    return;
                }
            }

            if (player.is247) return;
            player.destroy();
            const channel = this.client.channels.cache.get(player.textChannel);
            if (channel) {
                const exitEmbed = new EmbedBuilder().setColor(ui.getColor('error') || '#ff0000').setDescription(`⏹️ | Antrean lagu telah habis. Naura pamit dari Voice Channel!`);
                channel.send({ embeds: [exitEmbed] }).then(m => setTimeout(() => m.delete().catch(()=>{}), 10000)).catch(()=>{});
            }
        });
    }

    killIntervals(player) {
        if (player.panelTimeout) clearTimeout(player.panelTimeout);
        if (player.progressInterval) { clearInterval(player.progressInterval); player.progressInterval = null; }
        if (player.panelUpdateInterval) { clearInterval(player.panelUpdateInterval); player.panelUpdateInterval = null; }
        if (player.lyricsInterval) { clearInterval(player.lyricsInterval); player.lyricsInterval = null; }
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