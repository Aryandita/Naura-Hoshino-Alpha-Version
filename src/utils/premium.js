const UserProfile = require('../models/UserProfile');

/**
 * Mengecek dan memvalidasi status premium user.
 * Jika premium sudah kadaluarsa, akan otomatis mengubah isPremium menjadi false di database.
 * * @param {string} userId - ID Discord User
 * @returns {Promise<boolean>} True jika masih premium, False jika tidak.
 */
async function checkPremiumStatus(userId) {
    const userProfile = await UserProfile.findByPk(userId);
    
    if (!userProfile) return false;
    if (!userProfile.isPremium) return false;

    // Pengecekan Tanggal Kadaluarsa
    const now = new Date();
    if (userProfile.premiumUntil && userProfile.premiumUntil < now) {
        // Premium sudah habis! Cabut statusnya secara otomatis.
        userProfile.isPremium = false;
        userProfile.premiumUntil = null;
        await userProfile.save();
        return false;
    }

    return true; // Lolos verifikasi, user adalah premium aktif
}

module.exports = { checkPremiumStatus };
