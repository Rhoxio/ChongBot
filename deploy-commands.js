const { REST, Routes } = require('discord.js');
const config = require('./src/config/config');
const { commands } = require('./src/handlers/commands');

const rest = new REST().setToken(config.token);

async function deployCommands() {
  try {
    console.log('🚀 Started refreshing application (/) commands.');
    console.log(`📋 Configuration:`);
    console.log(`   Client ID: ${config.clientId}`);
    console.log(`   Guild ID: ${config.guildId}`);
    console.log(`   Token: ${config.token ? '✅ Set' : '❌ Missing'}`);

    // Convert SlashCommandBuilder to JSON
    const commandsData = commands.map(command => command.toJSON());
    console.log(`📝 Deploying ${commandsData.length} commands:`);
    commandsData.forEach(cmd => console.log(`   - /${cmd.name}`));

    // Register commands to specific guild (faster than global)
    const route = Routes.applicationGuildCommands(config.clientId, config.guildId);
    console.log(`🎯 Deploying to route: ${route}`);
    
    await rest.put(route, { body: commandsData });

    console.log('✅ Successfully reloaded application (/) commands.');
    console.log('💡 Commands may take 1-5 minutes to appear in Discord.');
    console.log('💡 Try restarting Discord if commands don\'t appear immediately.');
  } catch (error) {
    console.error('❌ Error deploying commands:', error);
    console.error('Error details:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.code === 50001) {
      console.error('🔑 This means the bot is missing access to the guild or the applications.commands scope.');
      console.error('🔗 Make sure you invited the bot with: ...&scope=bot%20applications.commands');
    }
  }
}

// Run if called directly
if (require.main === module) {
  deployCommands();
}

module.exports = { deployCommands };
