const { Events } = require('discord.js');
const botActivity = require('../config/bot-activity');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);

		// Initialize the music manager
		client.musicManager.initialize();

		// Set the bot's presence
		const activities = botActivity.status.rotateDefault;
		if (activities.length > 0) {
			let currentIndex = 0;
			setInterval(() => {
				const activity = activities[currentIndex];
				client.user.setActivity(activity.name, { type: activity.type, url: activity.url });
				currentIndex = (currentIndex + 1) % activities.length;
			}, 15000); // Rotate every 15 seconds
			console.log('[PRESENCE] Bot activity rotator has been set.');
		} else {
			console.log('[PRESENCE] No activities found to set.');
		}
	},
};
