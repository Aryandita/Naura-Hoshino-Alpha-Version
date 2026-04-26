const INTEREST_RATE = 0.01; // 1% daily interest
const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Calculates and applies compound interest to a user's bank balance
 * for each full day that has passed since the last calculation.
 * This is a "lazy" calculation, meant to be called when a user's profile is loaded.
 * @param {object} userProfile - The Mongoose user profile object.
 * @returns {Promise<{profile: object, interestEarned: number}>} - The updated profile and the total interest earned.
 */
async function calculateInterest(userProfile) {
    const now = Date.now();
    let lastInterest = userProfile.economy.lastInterest?.getTime();

    // If interest has never been calculated, set it to the account creation time or now
    if (!lastInterest) {
        lastInterest = userProfile.createdAt?.getTime() || now;
        userProfile.economy.lastInterest = new Date(lastInterest);
    }
    
    const timeSinceLast = now - lastInterest;

    if (timeSinceLast < ONE_DAY) {
        return { profile: userProfile, interestEarned: 0 };
    }

    const daysToCalculate = Math.floor(timeSinceLast / ONE_DAY);
    let currentBank = userProfile.economy.bank;
    let totalInterestEarned = 0;

    for (let i = 0; i < daysToCalculate; i++) {
        const interestForDay = Math.floor(currentBank * INTEREST_RATE);
        if (interestForDay > 0) {
            currentBank += interestForDay;
            totalInterestEarned += interestForDay;
        }
    }

    userProfile.economy.bank = currentBank;
    // Set the last interest time to the beginning of today to keep it consistent
    const beginningOfToday = new Date();
    beginningOfToday.setHours(0, 0, 0, 0);
    userProfile.economy.lastInterest = new Date(lastInterest + daysToCalculate * ONE_DAY);
    
    // The profile is modified but not saved here. The calling function must save it.
    return { profile: userProfile, interestEarned: totalInterestEarned };
}

module.exports = { calculateInterest };
