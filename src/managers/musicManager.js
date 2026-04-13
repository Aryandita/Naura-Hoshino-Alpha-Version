const { Poru } = require('poru');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, AttachmentBuilder } = require('discord.js');
const ui = require('../config/ui');
const { logError } = require('./logger');
const GuildSettings = require('../models/GuildSettings');
const UserProfile = require('../models/UserProfile');
const { generateMusicPanelImage } = require('../utils/canvasHelper'); // Impor Utilitas Canvas

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
        console.log('\x1b[45m\x1b[37m 🎵 AUDIO \x1b[0m \x1b[35mMenghubungkan ke server audio Lavalink...\x1b[0m');
        this.poru.init(this.client);

        this.poru.on('nodeConnect', async (node) => {
            console.log(`\x1b[42m\x1b[30m ✨ SUCCESS \x1b[0m \x1b[32mSistem Audio [${node.name}] Berhasil Tersambung.\x1b[0m`);
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
                }
                
                if (restoredCount > 0) {
                    console.log(`\x1b[45m\x1b[37m 🔄 RESURRECT \x1b[0m \x1b[35mMemulihkan mode 24/7 di ${restoredCount} Server.\x1b[0m`);
                }
            } catch (e) { }
        });

        this.poru.on('nodeError', (node, error) => logError(`Lavalink Error (${node.name})`, error));
        this.poru.on('nodeDisconnect', (node) => console.log(`\x1b[43m\x1b[30m ⚠️ WARNING \x1b[0m \x1b[33mKoneksi Lavalink [${node.name}] Terputus!\x1b[0m`));

        // ==========================================
        // 🎮 SISTEM PENANGKAP TOMBOL (INTERACTIONS)
        // ==========================================
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
            if (!interaction.customId.startsWith('music_')) return;

            const player = this.poru.players.get(interaction.guildId);
            if (!player) return interaction.reply({ content: `Tidak ada sesi audio aktif.`, ephemeral: true });

            const memberVoice = interaction.member.voice.channel;
            if (!memberVoice || memberVoice.id !== player.voiceChannel) {
                return interaction.reply({ content: `Anda harus berada di Voice Channel yang sama untuk mengatur panel ini.`, ephemeral: true });
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'music_recommendation') {
                const trackIdentifier = interaction.values[0];
                try {
                    const res = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${trackIdentifier}`, source: 'youtube', requester: interaction.user });
                    if (res && res.tracks.length > 0) {
                        player.queue.add(res.tracks[0]);
                        if (!player.isPlaying && !player.isPaused) player.play();
                        return interaction.reply({ content: `Lagu **${res.tracks[0].info.title}** ditambahkan ke antrean.`, ephemeral: true });
                    }
                } catch(e) { }
            }

            if (interaction.isButton()) {
                const id = interaction.customId;
                let responseMsg = '';

                if (id === 'music_pause') {
                    player.pause(!player.isPaused);
                    responseMsg = player.isPaused ? `Pemutaran dihentikan sementara.` : `Pemutaran dilanjutkan.`;
                } 
                else if (id === 'music_skip') {
                    if (typeof player.stop === 'function') player.stop();
                    else if (typeof player.stopTrack === 'function') player.stopTrack();
                    else player.node.rest.updatePlayer({ guildId: player.guildId, data: { track: { encoded: null } } });
                    responseMsg = `Melewati trek audio saat ini.`;
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
                    } catch (e) { }

                    player.destroy();
                    responseMsg = `Sesi audio dihentikan sepenuhnya.`;
                }
                else if (id === 'music_loop') {
                    const loopMode = player.loop === 'NONE' ? 'TRACK' : (player.loop === 'TRACK' ? 'QUEUE' : 'NONE');
                    player.setLoop(loopMode);
                    responseMsg = `Mode pengulangan diatur ke: **${loopMode}**`;
                }
                else if (id === 'music_voldown') {
                    player.setVolume(Math.max(0, player.volume - 10));
                    responseMsg = `Volume audio dikurangi menjadi **${player.volume}%**`;
                }
                else if (id === 'music_volup') {
                    player.setVolume(Math.min(100, player.volume + 10));
                    responseMsg = `Volume audio dinaikkan menjadi **${player.volume}%**`;
                }
                else if (id === 'music_shuffle') {
                    player.queue.shuffle();
                    responseMsg = `Antrean audio berhasil diacak.`;
                }
                else if (id === 'music_autoplay') {
                    player.autoplay = !player.autoplay;
                    responseMsg = `Autoplay ${player.autoplay ? 'Diaktifkan' : 'Dinonaktifkan'}.`;
                }
                else if (id === 'music_247') {
                    player.is247 = !player.is247;
                    responseMsg = `ModeSiaga 24/7 ${player.is247 ? 'Diaktifkan' : 'Dinonaktifkan'}.`;

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
                    // Jangan edit attachment, hanya edit tombolnya saja
                    await message.edit({ components: components }).catch(()=>{});
                }

                await interaction.reply({ content: responseMsg, ephemeral: true });
            }
        });

        // ==========================================
        // 🎨 UI PANEL NOW PLAYING (GAMBAR CANVAS)
        // ==========================================
        this.poru.on('trackStart', async (player, track) => {
            try {
                player.previousTrack = track;
                player.autoplayErrorCount = 0;
                player.isResolvingAutoplay = false;

                // --- MENYIMPAN DATA UNTUK MUSIC PROFILE (TRACKER) ---
                if (track.info.requester) {
                    try {
                        const [userProfile] = await UserProfile.findOrCreate({ where: { userId: track.info.requester.id } });
                        userProfile.music_tracksListened = (userProfile.music_tracksListened || 0) + 1;
                        userProfile.music_totalDurationMs = BigInt(userProfile.music_totalDurationMs || 0) + BigInt(track.info.length || 0);
                        userProfile.music_lastListened = track.info.title.substring(0, 100);
                        await userProfile.save();
                    } catch (e) { }
                }

                // Matikan interval lama jika ada
                if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);

                const channel = this.client.channels.cache.get(player.textChannel);
                if (!channel) return;

                // 1. Generate Gambar Panel Sesi Audio (Koneksi Ditolak) menggunakan Canvas
                const renderPanel = async (pos) => {
                    const imageBuffer = await generateMusicPanelImage(
                        track, 
                        pos, 
                        this.client.user.displayAvatarURL({ extension: 'png' })
                    );
                    return new AttachmentBuilder(imageBuffer, { name: 'naura-audio-panel.png' });
                };

                // 2. Buat Rekomendasi Menu Dropdown
                let recommendedTracks = [];
                try {
                    const searchRes = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${track.info.identifier}&list=RD${track.info.identifier}`, source: 'youtube', requester: this.client.user });
                    if (searchRes && searchRes.tracks) {
                        recommendedTracks = searchRes.tracks.filter(t => t.info.identifier !== track.info.identifier).slice(0, 5);
                    }
                } catch (e) {}

                // 3. Buat Tombol-tombol Kontrol Simpel
                const fallbackGetUIEmoji = (name, fallback) => ui.getEmoji ? ui.getEmoji(name) : fallback;

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

                const rowButtons1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_voldown').setEmoji(fallbackGetUIEmoji('musicVolDown', '🔉')).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_pause').setEmoji(fallbackGetUIEmoji('musicPlayPause', '⏯️')).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_skip').setEmoji(fallbackGetUIEmoji('musicSkip', '⏭️')).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_loop').setEmoji(fallbackGetUIEmoji('musicLoop', '🔁')).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_volup').setEmoji(fallbackGetUIEmoji('musicVolUp', '🔊')).setStyle(ButtonStyle.Secondary)
                );

                const rowButtons2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_autoplay').setEmoji(fallbackGetUIEmoji('musicAutoplay', '📻')).setStyle(player.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary), 
                    new ButtonBuilder().setCustomId('music_lyrics').setEmoji(fallbackGetUIEmoji('musicLyrics', '📝')).setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId('music_stop').setEmoji(fallbackGetUIEmoji('musicStop', '⏹️')).setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId('music_shuffle').setEmoji(fallbackGetUIEmoji('musicShuffle', '🔀')).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_247').setEmoji(fallbackGetUIEmoji('music247', '🛡️')).setStyle(player.is247 ? ButtonStyle.Primary : ButtonStyle.Secondary) 
                );

                const components = [rowButtons1, rowButtons2];
                if (rowDropdown) components.unshift(rowDropdown);

                // 4. Kirim Gambar Panel Pertama
                const firstAttachment = await renderPanel(0);
                const message = await channel.send({ files: [firstAttachment], components: components });
                
                // Menghapus panel lama
                if (player.nowPlayingMessage) {
                    const oldMessage = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                    if (oldMessage) await oldMessage.delete().catch(() => {});
                }
                player.nowPlayingMessage = message.id;

                // 5. SISTEM UPDATE LOOP (15 Detik): Merender Ulang Gambar
                // Kita tidak mengedit embed, tapi mengedit komponen dengan mengirim ulang file gambar.
                player.panelUpdateInterval = setInterval(async () => {
                    if (!player || player.state === 'DISCONNECTED') {
                        clearInterval(player.panelUpdateInterval);
                        return;
                    }
                    if (player.isPaused) return;

                    try {
                        const newAttachment = await renderPanel(player.position);
                        
                        // Cara mengupdate file gambar di message.edit (mengirim ulang attachment)
                        await message.edit({ files: [newAttachment] }).catch(()=>{});
                    } catch (err) {
                        if (err.code === 10008) clearInterval(player.panelUpdateInterval);
                    }
                }, 15000); 

            } catch (error) { logError('Poru TrackStart Error', error); }
        });

        // ==========================================
        // 🛑 EVENT: SISTEM AUTOPLAY & END SESSION
        // ==========================================
        this.poru.on('queueEnd', async (player) => {
            try {
                if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);
                const channel = this.client.channels.cache.get(player.textChannel);
                
                if (player.autoplay && player.previousTrack) {
                    if (player.isResolvingAutoplay) return; 
                    if (player.autoplayErrorCount >= 3) {
                        player.autoplay = false; 
                    } else {
                        player.isResolvingAutoplay = true;
                        
                        setTimeout(async () => {
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
                            } catch (e) { }
                            
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
                    const endColor = is247 ? '#00FFFF' : ui.getColor ? ui.getColor('kythiaDark') : '#2b2d31';
                    
                    const embed = new EmbedBuilder()
                        .setColor(endColor)
                        .setDescription(is247 ? `Antrean selesai. Naura Intelligence siaga 24/7.` : `Antrean musik selesai. Memutuskan sesi audio.`);
                    await channel.send({ embeds: [embed] });
                }
                
                if (!player.is247) player.destroy();

            } catch (error) {
                if (!player.is247) player.destroy();
            }
        });
    }
}

module.exports = MusicManager;
