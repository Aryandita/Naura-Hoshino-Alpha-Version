const { 
    SlashCommandBuilder, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelSelectMenuBuilder,
    RoleSelectMenuBuilder,
    StringSelectMenuBuilder,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const GuildSettings = require('../../models/GuildSettings');
const ui = require('../../config/ui');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setup-vanity')
        .setDescription('✨ [ADMIN] Setup Vanity Roles interaktif (Menu Formulir)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        let [db] = await GuildSettings.findOrCreate({ where: { guildId: interaction.guild.id } });
        let settings = db.settings || {};
        
        if (!settings.vanityRoles) {
            settings.vanityRoles = { enabled: false, text: null, roles: [], channelId: null, message: null };
        }
        let v = settings.vanityRoles;

        const generateDashboard = () => {
            const rolesList = v.roles.length > 0 ? v.roles.map(id => `<@&${id}>`).join(', ') : '*Tidak ada*';
            
            const embed = new EmbedBuilder()
                .setColor(ui.getColor('primary'))
                .setTitle('⚙️ Setup Vanity Roles')
                .setDescription('Gunakan menu interaktif di bawah ini untuk mengatur sistem Vanity Roles.\n\n**Konfigurasi Saat Ini:**\n' +
                    `> 🟢 **Status:** ${v.enabled ? 'Aktif ✅' : 'Mati ❌'}\n` +
                    `> ✍️ **Teks Vanity:** ${v.text ? `\`${v.text}\`` : '*Belum diatur*'}\n` +
                    `> 📍 **Channel Log:** ${v.channelId ? `<#${v.channelId}>` : '*Belum diatur*'}\n` +
                    `> 🎭 **Reward Roles:** ${rolesList}\n` +
                    `> 💬 **Pesan Custom:** ${v.message || '*Belum diatur*'}`
                )
                .setFooter({ text: 'Naura Interactive Setup' });

            // Row 1: Channel Select
            const rowChannel = new ActionRowBuilder().addComponents(
                new ChannelSelectMenuBuilder().setCustomId('sv_select_channel').setPlaceholder('1️⃣ Pilih Channel Log Vanity').addChannelTypes(ChannelType.GuildText)
            );
            
            // Row 2: Add Role Select
            const rowRole = new ActionRowBuilder().addComponents(
                new RoleSelectMenuBuilder().setCustomId('sv_add_role').setPlaceholder('2️⃣ Tambahkan Reward Role').setMaxValues(1)
            );

            // Row 3: Remove Role Select (Jika ada role)
            const rowRemoveRole = new ActionRowBuilder();
            if (v.roles.length > 0) {
                const removeSelect = new StringSelectMenuBuilder().setCustomId('sv_remove_role').setPlaceholder('🗑️ Hapus Reward Role');
                v.roles.forEach(roleId => {
                    removeSelect.addOptions({ label: `Hapus Role ID: ${roleId}`, value: roleId });
                });
                rowRemoveRole.addComponents(removeSelect);
            }

            // Row 4: Buttons (Toggle, Text, Message, Save)
            const rowBtns = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sv_toggle').setLabel(v.enabled ? 'Matikan Sistem' : 'Aktifkan Sistem').setEmoji(v.enabled ? '❌' : '✅').setStyle(v.enabled ? ButtonStyle.Danger : ButtonStyle.Success),
                new ButtonBuilder().setCustomId('sv_edit_text').setLabel('Set Teks & Pesan').setEmoji('📝').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('sv_save').setLabel('Simpan & Selesai').setEmoji('💾').setStyle(ButtonStyle.Secondary)
            );

            const components = [rowChannel, rowRole];
            if (v.roles.length > 0) components.push(rowRemoveRole);
            components.push(rowBtns);

            return { embeds: [embed], components, ephemeral: true };
        };

        const response = await interaction.reply(generateDashboard());
        const collector = response.createMessageComponentCollector({ time: 300000 });

        collector.on('collect', async i => {
            if (i.user.id !== interaction.user.id) return i.reply({ content: 'Sesi ini bukan milikmu.', ephemeral: true });

            if (i.isChannelSelectMenu() && i.customId === 'sv_select_channel') {
                v.channelId = i.values[0];
                await i.update(generateDashboard());
            }

            if (i.isRoleSelectMenu() && i.customId === 'sv_add_role') {
                const roleId = i.values[0];
                if (!v.roles.includes(roleId)) v.roles.push(roleId);
                await i.update(generateDashboard());
            }

            if (i.isStringSelectMenu() && i.customId === 'sv_remove_role') {
                v.roles = v.roles.filter(id => id !== i.values[0]);
                await i.update(generateDashboard());
            }

            if (i.isButton() && i.customId === 'sv_toggle') {
                v.enabled = !v.enabled;
                await i.update(generateDashboard());
            }

            if (i.isButton() && i.customId === 'sv_edit_text') {
                const modal = new ModalBuilder().setCustomId('sv_modal_text').setTitle('Konfigurasi Teks Vanity');
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v_text').setLabel('Teks Vanity (Misal: /vermilion)').setStyle(TextInputStyle.Short).setValue(v.text || '').setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('v_msg').setLabel('Pesan Log (Gunakan {user.mention} dsb)').setStyle(TextInputStyle.Paragraph).setValue(v.message || 'Terima kasih {user.mention} karena telah mendukung {server.name}!').setRequired(true))
                );
                
                await i.showModal(modal);

                try {
                    const submitted = await i.awaitModalSubmit({ time: 120000, filter: m => m.user.id === interaction.user.id && m.customId === 'sv_modal_text' });
                    v.text = submitted.fields.getTextInputValue('v_text');
                    v.message = submitted.fields.getTextInputValue('v_msg');
                    await submitted.update(generateDashboard());
                } catch (e) {}
            }

            if (i.isButton() && i.customId === 'sv_save') {
                settings.vanityRoles = v;
                db.settings = settings;
                db.changed('settings', true);
                await db.save();
                
                collector.stop();
                await i.update({ content: '✅ **Pengaturan Vanity Roles berhasil disimpan!**', embeds: [], components: [] });
            }
        });
    }
};