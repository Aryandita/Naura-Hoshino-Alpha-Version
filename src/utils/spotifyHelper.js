const axios = require('axios');

class SpotifyHelper {
    constructor() {
        this.token = null;
        this.tokenExpiresAt = 0;
        this.clientId = null;
    }

    async getAccessToken() {
        if (this.token && Date.now() < this.tokenExpiresAt) {
            return this.token;
        }

        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1'
        };

        const targets = [
            'https://open.spotify.com/embed/track/4cOdK2wGLETKBW3PvgPWqT', // Embed sangat jarang kena 403
            'https://open.spotify.com/'
        ];

        for (const url of targets) {
            try {
                const htmlRes = await axios.get(url, { headers, timeout: 5000 });
                // Ekstrak accessToken langsung dengan regex murni dari body HTML
                const tokenMatch = htmlRes.data.match(/"accessToken":"(.*?)"/);
                const expiryMatch = htmlRes.data.match(/"accessTokenExpirationTimestampMs":(\d+)/);

                if (tokenMatch && tokenMatch[1]) {
                    this.token = tokenMatch[1];
                    this.tokenExpiresAt = expiryMatch ? parseInt(expiryMatch[1]) : (Date.now() + 3500 * 1000);
                    return this.token;
                }
            } catch (e) {
                // Lanjut ke target berikutnya jika gagal (403/Timeout)
            }
        }

        try {
            // Metode Terakhir: API transport web player
            const res = await axios.get('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', { headers: { 'User-Agent': headers['User-Agent'] } });
            if (res.data && res.data.accessToken) {
                this.token = res.data.accessToken;
                this.tokenExpiresAt = res.data.accessTokenExpirationTimestampMs || (Date.now() + 3500 * 1000);
                return this.token;
            }
        } catch (error) {
            console.error('[SPOTIFY HELPER] Gagal mendapatkan token anonim:', error.message);
        }
        return null;
    }

    async getPlaylistTracks(playlistUrl) {
        try {
            const token = await this.getAccessToken();
            if (!token) return null;

            const isAlbum = playlistUrl.includes('/album/');
            const isPlaylist = playlistUrl.includes('/playlist/');
            
            if (!isAlbum && !isPlaylist) return null;
            
            const match = playlistUrl.match(/\/(playlist|album)\/([a-zA-Z0-9]+)/);
            if (!match) return null;
            
            const type = match[1]; // 'playlist' or 'album'
            const id = match[2];

            let allTracks = [];
            let nextUrl = `https://api.spotify.com/v1/${type}s/${id}/tracks?limit=50`;
            let collectionName = `Spotify ${type === 'album' ? 'Album' : 'Playlist'}`;
            let artistName = "";

            // Ambil info nama terlebih dahulu
            const infoRes = await axios.get(`https://api.spotify.com/v1/${type}s/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (infoRes.data) {
                collectionName = infoRes.data.name || collectionName;
                if (type === 'album' && infoRes.data.artists && infoRes.data.artists.length > 0) {
                    artistName = infoRes.data.artists.map(a => a.name).join(', ');
                }
            }

            // Loop untuk mengambil semua lagu
            let isFirstRequest = true;
            while (nextUrl && allTracks.length < 500) { // Batasi maksimal 500 lagu
                if (!isFirstRequest) {
                    // Beri jeda 1 detik tiap kali melompat halaman agar Spotify tidak marah (429 Too Many Requests)
                    await new Promise(r => setTimeout(r, 1000));
                }
                isFirstRequest = false;

                try {
                    const res = await axios.get(nextUrl, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });

                    if (!res.data || !res.data.items) break;

                    const tracks = res.data.items.map(item => {
                        const trackObj = type === 'album' ? item : item.track;
                        if (!trackObj) return null;
                        const title = trackObj.name;
                        const artists = trackObj.artists ? trackObj.artists.map(a => a.name).join(', ') : artistName;
                        return `${title} ${artists}`; 
                    }).filter(t => t !== null);

                    allTracks = allTracks.concat(tracks);
                    nextUrl = res.data.next; // Jika ada halaman selanjutnya
                } catch (loopError) {
                    // Jika ditolak di tengah jalan karena 429 Rate Limit, jangan hancurkan yang sudah ada
                    if (loopError.response && loopError.response.status === 429) {
                        console.log('\x1b[33m[SPOTIFY API]\x1b[0m Terkena Rate Limit (429). Menyimpan trek yang berhasil diambil sejauh ini...');
                        break; 
                    }
                    throw loopError; // Lempar ke catch utama jika error lain
                }
            }

            return {
                name: type === 'album' && artistName ? `${collectionName} - ${artistName}` : collectionName,
                tracks: allTracks,
                url: playlistUrl
            };
        } catch (error) {
            console.error('[SPOTIFY HELPER] Gagal mengambil detail playlist/album:', error.message);
            return null;
        }
    }
}

module.exports = new SpotifyHelper();
