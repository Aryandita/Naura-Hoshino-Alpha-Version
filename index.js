require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const os = require('os'); 

const { CommandHandler } = require('./src/managers/CommandHandler');
const MusicManager = require('./src/managers/musicManager');
const redisManager = require('./src/managers/redisManager');
const { logError } = require('./src/managers/logger'); 
const RssManager = require('./src/managers/rssManager');
const { connectToDatabase } = require('./src/managers/dbManager'); 
const env = require('./src/config/env'); 

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates, 
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,   
        GatewayIntentBits.GuildMembers,
    ]
});

client.commands = new Collection();
client.musicManager = new MusicManager(client);
client.rssManager = new RssManager(client);

// ==========================================
// 🛡️ 2. SISTEM ANTI-CRASH PROFESIONAL
// ==========================================
const sendErrorLog = async (err, type) => {
    console.error(`\n\x1b[41m\x1b[37m 💥 ANTI-CRASH \x1b[0m \x1b[31m${type}\x1b[0m`);
    console.error(err);
    
    if (env.OWNER_IDS && env.OWNER_IDS.length > 0) {
        try {
            const ownerId = env.OWNER_IDS[0]; 
            const owner = await client.users.fetch(ownerId).catch(() => null);
            
            if (owner) {
                const errEmbed = new EmbedBuilder()
                    .setColor('#00FFFF') 
                    .setTitle(`⚠️ Naura Versi 1.0.0 - ${type}`)
                    .setDescription(`\`\`\`js\n${String(err?.stack || err).substring(0, 4000)}\n\`\`\``)
                    .setTimestamp();
                
                await owner.send({ embeds: [errEmbed] }).catch(() => {});
            }
        } catch (e) {
            console.error('\x1b[41m\x1b[37m 💥 ERROR \x1b[0m \x1b[31mGagal mengirim log error ke DM Developer.\x1b[0m', e);
        }
    }
};

process.on('unhandledRejection', (reason, promise) => {
    if (reason && reason.code === 10062) return; 
    sendErrorLog(reason, 'Unhandled Rejection');
});

process.on('uncaughtException', (err, origin) => {
    sendErrorLog(err, 'Uncaught Exception');
});

// ==========================================
// 📂 3. EVENT HANDLER ROUTER
// ==========================================
const eventsPath = path.join(__dirname, 'src', 'events');
if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(path.join(eventsPath, file));
        if (event.once) client.once(event.name, (...args) => event.execute(...args, client));
        else client.on(event.name, (...args) => event.execute(...args, client));
    }
}

// ==========================================
// 🔄 4. FUNGSI DEPLOY COMMAND
// ==========================================
async function syncCommandsToDiscord() {
    const commandsData = [];
    const foldersPath = path.join(__dirname, 'src', 'commands');
    
    if (fs.existsSync(foldersPath)) {
        for (const folder of fs.readdirSync(foldersPath)) {
            const commandsPath = path.join(foldersPath, folder);
            if (!fs.statSync(commandsPath).isDirectory()) continue;
            for (const file of fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'))) {
                const command = require(path.join(commandsPath, file));
                if ('data' in command && 'execute' in command) commandsData.push(command.data.toJSON());
            }
        }
    }
    const rest = new REST().setToken(env.TOKEN);
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commandsData });
    return commandsData.length;
}

// ==========================================
// 🚀 5. FUNGSI UTAMA (BOOT SEQUENCE)
// ==========================================
async function startBot() {
    console.log('\n\x1b[46m\x1b[30m ⚙️ BOOT SEQUENCE \x1b[0m \x1b[36mMemulai proses inisialisasi sistem...\x1b[0m\n');

    let sysStatus = {
        db:    '\x1b[31m🔴 OFFLINE   \x1b[0m',
        redis: '\x1b[33m🟡 SKIPPED   \x1b[0m',
        music: '\x1b[32m🟢 INITIALIZED\x1b[0m',
        cmds:  '\x1b[33m🟡 BACKGROUND\x1b[0m', 
        rss:   '\x1b[32m🟢 ACTIVE    \x1b[0m'
    };

    try {
        process.stdout.write('\x1b[43m\x1b[30m ⏳ API \x1b[0m \x1b[33mSinkronisasi Slash Commands ke Discord...\x1b[0m ');
        await syncCommandsToDiscord()
            .then(count => console.log(`\x1b[42m\x1b[30m ✨ SUCCESS \x1b[0m \x1b[32m(${count} Commands)\x1b[0m`))
            .catch(err => console.log(`\x1b[41m\x1b[37m 💥 ERROR \x1b[0m \x1b[31m${err.message}\x1b[0m`));

        const commandPath = path.join(__dirname, 'src', 'commands');
        const commandHandler = new CommandHandler(client, commandPath);
        await commandHandler.load();

        try {
            await connectToDatabase();
            sysStatus.db = '\x1b[32m🟢 CONNECTED \x1b[0m';
        } catch (error) {
            sysStatus.db = '\x1b[31m🔴 ERROR     \x1b[0m';
        }

        if (process.env.REDIS_URL) {
            await redisManager.connect();
            sysStatus.redis = '\x1b[32m🟢 CONNECTED \x1b[0m';
        }

        client.once('ready', () => {
            if (client.musicManager.initialize) client.musicManager.initialize();
            if (client.rssManager.init) client.rssManager.init(); 

            const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
            const usedRam = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);
            
            const cpuStr = os.cpus()[0].model.trim().substring(0, 48).padEnd(49);
            const ramStr = `${usedRam} GB / ${totalRam} GB`.padEnd(49);
            const platStr = `${os.platform()} ${os.arch()}`.substring(0, 48).padEnd(49);
            const tagStr = client.user.tag.padEnd(49);
            const ownerStr = 'Developer Aryan / Ryaa'.padEnd(49);
            
            let pingText = `🟢 ONLINE (${client.ws.ping}ms)`;
            if (pingText.length < 18) pingText = pingText.padEnd(18);

            console.log(`
\x1b[38;5;51m╔══════════════════════════════════════════════════════════════════════════╗\x1b[0m
\x1b[38;5;51m║\x1b[0m \x1b[38;5;87m███╗   ██╗ █████╗ ██╗   ██╗██████╗  █████╗ \x1b[0m                          \x1b[38;5;51m║\x1b[0m
\x1b[38;5;45m║\x1b[0m \x1b[38;5;81m████╗  ██║██╔══██╗██║   ██║██╔══██╗██╔══██╗\x1b[0m                          \x1b[38;5;45m║\x1b[0m
\x1b[38;5;39m║\x1b[0m \x1b[38;5;75m██╔██╗ ██║███████║██║   ██║██████╔╝███████║\x1b[0m    \x1b[38;5;255mH O S H I N O\x1b[0m         \x1b[38;5;39m║\x1b[0m
\x1b[38;5;33m║\x1b[0m \x1b[38;5;69m██║╚██╗██║██╔══██║██║   ██║██╔══██╗██╔══██║\x1b[0m    \x1b[38;5;255mv1.0.0 Ultimate\x1b[0m       \x1b[38;5;33m║\x1b[0m
\x1b[38;5;27m║\x1b[0m \x1b[38;5;63m██║ ╚████║██║  ██║╚██████╔╝██║  ██║██║  ██║\x1b[0m                          \x1b[38;5;27m║\x1b[0m
\x1b[38;5;21m║\x1b[0m \x1b[38;5;57m╚═╝  ╚═══╝╚═╝  ╚═╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝\x1b[0m                          \x1b[38;5;21m║\x1b[0m
\x1b[38;5;51m╠══════════════════════════════════════════════════════════════════════════╣\x1b[0m
\x1b[38;5;51m║\x1b[0m \x1b[38;5;226m✦ IDENTITAS SISTEM & HARDWARE\x1b[0m                                            \x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m├─ Nama Bot :\x1b[0m \x1b[38;5;15m${tagStr}\x1b[0m\x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m├─ Master   :\x1b[0m \x1b[38;5;15m${ownerStr}\x1b[0m\x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m├─ Prosesor :\x1b[0m \x1b[38;5;15m${cpuStr}\x1b[0m\x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m├─ Memori   :\x1b[0m \x1b[38;5;15m${ramStr}\x1b[0m\x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m└─ Platform :\x1b[0m \x1b[38;5;15m${platStr}\x1b[0m\x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m                                                                          \x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m \x1b[38;5;226m✦ STATUS MODUL & DATABASE\x1b[0m                                                \x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m├─ Database :\x1b[0m ${sysStatus.db} \x1b[38;5;246m│ Lavalink   :\x1b[0m ${sysStatus.music}      \x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m├─ Redis    :\x1b[0m ${sysStatus.redis} \x1b[38;5;246m│ Commands   :\x1b[0m ${sysStatus.cmds}    \x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m║\x1b[0m   \x1b[38;5;246m└─ Discord  :\x1b[0m \x1b[38;5;82m${pingText}\x1b[0m \x1b[38;5;246m│ RSS Alerts :\x1b[0m ${sysStatus.rss}    \x1b[38;5;51m║\x1b[0m
\x1b[38;5;51m╚══════════════════════════════════════════════════════════════════════════╝\x1b[0m

\x1b[42m\x1b[30m ✨ SUCCESS \x1b[0m \x1b[32mSemua fitur siap Aryan! Naura v1.0.0 siap bertugas ^.^\x1b[0m
`);
            
            try {
                require('./dashboard.js')(client);
            } catch (err) { }
        });

        await client.login(env.TOKEN);

    } catch (error) {
        console.error('\n\x1b[41m\x1b[37m 💥 FATAL ERROR \x1b[0m \x1b[31mTerjadi kesalahan fatal saat booting:\x1b[0m\n', error);
    }
}

startBot();
