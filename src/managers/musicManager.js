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
    const dot = ui.emojis.progressDot || '🔘';
    const line = ui.emojis.progressLine || '▬';

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
        console.log('\x1b[36m[🎵 AUDIO ENGINE]\x1b[0m Menginisialisasi sistem musik Lavalink...');
        this.poru.init(this.client);

        this.poru.on('nodeConnect', async (node) => {
            console.log(`\x1b[32m[🎵 LAVALINK]\x1b[0m Node ${node.name} Tersambung.`);
            try {
                const settings = await GuildSettings.find({ "music.twentyFourSeven": true });
                let restoredCount = 0;

                for (const guildData of settings) {
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
                if (restoredCount > 0) {
                    console.log(`\x1b[36m[🔄 RESURRECTOR]\x1b[0m Berhasil membangkitkan Naura ke ${restoredCount} Voice Channel!`);
                }
            } catch (e) {
                logError('Resurrector Error', e);
            }
        });

        this.poru.on('nodeError', (node, error) => logError(`Lavalink Error (${node.name})`, error));
        this.poru.on('nodeDisconnect', (node) => console.log(`\x1b[33m[🎵 LAVALINK]\x1b[0m Node ${node.name} Terputus!`));

        // ==========================================
        // 🎮 SISTEM PENANGKAP TOMBOL & DROPDOWN
        // ==========================================
        this.client.on('interactionCreate', async (interaction) => {
            if (!interaction.isButton() && !interaction.isStringSelectMenu()) return;
            if (!interaction.customId.startsWith('music_')) return;

            const player = this.poru.players.get(interaction.guildId);
            if (!player) return interaction.reply({ content: `${ui.emojis.error} Tidak ada musik yang sedang diputar.`, ephemeral: true });

            const memberVoice = interaction.member.voice.channel;
            if (!memberVoice || memberVoice.id !== player.voiceChannel) {
                return interaction.reply({ content: `${ui.emojis.error} Kamu harus berada di Voice Channel yang sama denganku!`, ephemeral: true });
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'music_recommendation') {
                const trackIdentifier = interaction.values[0];
                try {
                    const res = await this.poru.resolve({ query: `https://www.youtube.com/watch?v=${trackIdentifier}`, source: 'youtube', requester: interaction.user });
                    if (res && res.tracks.length > 0) {
                        player.queue.add(res.tracks[0]);
                        if (!player.isPlaying && !player.isPaused) player.play();
                        return interaction.reply({ content: `${ui.emojis.success} **${res.tracks[0].info.title}** berhasil ditambahkan ke antrean!`, ephemeral: true });
                    }
                } catch(e) {
                    return interaction.reply({ content: `${ui.emojis.error} Gagal memuat lagu.`, ephemeral: true });
                }
            }

            if (interaction.isButton()) {
                const id = interaction.customId;
                let responseMsg = '';

                if (id === 'music_pause') {
                    player.pause(!player.isPaused);
                    responseMsg = player.isPaused ? `${ui.emojis.musicPlayPause} Musik berhasil dijeda.` : `${ui.emojis.musicPlayPause} Musik dilanjutkan kembali.`;
                } 
                else if (id === 'music_skip') {
                    if (typeof player.stop === 'function') player.stop();
                    else if (typeof player.stopTrack === 'function') player.stopTrack();
                    else player.node.rest.updatePlayer({ guildId: player.guildId, data: { track: { encoded: null } } });
                    responseMsg = `${ui.emojis.musicSkip} Lagu saat ini dilewati.`;
                }
                else if (id === 'music_stop') {
                    player.is247 = false; 
                    await GuildSettings.findOneAndUpdate({ guildId: interaction.guildId }, { $set: { "music.twentyFourSeven": false, "music.voiceChannel": null, "music.textChannel": null } });
                    player.destroy();
                    responseMsg = `${ui.emojis.musicStop} Pesta selesai! Musik dihentikan sepenuhnya.`;
                }
                else if (id === 'music_loop') {
                    const loopMode = player.loop === 'NONE' ? 'TRACK' : (player.loop === 'TRACK' ? 'QUEUE' : 'NONE');
                    player.setLoop(loopMode);
                    responseMsg = `${ui.emojis.musicLoop} Mode Pengulangan diatur ke: **${loopMode}**`;
                }
                else if (id === 'music_voldown') {
                    player.setVolume(Math.max(0, player.volume - 10));
                    responseMsg = `${ui.emojis.musicVolDown} Volume turun menjadi: **${player.volume}%**`;
                }
                else if (id === 'music_volup') {
                    player.setVolume(Math.min(100, player.volume + 10));
                    responseMsg = `${ui.emojis.musicVolUp} Volume naik menjadi: **${player.volume}%**`;
                }
                else if (id === 'music_shuffle') {
                    player.queue.shuffle();
                    responseMsg = `${ui.emojis.musicShuffle} Antrean musik berhasil diacak!`;
                }
                else if (id === 'music_lyrics') {
                    return interaction.reply({ content: `📝 Gunakan command \`/music lyrics\` untuk mencari lirik lengkap ya!`, ephemeral: true });
                }
                else if (id === 'music_autoplay') {
                    player.autoplay = !player.autoplay;
                    responseMsg = `${ui.emojis.musicAutoplay} Sistem Autoplay ${player.autoplay ? '**DIAKTIFKAN**' : '**DIMATIKAN**'}.`;
                }
                else if (id === 'music_247') {
                    player.is247 = !player.is247;
                    responseMsg = `${ui.emojis.music247} Mode Siaga 24/7 ${player.is247 ? '**DIAKTIFKAN**' : '**DIMATIKAN**'}.`;

                    await GuildSettings.findOneAndUpdate(
                        { guildId: interaction.guildId },
                        { 
                            $set: { 
                                "music.twentyFourSeven": player.is247,
                                "music.voiceChannel": player.is247 ? player.voiceChannel : null,
                                "music.textChannel": player.is247 ? player.textChannel : null
                            } 
                        },
                        { upsert: true, new: true }
                    ).catch(e => logError('Gagal menyimpan mode 24/7', e));
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
        // 🎨 UI PANEL NOW PLAYING (DENGAN BANNER LOKAL)
        // ==========================================
        this.poru.on('trackStart', async (player, track) => {
            try {
                player.previousTrack = track;
                
                // 🛡️ Reset Error Counter jika lagu berhasil diputar!
                player.autoplayErrorCount = 0;
                player.isResolvingAutoplay = false;

                // 🛡️ Sistem Tracker Sejarah (Max 30 lagu)
                player.playedHistory = player.playedHistory || [];
                if (!player.playedHistory.includes(track.info.identifier)) {
                    player.playedHistory.push(track.info.identifier);
                }
                if (player.playedHistory.length > 30) player.playedHistory.shift();

                const channel = this.client.channels.cache.get(player.textChannel);
                if (!channel) return;

                player.autoplay = player.autoplay || false;
                
                if (player.is247 === undefined) {
                    const dbSettings = await GuildSettings.findOne({ guildId: player.guildId });
                    player.is247 = dbSettings?.music?.twentyFourSeven || false;
                }
                
                if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);

                // 🟢 MEMBUAT ATTACHMENT BANNER MUSIK DARI FOLDER LOKAL
                const bannerAttachment = new AttachmentBuilder(ui.banners.music || './assets/banner_music.png', { name: 'banner_music.png' });

                const buildEmbed = (currentPos) => {
                    const progressBar = createProgressBar(currentPos, track.info.length);
                    const thumbnailUrl = `https://img.youtube.com/vi/${track.info.identifier}/maxresdefault.jpg`;
                    
                    return new EmbedBuilder()
                        .setColor(ui.colors.primary) 
                        .setAuthor({ name: 'Sekarang Memutar', iconURL: this.client.user.displayAvatarURL({ dynamic: true }) })
                        .setTitle(`${ui.emojis.musicPlayPause} ${track.info.title}`)
                        .setURL(track.info.uri)
                        .setDescription(`Gunakan panel di bawah untuk mengontrol pemutar musik.\n\n${progressBar}`)
                        // 🟢 Meletakkan thumbnail lagu di sudut kanan atas
                        .setThumbnail(thumbnailUrl)
                        // 🟢 Meletakkan banner lokal secara full lebar di bawah embed
                        .setImage('attachment://banner_music.png')
                        .addFields(
                            { name: '🎤 Penyanyi', value: `\`${track.info.author}\``, inline: true },
                            { name: '🎧 Diminta Oleh', value: track.info.requester ? `<@${track.info.requester.id}>` : `\`Naura Auto-Play\``, inline: true },
                            { name: `${ui.emojis.musicVolUp} Volume`, value: `\`${player.volume}%\``, inline: true }
                        )
                        .setFooter({ text: '© Naura Hoshino Music System' })
                        .setTimestamp();
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
                                emoji: ui.emojis.musicAutoplay
                            })))
                    ));
                }

                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('music_voldown').setEmoji(ui.emojis.musicVolDown).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_pause').setEmoji(ui.emojis.musicPlayPause).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_skip').setEmoji(ui.emojis.musicSkip).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_loop').setEmoji(ui.emojis.musicLoop).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId('music_volup').setEmoji(ui.emojis.musicVolUp).setStyle(ButtonStyle.Secondary)
                ));

                components.push(new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('music_autoplay')
                        .setEmoji(ui.emojis.musicAutoplay)
                        .setStyle(player.autoplay ? ButtonStyle.Primary : ButtonStyle.Secondary), 
                    
                    new ButtonBuilder()
                        .setCustomId('music_lyrics')
                        .setEmoji(ui.emojis.musicLyrics)
                        .setStyle(ButtonStyle.Success),
                    
                    new ButtonBuilder()
                        .setCustomId('music_stop')
                        .setEmoji(ui.emojis.musicStop)
                        .setStyle(ButtonStyle.Danger),
                    
                    new ButtonBuilder()
                        .setCustomId('music_shuffle')
                        .setEmoji(ui.emojis.musicShuffle)
                        .setStyle(ButtonStyle.Secondary),
                    
                    new ButtonBuilder()
                        .setCustomId('music_247')
                        .setEmoji(ui.emojis.music247)
                        .setStyle(player.is247 ? ButtonStyle.Primary : ButtonStyle.Secondary) 
                ));

                // 🟢 Mengirim pesan pertama kali berserta banner (Files Array)
                const message = await channel.send({ embeds: [buildEmbed(0)], components: components, files: [bannerAttachment] });
                
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
                        // 🟢 Saat mengedit Embed (update durasi progress bar), kita tidak perlu mengirim file-nya lagi
                        // Discord akan mempertahankan gambar lokal selama referensi 'attachment://...' ada di embed-nya
                        await message.edit({ embeds: [buildEmbed(player.position)] });
                    } catch (err) {
                        if (err.code === 10008) clearInterval(player.panelUpdateInterval);
                    }
                }, 12000); 

            } catch (error) { logError('Poru TrackStart Error', error); }
        });

        // 🛡️ Menangkap error lagu (Trigger saat lagu diblokir YouTube/Lavalink)
        this.poru.on('trackError', (player, track, error) => {
            console.log(`\x1b[31m[🎵 LAVALINK]\x1b[0m Lagu diblokir/error: ${track?.info?.title}`);
            if (player.panelUpdateInterval) clearInterval(player.panelUpdateInterval);
            
            // Tambahkan counter kegagalan
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
                
                // 1. SISTEM AUTOPLAY
                if (player.autoplay && player.previousTrack) {
                    
                    // 🛡️ CEGAH LOOP RESOLVE & SPAM (Maksimal gagal 3x berturut-turut)
                    if (player.isResolvingAutoplay) return; 
                    if (player.autoplayErrorCount >= 3) {
                        player.autoplay = false; // Matikan paksa
                        if (channel) {
                            channel.send({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} **Autoplay Dimatikan!** Terlalu banyak lagu yang diblokir/error berurutan.`)] });
                        }
                    } else {
                        // Tahan 2 Detik sebelum mencari lagu baru agar tidak nge-spam API
                        player.isResolvingAutoplay = true;
                        
                        setTimeout(async () => {
                            console.log('\x1b[36m[📻 AUTOPLAY]\x1b[0m Mencari lagu...');
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
                                        // Pilih secara acak dari 3 teratas
                                        let nextTrack = validTracks[Math.floor(Math.random() * Math.min(validTracks.length, 3))];
                                        player.playedHistory.push(nextTrack.info.identifier);

                                        player.queue.add(nextTrack);
                                        player.play();
                                        player.isResolvingAutoplay = false;
                                        return; 
                                    }
                                }
                            } catch (e) { logError('Poru Autoplay Error', e); }
                            
                            // Jika gagal mencari, matikan resolve lock agar bisa mati normal
                            player.isResolvingAutoplay = false;
                        }, 2000); // ⏱️ Delay 2 Detik Anti-Spam
                        
                        return; // Hentikan queueEnd di sini agar tidak menghapus panel dll
                    }
                }

                // 2. SISTEM NORMAL (Autoplay Habis/Mati)
                if (channel) {
                    if (player.nowPlayingMessage) {
                        const lastPanel = await channel.messages.fetch(player.nowPlayingMessage).catch(() => null);
                        if (lastPanel) await lastPanel.delete().catch(() => {});
                    }

                    const is247 = player.is247 || false;
                    const embed = new EmbedBuilder()
                        .setColor(is247 ? ui.colors.economy : ui.colors.kythiaDark)
                        .setDescription(is247 ? `${ui.emojis.music247} Antrean habis. Naura **Siaga 24/7** di dalam Voice.` : `${ui.emojis.musicStop} Antrean musik habis. Naura keluar dari Voice Channel.`);
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