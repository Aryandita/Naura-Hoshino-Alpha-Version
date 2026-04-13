const express = require('express');
const os = require('os');

module.exports = (client) => {
    const app = express();
    // Menggunakan port dari environment atau default ke 3000
    const port = process.env.PORT || 3000;

    // ==========================================
    // ⚙️ API ENDPOINT: Mengirim Data Realtime Bot
    // ==========================================
    app.get('/api/stats', (req, res) => {
        const totalRam = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const usedRam = ((os.totalmem() - os.freemem()) / 1024 / 1024 / 1024).toFixed(2);
        
        res.json({
            botName: 'Naura Versi 1.0.0',
            avatar: client.user.displayAvatarURL({ extension: 'png', size: 512 }),
            servers: client.guilds.cache.size,
            users: client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0),
            ping: client.ws.ping,
            uptime: formatUptime(client.uptime),
            ram: `${usedRam} / ${totalRam} GB`,
            developer: 'Developer Aryan'
        });
    });

    // ==========================================
    // 🌐 WEB ROUTE: Halaman Utama Dashboard
    // ==========================================
    app.get('/', (req, res) => {
        res.send(`
        <!DOCTYPE html>
        <html lang="id">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Naura Versi 1.0.0 | Dashboard</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700&family=Outfit:wght@300;500;700&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Outfit', sans-serif;
                    background-color: #0b0c10;
                    background-image: 
                        radial-gradient(at 0% 0%, hsla(330, 80%, 20%, 0.4) 0px, transparent 50%),
                        radial-gradient(at 100% 100%, hsla(250, 80%, 20%, 0.4) 0px, transparent 50%);
                    background-attachment: fixed;
                    color: #ffffff;
                }
                .font-cyber { font-family: 'Orbitron', sans-serif; }
                .glass-card {
                    background: rgba(255, 255, 255, 0.03);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    border: 1px solid rgba(255, 182, 193, 0.15); /* Pink Pastel Border */
                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
                }
                .text-glow { text-shadow: 0 0 10px rgba(255, 182, 193, 0.8); }
                .accent-pink { color: #FFB6C1; }
            </style>
        </head>
        <body class="min-h-screen flex flex-col items-center justify-center p-6">
            
            <header class="w-full max-w-5xl flex items-center justify-between py-6 mb-8 border-b border-pink-300/20">
                <div class="flex items-center gap-4">
                    <img id="botAvatar" src="https://via.placeholder.com/150" alt="Avatar" class="w-16 h-16 rounded-full border-2 border-pink-400 shadow-[0_0_15px_rgba(255,182,193,0.5)]">
                    <div>
                        <h1 class="text-3xl font-cyber font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-300 to-purple-400 text-glow" id="botName">Loading...</h1>
                        <p class="text-gray-400 text-sm tracking-widest uppercase">System Core Status: <span class="text-green-400 font-bold animate-pulse">ONLINE</span></p>
                    </div>
                </div>
                <div class="text-right hidden md:block">
                    <p class="text-sm text-gray-400">Developed by</p>
                    <p class="text-lg font-bold accent-pink" id="devName">Loading...</p>
                </div>
            </header>

            <main class="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                
                <div class="glass-card rounded-2xl p-6 transition transform hover:-translate-y-1 hover:border-pink-400 duration-300">
                    <h3 class="text-gray-400 text-sm uppercase tracking-wider mb-2 font-semibold">Ping / Latency</h3>
                    <p class="text-4xl font-cyber accent-pink"><span id="statPing">0</span><span class="text-lg text-gray-500 ml-1">ms</span></p>
                </div>

                <div class="glass-card rounded-2xl p-6 transition transform hover:-translate-y-1 hover:border-pink-400 duration-300">
                    <h3 class="text-gray-400 text-sm uppercase tracking-wider mb-2 font-semibold">Total Servers</h3>
                    <p class="text-4xl font-cyber accent-pink" id="statServers">0</p>
                </div>

                <div class="glass-card rounded-2xl p-6 transition transform hover:-translate-y-1 hover:border-pink-400 duration-300">
                    <h3 class="text-gray-400 text-sm uppercase tracking-wider mb-2 font-semibold">Total Users</h3>
                    <p class="text-4xl font-cyber accent-pink" id="statUsers">0</p>
                </div>

                <div class="glass-card rounded-2xl p-6 transition transform hover:-translate-y-1 hover:border-pink-400 duration-300">
                    <h3 class="text-gray-400 text-sm uppercase tracking-wider mb-2 font-semibold">System Uptime</h3>
                    <p class="text-2xl font-cyber accent-pink mt-2" id="statUptime">0h 0m</p>
                </div>

            </main>

            <section class="w-full max-w-5xl glass-card rounded-3xl p-8 mb-8">
                <div class="border-b border-pink-300/20 pb-4 mb-6 flex justify-between items-end">
                    <div>
                        <h2 class="text-2xl font-cyber font-bold text-white">Vermilion Server</h2>
                        <p class="text-gray-400 text-sm mt-1">Community Organization Structure</p>
                    </div>
                    <div class="px-4 py-1 bg-pink-500/20 rounded-full border border-pink-500/50 text-pink-300 text-xs font-bold tracking-widest uppercase">
                        Verified Network
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-black/30 p-5 rounded-xl border border-white/5">
                        <h4 class="text-pink-300 font-bold mb-1 text-lg">👑 High Command</h4>
                        <p class="text-gray-300 text-sm">Owner & Developer</p>
                    </div>
                    <div class="bg-black/30 p-5 rounded-xl border border-white/5">
                        <h4 class="text-purple-300 font-bold mb-1 text-lg">🛡️ Supervisor</h4>
                        <p class="text-gray-300 text-sm">Moderation & Security</p>
                    </div>
                    <div class="bg-black/30 p-5 rounded-xl border border-white/5">
                        <h4 class="text-blue-300 font-bold mb-1 text-lg">🛠️ Builder Team</h4>
                        <p class="text-gray-300 text-sm">World Design & Architecture</p>
                    </div>
                    <div class="bg-black/30 p-5 rounded-xl border border-white/5">
                        <h4 class="text-green-300 font-bold mb-1 text-lg">🎥 Media Team</h4>
                        <p class="text-gray-300 text-sm">Content Creation & PR</p>
                    </div>
                </div>
            </section>

            <footer class="text-center text-gray-500 text-sm pb-8 mt-auto">
                <p>&copy; 2026 Naura Hoshino System. Crafted with <span class="text-pink-500">♥</span> for Vermilion.</p>
            </footer>

            <script>
                // Mengambil data dari API Endpoint setiap 5 detik
                async function fetchStats() {
                    try {
                        const res = await fetch('/api/stats');
                        const data = await res.json();
                        
                        document.getElementById('botName').innerText = data.botName;
                        document.getElementById('botAvatar').src = data.avatar;
                        document.getElementById('devName').innerText = data.developer;
                        
                        document.getElementById('statPing').innerText = data.ping;
                        document.getElementById('statServers').innerText = data.servers;
                        document.getElementById('statUsers').innerText = data.users.toLocaleString();
                        document.getElementById('statUptime').innerText = data.uptime;
                    } catch (err) {
                        console.error('Gagal mengambil statistik:', err);
                    }
                }

                fetchStats();
                setInterval(fetchStats, 5000);
            </script>
        </body>
        </html>
        `);
    });

    app.listen(port, () => {
        // FORMAT BARU: Log Web UI (Biru)
        console.log(`\x1b[44m\x1b[37m 🌐 WEB UI \x1b[0m \x1b[34mWeb Dashboard Naura berhasil berjalan di http://localhost:${port}\x1b[0m`);
    });
};

// Fungsi Utilitas untuk memformat Uptime Bot
function formatUptime(ms) {
    let totalSeconds = (ms / 1000);
    let days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    let hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    let minutes = Math.floor(totalSeconds / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}
