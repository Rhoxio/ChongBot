const { Client, GatewayIntentBits, Events, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const config = require('./config');
const { handleCommands } = require('./commands');
const { createVerificationEmbed, createVerificationButton } = require('./verification-utils');
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
      // Note: Verification now happens only after role selection in the verification flow
      console.log(`📝 ${newMember.user.tag} set nickname to: ${newNickname} (verification pending role selection)`);
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
    
    // Create nickname modal (step 1 of verification)
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

    const row1 = new ActionRowBuilder().addComponents(nicknameInput);
    modal.addComponents(row1);

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

    try {
      // Set the nickname first
      await interaction.member.setNickname(nickname);

      // Special handling for server owner (testing mode)
      if (isOwner) {
        const embed = new EmbedBuilder()
          .setColor(0x0099FF)
          .setTitle('🧪 Test Mode - Nickname Set!')
          .setDescription(`Great! Your nickname has been set to **${nickname}**.`)
          .addFields(
            { name: '✅ Nickname Test Results:', value: 'The nickname setting is working correctly!', inline: false },
            { name: '🎯 For Real Users:', value: 'Regular users would now see a role selection menu and get verified.', inline: false },
            { name: '👑 Owner Note:', value: 'As server owner, your roles cannot be modified by bots (Discord security feature).', inline: false }
          )
          .setFooter({ text: 'This is a test response for the server owner' })
          .setTimestamp();

        await interaction.reply({
          embeds: [embed],
          ephemeral: true
        });

        console.log(`🧪 Owner ${interaction.user.tag} tested nickname setting - Name: ${nickname}`);
        return;
      }

      // Create role selection menu for regular users
      const roleSelect = new StringSelectMenuBuilder()
        .setCustomId('role_selection')
        .setPlaceholder('Choose your community role...')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions([
          new StringSelectMenuOptionBuilder()
            .setLabel('Pug')
            .setDescription('New to the guild, learning the ropes')
            .setValue('pug')
            .setEmoji('🐶'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Prospect')
            .setDescription('Experienced player looking to join')
            .setValue('prospect')
            .setEmoji('⚡'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Guildie')
            .setDescription('Full guild member')
            .setValue('guildie')
            .setEmoji('🛡️')
        ]);

      const selectRow = new ActionRowBuilder().addComponents(roleSelect);

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('✅ Nickname Set!')
        .setDescription(`Great! Your in-game name has been set to **${nickname}**.`)
        .addFields({
          name: '🎭 Final Step: Choose Your Role',
          value: 'Please select your community role from the dropdown below to complete your verification.',
          inline: false
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        components: [selectRow],
        ephemeral: true
      });

      console.log(`📝 ${interaction.user.tag} set nickname to: ${nickname}, showing role selection`);

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

      try {
        await interaction.reply({
          content: errorMessage,
          ephemeral: true
        });
      } catch (replyError) {
        if (replyError.code === 10062) {
          console.log('ℹ️ Cannot reply to expired interaction, but nickname was set successfully');
        } else {
          console.error('❌ Could not send error reply:', replyError);
        }
      }
    }
  }
}

// Handle select menu interactions
async function handleSelectMenuInteraction(interaction) {
  if (interaction.customId === 'role_selection') {
    const roleChoice = interaction.values[0]; // Get the selected value
    
    try {
      // Verify the user FIRST (remove unverified, add verified)
      await verifyUser(interaction.member);

      // Then assign community role based on selection
      const assignedRole = await assignCommunityRole(interaction.member, roleChoice);

      const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Verification Complete!')
        .setDescription(`Welcome to Chonglers, **${interaction.member.displayName}**! Your verification is complete.`)
        .addFields({
          name: '🎮 Your Details',
          value: `**In-Game Name:** ${interaction.member.displayName}\n**Community Role:** ${assignedRole}`,
          inline: false
        }, {
          name: '🎉 You\'re all set!',
          value: 'You now have access to all channels and your community role. Welcome to the guild!',
          inline: false
        }, {
          name: '💡 Tips',
          value: 'Keep your Discord nickname updated if you change your in-game character name. Use `/chongalation` for some guild wisdom!',
          inline: false
        })
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: [], // Remove the select menu
        ephemeral: true
      });

      console.log(`✅ ${interaction.user.tag} completed verification - Role: ${assignedRole}`);

    } catch (error) {
      console.error(`❌ Error completing verification for ${interaction.user.tag}:`, error);

      await interaction.update({
        content: '❌ There was an error completing your verification. Please try again or contact a moderator.',
        components: [], // Remove the select menu
        ephemeral: true
      });
    }
  }
}

// Assign community role based on user selection
async function assignCommunityRole(member, roleChoice) {
  const roleMap = {
    'pug': { id: config.pugRoleId, name: 'Pug' },
    'prospect': { id: config.prospectRoleId, name: 'Prospect' },
    'guildie': { id: config.guildieRoleId, name: 'Guildie' }
  };
  
  const selectedRole = roleMap[roleChoice.toLowerCase()];
  if (!selectedRole) {
    throw new Error(`Invalid role choice: ${roleChoice}`);
  }
  
  const discordRole = member.guild.roles.cache.get(selectedRole.id);
  if (!discordRole) {
    console.error(`❌ Role not found: ${selectedRole.name} (${selectedRole.id})`);
    return `${selectedRole.name} (role not found)`;
  }
  
  // Remove other community roles first
  const allCommunityRoles = Object.values(roleMap).map(r => r.id).filter(id => id);
  for (const roleId of allCommunityRoles) {
    if (member.roles.cache.has(roleId) && roleId !== selectedRole.id) {
      const roleToRemove = member.guild.roles.cache.get(roleId);
      if (roleToRemove) {
        await member.roles.remove(roleToRemove);
        console.log(`🔄 Removed old community role ${roleToRemove.name} from ${member.user.tag}`);
      }
    }
  }
  
  // Add the selected role
  if (!member.roles.cache.has(selectedRole.id)) {
    await member.roles.add(discordRole);
    console.log(`🎭 Added ${selectedRole.name} role to ${member.user.tag}`);
  }
  
  return selectedRole.name;
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

// NOTE: handleNicknameVerification function removed
// Verification now happens only after both nickname AND role selection are complete
// See handleSelectMenuInteraction function for the proper verification flow

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
