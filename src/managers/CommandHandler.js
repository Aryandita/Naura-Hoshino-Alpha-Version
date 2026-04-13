const { REST, Routes } = require('discord.js');
const fs = require('fs/promises');
const path = require('path');
const env = require('../config/env');

class CommandHandler {
  constructor(client, commandsPath) {
    this.client = client;
    this.commandsPath = commandsPath;
    this.commands = client.commands;
  }

  async load() {
    let commandsArray = [];
    let commandNames = new Set(); 

    try {
      const commandFolders = await fs.readdir(this.commandsPath);

      for (const folder of commandFolders) {
        const folderPath = path.join(this.commandsPath, folder);
        const stat = await fs.stat(folderPath);
        
        if (stat.isDirectory()) {
          const commandFiles = await fs.readdir(folderPath);
          
          for (const file of commandFiles.filter(f => f.endsWith('.js'))) {
            const filePath = path.join(folderPath, file);
            
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
              const cmdName = command.data.name;

              if (commandNames.has(cmdName)) {
                console.log(`\x1b[33m[⚠️ WARNING]\x1b[0m Ada duplikat command bernama "/\x1b[31m${cmdName}\x1b[33m" pada file \x1b[36m${file}\x1b[0m! File ini dilewati.`);
                continue; 
              }

              commandNames.add(cmdName);
              command.category = folder;
              this.commands.set(cmdName, command);
              
              // Tambahan: Mendukung alias jika Anda ingin prefix command punya nama alternatif
              if (command.aliases && Array.isArray(command.aliases)) {
                  command.aliases.forEach(alias => this.commands.set(alias, command));
              }

              commandsArray.push(command.data.toJSON());
            }
          }
        }
      }

      console.log(`\x1b[34m[📂 COMMANDS]\x1b[0m Memuat \x1b[33m${commandsArray.length}\x1b[0m slash command tanpa duplikat.`);

      const rest = new REST({ version: '10' }).setToken(env.TOKEN);
      const clientId = env.CLIENT_ID;
      const guildId = env.GUILD_ID; // Pastikan ini ada di env.js jika ingin test di 1 server

      if (!clientId) return console.log('\x1b[31m[❌ COMMANDS]\x1b[0m CLIENT_ID tidak ada di .env!');

      if (guildId) {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commandsArray });
        console.log(`\x1b[32m[✅ COMMANDS]\x1b[0m Sukses! Command didaftarkan ke server (Guild: \x1b[33m${guildId}\x1b[0m).`);
      } else {
        await rest.put(Routes.applicationCommands(clientId), { body: commandsArray });
        console.log(`\x1b[32m[✅ COMMANDS]\x1b[0m Sukses! Command didaftarkan secara Global.`);
      }
    } catch (error) {
      console.error('\x1b[31m[❌ COMMANDS]\x1b[0m Error memuat command:', error);
    }
  }
}

module.exports = { CommandHandler };
