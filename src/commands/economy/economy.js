const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const UserProfile = require('../../models/UserProfile');
const ui = require('../../config/ui');

async function runEconomyLogic(client, user, subcommandName, interaction, sendReply, isSlash) {
    let [profile] = await UserProfile.findOrCreate({ where: { userId: user.id } });
    
    if (!profile.inventory) profile.inventory = [];
    if (!profile.cooldowns) profile.cooldowns = {};
    if (profile.economy_wallet == null) profile.economy_wallet = 0;
    if (profile.economy_bank == null) profile.economy_bank = 0;

    const subcommandPath = path.join(__dirname, 'subcommands', `${subcommandName}.js`);

    if (!fs.existsSync(subcommandPath)) {
        return sendReply({ 
            embeds: [new EmbedBuilder().setColor(ui.getColor('error')).setDescription(`${ui.getEmoji('error')} Subcommand \`${subcommandName}\` sedang dalam perbaikan atau file tidak ditemukan!`)] 
        });
    }

    try {
        const subcommand = require(subcommandPath);
        // Perlu passing interaction untuk fungsi-fungsi di dalam subcommands yang memakai interaction.options, interaction.editReply dll.
        // Jika isSlash false (Prefix command), maka 'interaction' yang dilempar adalah mockInteraction.
        await subcommand.execute(interaction, profile, ui);
    } catch (error) {
        console.error(error);
        sendReply({ content: `${ui.getEmoji('error')} Terdapat error sistemik saat menjalankan fitur ekonomi ini.` });
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('economy')
        .setDescription('💰 Sistem Ekonomi Global, Pusat Belanja, & RPG Naura')
        .addSubcommand(sub => sub.setName('menu').setDescription('🏦 Buka pusat kontrol Ekonomi interaktif & RPG (Dashboard Global).'))
        .addSubcommand(sub => sub.setName('balance').setDescription('💳 Intip sisa saldo dompet dan uang di rekening bank-mu.').addUserOption(opt => opt.setName('target').setDescription('Pilih rekening user lain')))
        .addSubcommand(sub => sub.setName('inventory').setDescription('🎒 Buka tas ajaib untuk melihat semua item, booster, dan perlengkapanmu.'))
        .addSubcommand(sub => sub.setName('shop').setDescription('🛒 Kunjungi distrik perbelanjaan untuk membeli item kebutuhan RPG.')
            .addStringOption(opt => opt.setName('kategori').setDescription('Pilih katalog toko').setRequired(true)
                .addChoices(
                    { name: '🏪 Supermarket (Booster & Utility)', value: 'market' },
                    { name: '💀 Black Market (Senjata & Ilegal)', value: 'blackmarket' },
                    { name: '🏎️ Dealer Premium (Mobil Balap Sport)', value: 'car' },
                    { name: '🎣 Toko Nelayan (Kail & Umpan Langka)', value: 'fishing' }
                )))
        .addSubcommand(sub => sub.setName('buy').setDescription('🛍️ Checkout item impianmu dari katalog toko yang buka.')
            .addStringOption(opt => opt.setName('kode_barang').setDescription('Masukkan ID Barang (Lihat di katalog toko)').setRequired(true)))
        .addSubcommand(sub => sub.setName('daily').setDescription('🎁 [24 JAM] Klaim tunjangan harian gratis dari Pemerintah Naura!'))
        .addSubcommand(sub => sub.setName('weekly').setDescription('💎 [7 HARI] Cairkan bonus gajian mingguan dalam jumlah fantastis.'))
        .addSubcommand(sub => sub.setName('work').setDescription('💼 [10 MNT] Bekerja keras menyelesaikan tugas ringan untuk mengumpulkan koin.'))
        .addSubcommand(sub => sub.setName('lootbox').setDescription('📦 [3 JAM] Uji keberuntunganmu! Buka peti misteri penuh harta kejutan.'))
        .addSubcommand(sub => sub.setName('race').setDescription('🏎️ [1 JAM] Panaskan mesin! Ikuti kejuaraan balap mobil 4 Lap interaktif.'))
        .addSubcommand(sub => sub.setName('hack').setDescription('💻 [45 MNT] Retas brankas sistem keamanan bank untuk cuan instan!'))
        .addSubcommand(sub => sub.setName('steal').setDescription('🥷 [45 MNT] Menyusup ke kasino dan curi kantong koin player lain!'))
        .addSubcommand(sub => sub.setName('fish').setDescription('🎣 [15 MNT] Bersantai di tepi danau, lempar kail, dan pancing ikan langka.')),

    aliases: ['balance', 'buy', 'daily', 'fish', 'hack', 'inventory', 'lootbox', 'menu', 'race', 'shop', 'steal', 'weekly', 'work'],

    async execute(interaction) {
        await interaction.deferReply();
        const subcommandName = interaction.options.getSubcommand() || 'menu';
        const user = interaction.options.getUser('target') || interaction.user;

        const sendReply = async (payload) => await interaction.editReply(payload).catch(()=>{});

        await runEconomyLogic(interaction.client, user, subcommandName, interaction, sendReply, true);
    },

    async executePrefix(message, args, client) {
        let subcommandName = args[0] ? args[0].toLowerCase() : 'menu';
        
        // Buat mockInteraction agar subcommand kompatibel
        const mockInteraction = {
            client: client,
            user: message.author,
            member: message.member,
            guild: message.guild,
            channel: message.channel,
            options: {
                getSubcommand: () => subcommandName,
                getUser: () => message.mentions.users.first() || null,
                getString: (name) => {
                    let tempArgs = [...args];
                    if (tempArgs.length > 0) tempArgs.shift();
                    return tempArgs.join(' ') || null;
                }
            },
            deferReply: async () => {},
            editReply: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                delete msgPayload.ephemeral;
                return await message.reply(msgPayload);
            },
            reply: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                delete msgPayload.ephemeral;
                return await message.reply(msgPayload);
            },
            followUp: async (payload) => {
                let msgPayload = typeof payload === 'string' ? { content: payload, embeds: [], components: [], files: [] } : { content: null, embeds: [], components: [], files: [], ...payload };
                delete msgPayload.ephemeral;
                return await message.channel.send(msgPayload);
            }
        };

        const targetUser = mockInteraction.options.getUser() || message.author;
        const sendReply = async (payload) => await mockInteraction.editReply(payload).catch(()=>{});

        await runEconomyLogic(client, targetUser, subcommandName, mockInteraction, sendReply, false);
    }
};