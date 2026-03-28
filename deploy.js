require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const loadedNames = [];
const foldersPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(foldersPath);

console.log('\x1b[36m[🔍 SCANNING]\x1b[0m Mencari file command di dalam folder src/commands...');

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    
    // Pastikan yang dibaca hanya folder
    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            const command = require(filePath);
            if ('data' in command && 'execute' in command) {
                commands.push(command.data.toJSON());
                loadedNames.push(command.data.name);
            } else {
                console.log(`\x1b[33m[⚠️ SKIP]\x1b[0m File ${file} diabaikan karena struktur tidak lengkap.`);
            }
        } catch (error) {
            console.error(`\x1b[31m[❌ ERROR FILE]\x1b[0m Gagal membaca file ${file}:`, error);
        }
    }
}

const rest = new REST().setToken(process.env.TOKEN);

(async () => {
    try {
        console.log(`\x1b[32m[✅ TERBACA]\x1b[0m Berhasil menemukan ${commands.length} command: \x1b[33m${loadedNames.join(', ')}\x1b[0m`);
        console.log(`\x1b[33m[🌍 GLOBAL SYNC]\x1b[0m Memulai pendaftaran command ke seluruh server (Global)...`);

        // Menembakkan command langsung ke rute Global (tanpa Guild ID)
        const data = await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands }
        );

        console.log(`\x1b[32m[✨ SUCCESS]\x1b[0m ${data.length} Command berhasil didaftarkan secara GLOBAL!`);
        console.log(`\x1b[36m[💡 INFO]\x1b[0m Pendaftaran Global kadang memakan waktu beberapa menit untuk muncul di semua server Discord.`);
        
    } catch (error) {
        console.error('\x1b[31m[❌ API ERROR]\x1b[0m Discord menolak sinkronisasi:', error);
    }
})();