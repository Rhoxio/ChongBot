const { Client, GatewayIntentBits, Events } = require('discord.js');
const config = require('./src/config/config');
const { handleCommands } = require('./src/handlers/commands');
const { createVerificationEmbed, createVerificationButton } = require('./src/core/verification');
const { handleButtonInteraction, handleModalSubmit, handleSelectMenuInteraction } = require('./src/handlers/interactions');
const { setupMemberEventListeners, initializeMemberRoles } = require('./src/handlers/members');
const { createHealthServer } = require('./src/core/server');

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    // Temporarily removing MessageContent and GuildPresences to test
    // GatewayIntentBits.MessageContent,
    // GatewayIntentBits.GuildPresences
  ],
});



// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`✅ Ready! Logged in as ${readyClient.user.tag}`);
  
  try {
    const guild = await client.guilds.fetch(config.guildId);
    console.log(`🏠 Connected to guild: ${guild.name}`);
    
    // Verify roles exist
    const unverifiedRole = guild.roles.cache.get(config.unverifiedRoleId);
    const verifiedRole = guild.roles.cache.get(config.verifiedRoleId);
    const verifyChannel = guild.channels.cache.get(config.verifyChannelId);
    
    console.log(`🔍 Setup Check:`);
    console.log(`   Unverified Role: ${unverifiedRole ? `✅ ${unverifiedRole.name}` : '❌ Not found'}`);
    console.log(`   Verified Role: ${verifiedRole ? `✅ ${verifiedRole.name}` : '❌ Not found'}`);
    console.log(`   Verify Channel: ${verifyChannel ? `✅ #${verifyChannel.name}` : '❌ Not found'}`);
    
    // Send persistent verification message to verify channel
    if (verifyChannel) {
      await setupVerificationMessage(verifyChannel);
    }
    
    // Initialize member roles using the members module
    await initializeMemberRoles(guild);
    console.log(`🚀 Bot is ready with button-based verification!`);
  } catch (error) {
    console.error('❌ Error during startup:', error);
  }
});

// Set up member event listeners
setupMemberEventListeners(client);

// Start health check server
createHealthServer(client);


// Handle interactions (slash commands, buttons, modals)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommands(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    } else if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error);
    
    // Only try to respond if we haven't already responded and interaction isn't expired
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: 'There was an error processing your request!', ephemeral: true });
      } catch (replyError) {
        if (replyError.code === 10062) {
          console.log('ℹ️ Interaction expired, cannot reply');
        } else {
          console.error('❌ Could not send error reply:', replyError);
        }
      }
    }
  }
});

// Welcome message functionality removed - using consolidated verification message instead

// Set up persistent verification message in verify channel
async function setupVerificationMessage(channel) {
  try {
    // Check if verification message already exists
    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessages = messages.filter(msg => 
      msg.author.id === client.user.id && 
      msg.embeds.length > 0 && 
      msg.embeds[0].title && 
      msg.embeds[0].title.includes('Welcome to Chonglers')
    );
    
    // If verification message already exists, don't create a new one
    if (botMessages.size > 0) {
      console.log(`✅ Verification message already exists in #${channel.name}`);
      return;
    }
    
    // Only clear old messages if we're creating a new one
    const allBotMessages = messages.filter(msg => msg.author.id === client.user.id);
    if (allBotMessages.size > 0) {
      try {
        await channel.bulkDelete(allBotMessages);
      } catch (error) {
        // If bulk delete fails, delete individually
        for (const message of allBotMessages.values()) {
          try {
            await message.delete();
          } catch (deleteError) {
            console.log(`Could not delete message: ${deleteError.message}`);
          }
        }
      }
    }
    
    const embed = createVerificationEmbed();
    
    const button = createVerificationButton();
    
    const row = new ActionRowBuilder().addComponents(button);
    
    await channel.send({
      embeds: [embed],
      components: [row]
    });
    
    console.log(`✅ Set up verification message in #${channel.name}`);
    
  } catch (error) {
    console.error(`❌ Error setting up verification message:`, error);
  }
}







// Handle errors
client.on(Events.Error, error => {
  console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
  console.error('❌ Unhandled promise rejection:', error);
});

// Login to Discord with your client's token
// Start the bot
client.login(config.token);
