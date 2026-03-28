const fs = require('fs/promises');
const path = require('path');

class EventHandler {
  constructor(client, eventsPath) {
    this.client = client;
    this.eventsPath = eventsPath;
  }

  async load() {
    const eventFiles = await fs.readdir(this.eventsPath);

    for (const file of eventFiles.filter(f => f.endsWith('.js'))) {
      const filePath = path.join(this.eventsPath, file);
      const event = require(filePath); // Mengubah dynamic import menjadi require
      
      if (event.once) {
        this.client.once(event.name, (...args) => event.execute(...args, this.client));
      } else {
        this.client.on(event.name, (...args) => event.execute(...args, this.client));
      }
    }
    console.log(`Loaded events from ${this.eventsPath}`);
  }
}

module.exports = { EventHandler };
