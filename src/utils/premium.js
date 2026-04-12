const isPremium = (data) => {
    if (!data.isPremium) return false;
    if (data.premiumUntil && data.premiumUntil < new Date()) return false;
    return true;
};
module.exports = { isPremium };
