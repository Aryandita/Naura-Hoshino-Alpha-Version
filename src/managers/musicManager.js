const { Poru } = require('poru');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const ui = require('../config/ui');
const { logError } = require('./logger');
const GuildSettings = require('../models/GuildSettings');

function formatDuration(ms) {
    if (ms === 0 || !ms) return '0:00';
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

function createProgressBar(current, total, size = 18) {
    const dot = ui.getEmoji('progressDot') || '🔘';
    const line = ui.getEmoji('progressLine') || '▬';

    if (total === 0 || !total) return `**\`0:00\`** \`[${dot}${line.repeat(size - 1)}]\` **\`LIVE\`**`;
    
    const progress = Math.round((size * current) / total);
    const emptyProgress = size - progress;
    const progressString = line.repeat(Math.max(0, progress)) + dot + line.repeat(Math.max(0, emptyProgress));
    
    return `**\`${formatDuration(current)}\`** \`[${progressString}]\` **\`${formatDuration(total)}\`**`;
}

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

        this.poru = new Poru(client, nodes, { library: 'discord.js', defaultPlatform: 'ytsearch' });
    }

    initialize() {
        // FORMAT BARU: Log Audio Init (Ungu / Magenta)
        console.log('\x1b[45m\x1b[37m 🎵 AUDIO \x1b[0m \x1b[35mMenginisialisasi sistem musik Lavalink...\x1b[0m');
        this.poru.init(this.client);

        this.poru.on('nodeConnect', async (node) => {
            // FORMAT BARU: Log Node Connect (Hijau)
            console.log(`\x1b[42m\x1b[30m ✨ SUCCESS \x1b[0m \x1b[32mNode Lavalink [${node.name}] Tersambung.\x1b[0m`);
            try {
                const allSettings = await GuildSettings.findAll();
                let restoredCount = 0;

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
                                const player = this.poru.createConnection({
                                    guildId: guildId,
                                    voiceChannel: vcId,
                                    textChannel: tcId,
                                    deaf: true
                                });
                                player.is247 = true;
                                restoredCount++;
                            }
                        }
                    }
                }
                if (restoredCount > 0) {
                    // FORMAT BARU: Log Resurrector (Ungu / Magenta)
                    console.log(`\x1b[45m\x1b[37m 🔄 RESURRECT \x1b[0m \x1b[35mBerhasil membangkitkan Naura ke ${restoredCount} Voice Channel!\x1b[0m`);
                }
            } catch (e) {
                logError('Resurrector Error', e);
            }
        });

        this.poru.on('nodeError', (node, error) => logError(`Lavalink Error (${node.name})`, error));
        
        // FORMAT BARU: Log Node Disconnect (Kuning)
        this.poru.on('nodeDisconnect', (node) => console.log(`\x1b[43m\x1b[30m ⚠️ WARNING \x1b[0m \x1b[33mNode Lavalink [${node.name}] Terputus!\x1b[0m`));

        // ==========================================
        // 🎮 SISTEM PENANGKAP TOMBOL & DROPDOWN
        // ==========================================
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
            if (!interaction.customId.startsWith('music_')) return;

            const player = this.poru.players.get(interaction.guildId);
            if (!player) return interaction.reply({ content: `${ui.getEmoji('error')} Tidak ada musik yang sedang diputar.`, ephemeral: true });

            const memberVoice = interaction.member.voice.channel;
            if (!memberVoice || memberVoice.id !== player.voiceChannel) {
                return interaction.reply({ content: `${ui.getEmoji('error')} Kamu harus berada di Voice Channel yang sama denganku!`, ephemeral: true });
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'music_recommendation') {
                const trackIdentifier = interaction.values[0];
                try {
                    const res = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${trackIdentifier}`, source: 'youtube', requester: interaction.user });
                    if (res && res.tracks.length > 0) {
                        player.queue.add(res.tracks[0]);
                        if (!player.isPlaying && !player.isPaused) player.play();
                        return interaction.reply({ content: `${ui.getEmoji('success')} **${res.tracks[0].info.title}** berhasil ditambahkan ke antrean!`, ephemeral: true });
                    }
                } catch(e) {
                    return interaction.reply({ content: `${ui.getEmoji('error')} Gagal memuat lagu.`, ephemeral: true });
                }
            }

            if (interaction.isButton()) {
                const id = interaction.customId;
                let responseMsg = '';

                if (id === 'music_pause') {
                    player.pause(!player.isPaused);
                    responseMsg = player.isPaused ? `${ui.getEmoji('musicPlayPause')} Musik berhasil dijeda.` : `${ui.getEmoji('musicPlayPause')} Musik dilanjutkan kembali.`;
                } 
                else if (id === 'music_skip') {
                    if (typeof player.stop === 'function') player.stop();
                    else if (typeof player.stopTrack === 'function') player.stopTrack();
                    else player.node.rest.updatePlayer({ guildId: player.guildId, data: { track: { encoded: null } } });
                    responseMsg = `${ui.getEmoji('musicSkip')} Lagu saat ini dilewati.`;
                }
                else if (id === 'music_stop') {
                    player.is247 = false; 
                    
                    try {
                        const [guildData] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guildId } });
                        let musicData = guildData.music || {};
                        musicData.twentyFourSeven = false;
                        musicData.voiceChannel = null;
                        musicData.textChannel = null;
                        guildData.music = musicData;
                        guildData.changed('music', true);
                        await guildData.save();
                    } catch (e) { logError('Music Stop DB Error', e); }

                    player.destroy();
                    responseMsg = `${ui.getEmoji('musicStop')} Pesta selesai! Musik dihentikan sepenuhnya.`;
                }
                else if (id === 'music_loop') {
                    const loopMode = player.loop === 'NONE' ? 'TRACK' : (player.loop === 'TRACK' ? 'QUEUE' : 'NONE');
                    player.setLoop(loopMode);
                    responseMsg = `${ui.getEmoji('musicLoop')} Mode Pengulangan diatur ke: **${loopMode}**`;
                }
                else if (id === 'music_voldown') {
                    player.setVolume(Math.max(0, player.volume - 10));
                    responseMsg = `${ui.getEmoji('musicVolDown')} Volume turun menjadi: **${player.volume}%**`;
                }
                else if (id === 'music_volup') {
                    player.setVolume(Math.min(100, player.volume + 10));
                    responseMsg = `${ui.getEmoji('musicVolUp')} Volume naik menjadi: **${player.volume}%**`;
                }
                else if (id === 'music_shuffle') {
                    player.queue.shuffle();
                    responseMsg = `${ui.getEmoji('musicShuffle')} Antrean musik berhasil diacak!`;
                }
                else if (id === 'music_lyrics') {
                    return interaction.reply({ content: `📝 Gunakan command \`/music lyrics\` untuk mencari lirik lengkap ya!`, ephemeral: true });
                }
                else if (id === 'music_autoplay') {
                    player.autoplay = !player.autoplay;
                    responseMsg = `${ui.getEmoji('musicAutoplay')} Sistem Autoplay ${player.autoplay ? '**DIAKTIFKAN**' : '**DIMATIKAN**'}.`;
                }
                else if (id === 'music_247') {
                    player.is247 = !player.is247;
                    responseMsg = `${ui.getEmoji('music247')} Mode Siaga 24/7 ${player.is247 ? '**DIAKTIFKAN**' : '**DIMATIKAN**'}.`;

                    try {
                        const [guildData] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guildId } });
                        let musicData = guildData.music || {};
                        musicData.twentyFourSeven = player.is247;
                        musicData.voiceChannel = player.is247 ? player.voiceChannel : null;
                        musicData.textChannel = player.is247 ? player.textChannel : null;
                        
                        guildData.music = musicData;
                        guildData.changed('music', true);
                        await guildData.save();
                    } catch (e) { logError('Gagal menyimpan mode 24/7', e); }
                }

                if (id === 'music_autoplay' || id === 'music_247') {
                    const message = interaction.message;
                    const components = message.components.map(row => {
                        return new ActionRowBuilder().addComponents(
                            row.components.map(comp => {
                                if (comp.customId === 'music_autoplay') return ButtonBuilder.from(comp).setStyle(player.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary);
                                if (comp.customId === 'music_247') return ButtonBuilder.from(comp).setStyle(player.is247 ? ButtonStyle.Primary : ButtonStyle.Secondary);
                                return comp.data.type === 2 ? ButtonBuilder.from(comp) : StringSelectMenuBuilder.from(comp);
                            })
                        );
                    });
                    await message.edit({ components: components }).catch(()=>{});
                }

                await interaction.reply({ content: responseMsg, ephemeral: true });
            }
        });

        // ==========================================
        // 🎨 UI PANEL NOW PLAYING
        // ==========================================
        this.poru.on('trackStart', async (player, track) => {
            try {
                player.previousTrack = track;
                player.autoplayErrorCount = 0;
                player.isResolvingAutoplay = false;

                player.playedHistory = player.playedHistory || [];
                if (!player.playedHistory.includes(track.info.identifier)) {
                    player.playedHistory.push(track.info.identifier);
                }
                if (player.playedHistory.length > 30) player.playedHistory.shift();

                const channel = this.client.channels.cache.get(player.textChannel);
                if (!channel) return;

                player.autoplay = player.autoplay || false;
                
                if (player.is247 === undefined) {
                    const dbSettings = await GuildSettings.findOne({ where: { guildId: player.guildId } });
                    player.is247 = dbSettings?.music?.twentyFourSeven || false;
                }
                
                if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);

                const bannerPath = ui.getBanner('music');
                const files = [];
                if (bannerPath) {
                    files.push(new AttachmentBuilder(bannerPath, { name: 'banner_music.png' }));
                }

                const buildEmbed = (currentPos) => {
                    const progressBar = createProgressBar(currentPos, track.info.length);
                    const thumbnailUrl = `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;
                    
                    const embed = new EmbedBuilder()
                        .setColor(ui.getColor('primary')) 
                        .setAuthor({ name: 'Sekarang Memutar', iconURL: this.client.user.displayAvatarURL({ dynamic: true }) })
                        .setTitle(`${ui.getEmoji('musicPlayPause')} ${track.info.title}`)
                        .setURL(track.info.uri)
                        .setDescription(`Gunakan panel di bawah untuk mengontrol pemutar musik.\n\n${progressBar}`)
                        .setThumbnail(thumbnailUrl)
                        .addFields(
                            { name: '🎤 Penyanyi', value: `\`${track.info.author}\``, inline: true },
                            { name: '🎧 Diminta Oleh', value: track.info.requester ? `<@${track.info.requester.id}>` : `\`Naura Auto-Play\``, inline: true },
                            { name: `${ui.getEmoji('musicVolUp')} Volume`, value: `\`${player.volume}%\``, inline: true }
                        )
                        .setFooter({ text: '© Naura Hoshino Music System' })
                        .setTimestamp();
                        
                    if (bannerPath) embed.setImage('attachment://banner_music.png');
                    return embed;
                };

                let recommendedTracks = [];
                try {
                    const searchRes = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${track.info.identifier}&list=RD${track.info.identifier}`, source: 'youtube', requester: this.client.user });
                    if (searchRes && searchRes.tracks) {
                        recommendedTracks = searchRes.tracks.filter(t => t.info.identifier !== track.info.identifier).slice(0, 5);
                    }
                } catch (e) {}

                const components = [];

                if (recommendedTracks.length > 0) {
                    components.push(new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('music_recommendation')
                            .setPlaceholder('📻 Rekomendasi Lagu Selanjutnya...')
                            .addOptions(recommendedTracks.map(t => ({
                                label: t.info.title.substring(0, 95),
                                description: `Penyanyi: ${t.info.author.substring(0, 40)}`,
                                value: t.info.identifier,
                                emoji: ui.getEmoji('musicAutoplay') || '🎶'
                            })))
                    ));
                }

                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_voldown').setEmoji(ui.getEmoji('musicVolDown') || '🔉').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_pause').setEmoji(ui.getEmoji('musicPlayPause') || '⏯️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_skip').setEmoji(ui.getEmoji('musicSkip') || '⏭️').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_loop').setEmoji(ui.getEmoji('musicLoop') || '🔁').setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_volup').setEmoji(ui.getEmoji('musicVolUp') || '🔊').setStyle(ButtonStyle.Secondary)
                ));

                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_autoplay')
                        .setEmoji(ui.getEmoji('musicAutoplay') || '📻')
                        .setStyle(player.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary), 
                    
                    new ButtonBuilder()
                        .setCustomId('music_lyrics')
                        .setEmoji(ui.getEmoji('musicLyrics') || '📝')
                        .setStyle(ButtonStyle.Success),
                    
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setEmoji(ui.getEmoji('musicStop') || '⏹️')
                        .setStyle(ButtonStyle.Danger),
                    
                    new ButtonBuilder()
                        .setCustomId('music_shuffle')
                        .setEmoji(ui.getEmoji('musicShuffle') || '🔀')
                        .setStyle(ButtonStyle.Secondary),
                    
                    new ButtonBuilder()
                        .setCustomId('music_247')
                        .setEmoji(ui.getEmoji('music247') || '🛡️')
                        .setStyle(player.is247 ? ButtonStyle.Primary : ButtonStyle.Secondary) 
                ));

                const message = await channel.send({ embeds: [buildEmbed(0)], components: components, files: files });
                
                if (player.nowPlayingMessage) {
                    const oldMessage = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                    if (oldMessage) await oldMessage.delete().catch(() => {});
                }
                player.nowPlayingMessage = message.id;

                player.panelUpdateInterval = setInterval(async () => {
                    if (!player || player.state === 'DISCONNECTED') {
                        clearInterval(player.panelUpdateInterval);
                        return;
                    }
                    if (player.isPaused) return;

                    try {
                        await message.edit({ embeds: [buildEmbed(player.position)] });
                    } catch (err) {
                        if (err.code === 10008) clearInterval(player.panelUpdateInterval);
                    }
                }, 12000); 

            } catch (error) { logError('Poru TrackStart Error', error); }
        });

        this.poru.on('trackError', (player, track, error) => {
            // FORMAT BARU: Log Audio Error (Merah)
            console.log(`\x1b[41m\x1b[37m 💥 ERROR \x1b[0m \x1b[31mLagu diblokir/error: ${track?.info?.title}\x1b[0m`);
            if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);
            player.autoplayErrorCount = (player.autoplayErrorCount || 0) + 1;
        });
        
        this.poru.on('trackStuck', (player) => {
            if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);
            player.autoplayErrorCount = (player.autoplayErrorCount || 0) + 1;
        });

        // ==========================================
        // 🛑 EVENT: SISTEM AUTOPLAY ANTI-SPAM
        // ==========================================
        this.poru.on('queueEnd', async (player) => {
            try {
                if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);
                const channel = this.client.channels.cache.get(player.textChannel);
                
                if (player.autoplay && player.previousTrack) {
                    if (player.isResolvingAutoplay) return; 
                    if (player.autoplayErrorCount >= 3) {
                        player.autoplay = false; 
                        if (channel) {
                            channel.send({ embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${ui.getEmoji('error')} **Autoplay Dimatikan!** Terlalu banyak lagu yang diblokir/error berurutan.`)] });
                        }
                    } else {
                        player.isResolvingAutoplay = true;
                        
                        setTimeout(async () => {
                            // FORMAT BARU: Log Autoplay Scan (Cyan/Biru Muda)
                            console.log('\x1b[46m\x1b[30m 📻 AUTOPLAY \x1b[0m \x1b[36mMencari lagu...\x1b[0m');
                            try {
                                const searchRes = await this.poru.resolve({ 
                                    query: `https://www.youtube.com/watch?v=${player.previousTrack.info.identifier}&list=RD${player.previousTrack.info.identifier}`, 
                                    source: 'youtube', 
                                    requester: player.previousTrack.info.requester 
                                });

                                if (searchRes && searchRes.tracks.length > 0) {
                                    player.playedHistory = player.playedHistory || [];
                                    
                                    let validTracks = searchRes.tracks.filter(t => 
                                        t.info.identifier !== player.previousTrack.info.identifier && 
                                        !player.playedHistory.includes(t.info.identifier)
                                    );

                                    if (validTracks.length > 0) {
                                        let nextTrack = validTracks[Math.floor(Math.random() * Math.min(validTracks.length, 3))];
                                        player.playedHistory.push(nextTrack.info.identifier);

                                        player.queue.add(nextTrack);
                                        player.play();
                                        player.isResolvingAutoplay = false;
                                        return; 
                                    }
                                }
                            } catch (e) { logError('Poru Autoplay Error', e); }
                            
                            player.isResolvingAutoplay = false;
                        }, 2000); 
                        
                        return; 
                    }
                }

                if (channel) {
                    if (player.nowPlayingMessage) {
                        const lastPanel = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                        if (lastPanel) await lastPanel.delete().catch(() => {});
                    }

                    const is247 = player.is247 || false;
                    const embed = new EmbedBuilder()
                        .setColor(is247 ? ui.getColor('economy') : ui.getColor('kythiaDark'))
                        .setDescription(is247 ? `${ui.getEmoji('music247')} Antrean habis. Naura **Siaga 24/7** di dalam Voice.` : `${ui.getEmoji('musicStop')} Antrean musik habis. Naura keluar dari Voice Channel.`);
                    await channel.send({ embeds: [embed] });
                }
                
                if (!player.is247) player.destroy();

            } catch (error) {
                logError('Poru QueueEnd Error', error);
                if (!player.is247) player.destroy();
            }
        });
    }
}

module.exports = MusicManager;
