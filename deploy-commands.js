const { REST, Routes } = require('discord.js');
const config = require('./config');
const { commands } = require('./commands');

const rest = new REST().setToken(config.token);

async function deployCommands() {
  try {
    console.log('🚀 Started refreshing application (/) commands.');

    // Convert SlashCommandBuilder to JSON
    const commandsData = commands.map(command => command.toJSON());

    // Register commands to specific guild (faster than global)
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commandsData },
    );

    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
  }
}

// Run if called directly
if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
