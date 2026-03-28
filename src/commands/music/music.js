const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType } = require('discord.js');
const ui = require('../../config/ui');

const formatDuration = (ms) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('music')
        .setDescription('🎵 Sistem Kontrol Musik Naura Pro')
        .addSubcommand(sub =>
            sub.setName('play')
                .setDescription('Putar lagu dari YouTube atau Spotify.')
                .addStringOption(opt => 
                    opt.setName('query')
                        .setDescription('Judul lagu atau URL')
                        .setRequired(true))
        )
        .addSubcommand(sub => sub.setName('stop').setDescription('Hentikan musik dan bot keluar dari Voice.'))
        .addSubcommand(sub => sub.setName('skip').setDescription('Lewati lagu yang sedang diputar saat ini.'))
        .addSubcommand(sub =>
            sub.setName('lyrics')
                .setDescription('Cari lirik lagu penuh dari database modern.')
                .addStringOption(opt => opt.setName('judul').setDescription('Judul lagu (opsional)'))
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const subcommand = interaction.options.getSubcommand();
        const poru = interaction.client.musicManager.poru;
        const memberVoice = interaction.member.voice.channel;

        if (subcommand !== 'lyrics' && !memberVoice) {
            return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} **Oops!** Kamu harus berada di Voice Channel untuk mendengarkan musik bersamaku, Master!`)] });
        }

        let player = poru.players.get(interaction.guildId);

        // ==========================================
        // 1. LOGIKA PLAY 
        // ==========================================
        if (subcommand === 'play') {
            if (player && player.voiceChannel !== memberVoice.id) {
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} **Ehh!** Kita sedang tidak di Voice Channel yang sama. Kemarilah!`)] });
            }

            if (!player) {
                player = poru.createConnection({
                    guildId: interaction.guildId,
                    voiceChannel: memberVoice.id,
                    textChannel: interaction.channelId,
                    deaf: true
                });
                player.autoplay = false;
                player.is247 = false; 
            }

            const query = interaction.options.getString('query');
            const res = await poru.resolve({ query, source: 'ytsearch', requester: interaction.user });

            if (res.loadType === 'error' || res.loadType === 'empty' || !res.tracks.length) {
                return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} **Maaf!** Naura tidak bisa menemukan lagu tersebut atau server sedang sibuk.`)] });
            }

            if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED' || query.startsWith('http')) {
                if (res.loadType === 'playlist' || res.loadType === 'PLAYLIST_LOADED') {
                    for (const track of res.tracks) player.queue.add(track);
                    
                    const playlistEmbed = new EmbedBuilder()
                        .setColor(ui.colors.kythiaDark)
                        .setAuthor({ name: 'Playlist Ditambahkan!', iconURL: interaction.client.user.displayAvatarURL() })
                        .setDescription(`${ui.emojis.musicAutoplay} **${res.tracks.length}** lagu dari playlist telah dimasukkan ke dalam antrean!`)
                        .setFooter({ text: `Diminta oleh ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });
                        
                    interaction.editReply({ embeds: [playlistEmbed] });
                } else {
                    const track = res.tracks[0];
                    player.queue.add(track);
                    
                    const trackEmbed = new EmbedBuilder()
                        .setColor(ui.colors.primary)
                        .setAuthor({ name: 'Lagu Dimasukkan Antrean!', iconURL: interaction.client.user.displayAvatarURL() })
                        .setDescription(`${ui.emojis.musicPlayPause} **[${track.info.title}](${track.info.uri})**`)
                        .addFields(
                            { name: '🎤 Penyanyi', value: `\`${track.info.author}\``, inline: true },
                            { name: '⏱️ Durasi', value: `\`${formatDuration(track.info.length)}\``, inline: true }
                        )
                        .setFooter({ text: `Pilihan dari ${interaction.user.username} 💕`, iconURL: interaction.user.displayAvatarURL() });

                    interaction.editReply({ embeds: [trackEmbed] });
                }
                
                if (!player.isPlaying && !player.isPaused) player.play();
                return;
            }

            const tracks = res.tracks.slice(0, 5); 
            
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('music_select')
                .setPlaceholder('🎵 Pilih lagu mahakaryamu di sini...')
                .addOptions(tracks.map((track, index) => ({
                    label: track.info.title.substring(0, 95),
                    description: `Penyanyi: ${track.info.author.substring(0, 40)} | Durasi: ${formatDuration(track.info.length)}`,
                    value: index.toString(),
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            const searchEmbed = new EmbedBuilder()
                .setColor(ui.colors.economy)
                .setAuthor({ name: 'Hasil Pencarian Musik', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`${ui.emojis.loading} Naura menemukan beberapa lagu untuk **"${query}"**.\n\n👇 *Silakan pilih salah satu dari menu di bawah!*`)
                .setFooter({ text: 'Pilih dalam 60 detik ya! ⏱️' });

            const response = await interaction.editReply({ embeds: [searchEmbed], components: [row] });

            const collector = response.createMessageComponentCollector({ componentType: ComponentType.StringSelect, time: 60000 });

            collector.on('collect', async (i) => {
                if (i.user.id !== interaction.user.id) {
                    return i.reply({ content: `${ui.emojis.error} Hmph! Ini bukan pencarianmu!`, ephemeral: true });
                }

                const selectedIndex = parseInt(i.values[0]);
                const selectedTrack = tracks[selectedIndex];

                player.queue.add(selectedTrack);
                if (!player.isPlaying && !player.isPaused) player.play();

                const successEmbed = new EmbedBuilder()
                    .setColor(ui.colors.success)
                    .setAuthor({ name: 'Berhasil Memutar Lagu', iconURL: interaction.client.user.displayAvatarURL() })
                    .setDescription(`${ui.emojis.success} **[${selectedTrack.info.title}](${selectedTrack.info.uri})** telah ditambahkan!`)
                    .addFields(
                        { name: '🎤 Penyanyi', value: `\`${selectedTrack.info.author}\``, inline: true },
                        { name: '⏱️ Durasi', value: `\`${formatDuration(selectedTrack.info.length)}\``, inline: true }
                    )
                    .setFooter({ text: `Diputar oleh ${i.user.username} 🎧`, iconURL: i.user.displayAvatarURL() });

                await i.update({ embeds: [successEmbed], components: [] }); 
            });

            collector.on('end', (collected) => {
                if (collected.size === 0) {
                    const expiredEmbed = new EmbedBuilder()
                        .setColor(ui.colors.kythiaDark)
                        .setDescription(`${ui.emojis.error} **Waktu habis!** Kamu terlalu lama memilih lagu.`);
                    response.edit({ embeds: [expiredEmbed], components: [] }).catch(() => {});
                }
            });
        }

        // ==========================================
        // 2. LOGIKA STOP, SKIP, LYRICS
        // ==========================================
        else if (subcommand === 'stop') {
            if (!player) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} Tidak ada alunan musik yang sedang diputar!`)] });
            
            player.destroy();
            const stopEmbed = new EmbedBuilder()
                .setColor(ui.colors.error)
                .setAuthor({ name: 'Musik Dihentikan', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`${ui.emojis.musicStop} Pesta telah usai! Naura mematikan musik dan keluar dari Voice Channel. Sampai jumpa lagi! 👋`);
                
            await interaction.editReply({ embeds: [stopEmbed] });
        }

        else if (subcommand === 'skip') {
            if (!player || !player.currentTrack) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} Tidak ada musik yang bisa dilewati!`)] });
            
            if (typeof player.stop === 'function') player.stop();
            else if (typeof player.stopTrack === 'function') player.stopTrack();
            else player.node.rest.updatePlayer({ guildId: player.guildId, data: { track: { encoded: null } } });
            
            const skipEmbed = new EmbedBuilder()
                .setColor(ui.colors.economy)
                .setAuthor({ name: 'Lagu Dilewati', iconURL: interaction.client.user.displayAvatarURL() })
                .setDescription(`${ui.emojis.musicSkip} Lagu di-skip! Memutar mahakarya selanjutnya di antrean... 🎧`);
                
            await interaction.editReply({ embeds: [skipEmbed] });
        }

        else if (subcommand === 'lyrics') {
            let q = interaction.options.getString('judul');
            if (!q && player && player.currentTrack) {
                q = `${player.currentTrack.info.title} ${player.currentTrack.info.author}`;
            }

            if (!q) return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} Sebutkan judul lagu atau putar musik terlebih dahulu!`)] });

            try {
                const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(q)}`);
                const data = await res.json();

                if (!data || data.length === 0 || !data[0].plainLyrics) {
                    return interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} Maaf, Naura tidak bisa menemukan lirik untuk **${q}**.`)] });
                }

                let lyrics = data[0].plainLyrics;
                if (lyrics.length > 4000) lyrics = lyrics.substring(0, 4000) + '... (Terpotong)';

                const lyricEmbed = new EmbedBuilder()
                    .setColor(ui.colors.primary)
                    .setAuthor({ name: 'Naura Lyrics Center', iconURL: interaction.client.user.displayAvatarURL() })
                    .setTitle(`${ui.emojis.musicLyrics} ${data[0].trackName} — ${data[0].artistName}`)
                    .setDescription(`\`\`\`text\n${lyrics}\n\`\`\``)
                    .setFooter({ text: `Sumber: LRCLIB | Diminta oleh ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() });

                await interaction.editReply({ embeds: [lyricEmbed] });
            } catch (error) {
                await interaction.editReply({ embeds: [new EmbedBuilder().setColor(ui.colors.error).setDescription(`${ui.emojis.error} Waduh! Naura gagal menghubungi server lirik.`)] });
            }
        }
    }
};