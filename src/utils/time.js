/**
 * Converts milliseconds to a human-readable time string.
 * @param {number} ms - The number of milliseconds.
 * @returns {string} A string like '1d 2h 3m 4s'.
 */
function msToTime(ms) {
    if (ms <= 0) {
        return '0s';
    }

    const seconds = Math.floor((ms / 1000) % 60);
    const minutes = Math.floor((ms / (1000 * 60)) % 60);
    const hours = Math.floor((ms / (1000 * 60 * 60)) % 24);
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));

    let timeString = '';
    if (days > 0) timeString += `${days}d `;
    if (hours > 0) timeString += `${hours}h `;
    if (minutes > 0) timeString += `${minutes}m `;
    if (seconds > 0 || timeString === '') timeString += `${seconds}s`;

    return timeString.trim();
}

module.exports = { msToTime };
