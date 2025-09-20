const { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const config = require('./config');
const { handleCommands } = require('./commands');
const express = require('express');

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

// Store original usernames to detect changes
const originalUsernames = new Map();

// Create Express server for health checks (Railway compatibility)
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: client.user ? client.user.tag : 'Not logged in',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: client.isReady() ? 'healthy' : 'unhealthy',
    guilds: client.guilds.cache.size,
    users: client.users.cache.size,
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`🌐 Health check server running on port ${PORT}`);
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
    
    // Cache all members and ensure they have proper roles
    const members = await guild.members.fetch();
    let assignedRoles = 0;
    
    for (const [memberId, member] of members) {
      if (!member.user.bot) {
        // Cache username
        originalUsernames.set(member.id, member.user.username);
        
        // Check if member needs unverified role
        const hasUnverified = member.roles.cache.has(config.unverifiedRoleId);
        const hasVerified = member.roles.cache.has(config.verifiedRoleId);
        
        // If they have neither role, assign unverified
        if (!hasUnverified && !hasVerified) {
          try {
            await member.roles.add(unverifiedRole);
            assignedRoles++;
            console.log(`🔒 Auto-assigned unverified role to ${member.user.tag}`);
          } catch (error) {
            console.error(`❌ Could not assign role to ${member.user.tag}:`, error);
          }
        }
      }
    }
    
    console.log(`📋 Cached ${originalUsernames.size} member usernames`);
    if (assignedRoles > 0) {
      console.log(`🔧 Auto-assigned unverified role to ${assignedRoles} members`);
    }
    console.log(`🚀 Bot is ready with button-based verification!`);
  } catch (error) {
    console.error('❌ Error during startup:', error);
  }
});

// Handle new member joins
client.on(Events.GuildMemberAdd, async (member) => {
  try {
    console.log(`👋 New member joined: ${member.user.tag}`);
    
    // Store their original username
    originalUsernames.set(member.id, member.user.username);
    
    // Add unverified role
    const unverifiedRole = member.guild.roles.cache.get(config.unverifiedRoleId);
    if (unverifiedRole) {
      await member.roles.add(unverifiedRole);
      console.log(`🔒 Added unverified role to ${member.user.tag}`);
    }
    
    // No separate welcome message - users will see the persistent verification message
    
  } catch (error) {
    console.error(`❌ Error handling new member ${member.user.tag}:`, error);
  }
});

// Handle member updates (including nickname changes)
client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
  try {
    // Skip if this is a bot
    if (newMember.user.bot) return;
    
    // Check if nickname changed
    const oldNickname = oldMember.nickname;
    const newNickname = newMember.nickname;
    const originalUsername = originalUsernames.get(newMember.id);
    
    // Check if they changed their nickname to something different from their original username
    if (newNickname && newNickname !== originalUsername) {
      await handleNicknameVerification(newMember);
    }
    
  } catch (error) {
    console.error(`❌ Error handling member update for ${newMember.user.tag}:`, error);
  }
});

// Handle interactions (slash commands, buttons, modals)
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommands(interaction);
    } else if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
    } else if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
    }
  } catch (error) {
    console.error('❌ Error handling interaction:', error);
    
    // Only try to respond if we haven't already responded
    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({ content: 'There was an error processing your request!', ephemeral: true });
      } catch (replyError) {
        console.error('❌ Could not send error reply:', replyError);
      }
    }
  }
});

// Welcome message functionality removed - using consolidated verification message instead

// Set up persistent verification message in verify channel
async function setupVerificationMessage(channel) {
  try {
    // Clear any existing messages from the bot
    const messages = await channel.messages.fetch({ limit: 10 });
    const botMessages = messages.filter(msg => msg.author.id === client.user.id);
    if (botMessages.size > 0) {
      await channel.bulkDelete(botMessages);
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🎮 Welcome to Chonglers!')
      .setDescription('**New members:** To access all channels, you need to set your Discord name to match your in-game name first.')
      .addFields(
        {
          name: '🎯 Why do we need this?',
          value: 'This helps everyone know who they\'re talking to both in Discord and in-game, making communication much clearer during gameplay!',
          inline: false
        },
        {
          name: '✨ How to get verified:',
          value: '1. Click the **"Set My In-Game Name"** button below\n2. Enter your **exact in-game character name**\n3. You\'ll instantly get access to all channels!',
          inline: false
        },
        {
          name: '📝 Important',
          value: 'Use your **exact in-game character name** - this ensures everyone can easily connect your Discord messages to your in-game actions.',
          inline: false
        },
        {
          name: '🔄 Already verified?',
          value: 'If you need to update your name or re-verify, just click the button again!',
          inline: false
        }
      )
      .setFooter({ text: 'This ensures clear communication across all platforms!' })
      .setTimestamp();
    
    const button = new ButtonBuilder()
      .setCustomId('verify_nickname')
      .setLabel('🎮 Set My In-Game Name')
      .setStyle(ButtonStyle.Primary);
    
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

// Handle button interactions
async function handleButtonInteraction(interaction) {
  if (interaction.customId === 'verify_nickname') {
    // Allow server owner to test the modal regardless of roles
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    
    // If owner, skip all role checks and show modal
    if (isOwner) {
      console.log('🧪 Owner testing modal - bypassing role checks');
    } else {
      // Check if user is already verified (only for non-owners)
      if (!interaction.member.roles.cache.has(config.unverifiedRoleId)) {
        await interaction.reply({
          content: '✅ You\'re already verified! You have access to all channels.',
          ephemeral: true
        });
        return;
      }
    }
    
    // Create nickname input modal
    const modal = new ModalBuilder()
      .setCustomId('nickname_modal')
      .setTitle('Set Your In-Game Name');
    
    const nicknameInput = new TextInputBuilder()
      .setCustomId('nickname_input')
      .setLabel('What is your in-game character name?')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(32)
      .setPlaceholder('Enter your exact in-game character name...')
      .setRequired(true);
    
    const actionRow = new ActionRowBuilder().addComponents(nicknameInput);
    modal.addComponents(actionRow);
    
    await interaction.showModal(modal);
  }
}

// Handle modal submissions
async function handleModalSubmit(interaction) {
  if (interaction.customId === 'nickname_modal') {
    const nickname = interaction.fields.getTextInputValue('nickname_input').trim();
    const isOwner = interaction.guild.ownerId === interaction.user.id;
    
    // Validate nickname
    if (nickname.length < 1 || nickname.length > 32) {
      await interaction.reply({
        content: '❌ In-game name must be between 1 and 32 characters long.',
        ephemeral: true
      });
      return;
    }
    
    // Check if nickname is same as username
    if (nickname === interaction.user.username) {
      await interaction.reply({
        content: '❌ Please enter your in-game character name, not your Discord username. This helps us connect your Discord messages to your in-game actions!',
        ephemeral: true
      });
      return;
    }
    
    // Special handling for server owner (testing mode)
    if (isOwner) {
      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🧪 Test Mode - In-Game Name System Works!')
        .setDescription(`Great! The in-game name verification is working perfectly. You entered: **${nickname}**`)
        .addFields(
          { name: '✅ System Test Results:', value: 'The in-game name verification modal is functioning correctly!', inline: false },
          { name: '🎯 For Real Users:', value: 'Regular users would now get their Discord nickname set to their in-game name and be automatically verified.', inline: false },
          { name: '👑 Owner Note:', value: 'As server owner, your roles cannot be modified by bots (Discord security feature).', inline: false }
        )
        .setFooter({ text: 'This is a test response for the server owner' })
        .setTimestamp();
      
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      
      console.log(`🧪 Owner ${interaction.user.tag} tested modal with nickname: ${nickname}`);
      return;
    }
    
    try {
      // Set the nickname
      await interaction.member.setNickname(nickname);
      
      // Verify the user
      await verifyUser(interaction.member);
      
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ In-Game Name Verified!')
        .setDescription(`Welcome to Chonglers, **${nickname}**! Your Discord name now matches your in-game name.`)
        .addFields({
          name: '🎉 You\'re all set!',
          value: 'You now have access to all channels. Everyone will know who you are both in Discord and in-game!',
          inline: false
        }, {
          name: '🎮 Remember',
          value: 'Keep your Discord nickname updated if you change your in-game character name.',
          inline: false
        })
        .setTimestamp();
      
      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      
      console.log(`✅ ${interaction.user.tag} verified with nickname: ${nickname}`);
      
    } catch (error) {
      console.error(`❌ Error setting nickname for ${interaction.user.tag}:`, error);
      
      let errorMessage = '❌ There was an error setting your in-game name. ';
      if (error.code === 50013) {
        errorMessage += 'The bot doesn\'t have permission to change your nickname.';
      } else if (error.code === 50035) {
        errorMessage += 'The in-game name contains invalid characters.';
      } else {
        errorMessage += 'Please try again or contact a moderator.';
      }
      
      await interaction.reply({
        content: errorMessage,
        ephemeral: true
      });
    }
  }
}

// Verify a user (remove unverified role, add verified role)
async function verifyUser(member) {
  const unverifiedRole = member.guild.roles.cache.get(config.unverifiedRoleId);
  const verifiedRole = member.guild.roles.cache.get(config.verifiedRoleId);
  
  if (unverifiedRole && member.roles.cache.has(config.unverifiedRoleId)) {
    await member.roles.remove(unverifiedRole);
    console.log(`🔓 Removed unverified role from ${member.user.tag}`);
  }
  
  if (verifiedRole && !member.roles.cache.has(config.verifiedRoleId)) {
    await member.roles.add(verifiedRole);
    console.log(`✅ Added verified role to ${member.user.tag}`);
  }
}

// Handle nickname verification
async function handleNicknameVerification(member) {
  try {
    const unverifiedRole = member.guild.roles.cache.get(config.unverifiedRoleId);
    const verifiedRole = member.guild.roles.cache.get(config.verifiedRoleId);
    
    // Check if they have the unverified role
    if (!member.roles.cache.has(config.unverifiedRoleId)) {
      console.log(`ℹ️ ${member.user.tag} already verified, skipping`);
      return;
    }
    
    // Remove unverified role and add verified role
    if (unverifiedRole) {
      await member.roles.remove(unverifiedRole);
      console.log(`🔓 Removed unverified role from ${member.user.tag}`);
    }
    
    if (verifiedRole) {
      await member.roles.add(verifiedRole);
      console.log(`✅ Added verified role to ${member.user.tag}`);
    }
    
    // Send confirmation message
    const welcomeChannel = member.guild.channels.cache.get(config.welcomeChannelId);
    if (welcomeChannel) {
      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(config.messages.verified.title)
        .setDescription(config.messages.verified.description)
        .setTimestamp();
      
      await welcomeChannel.send({
        content: `${member}`,
        embeds: [embed]
      });
    }
    
    console.log(`🎉 Successfully verified ${member.user.tag} with nickname: ${member.nickname}`);
    
  } catch (error) {
    console.error(`❌ Error verifying ${member.user.tag}:`, error);
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
client.login(config.token);
