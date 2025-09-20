const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const config = require('./config');

const commands = [
  // Verify user manually
  new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Manually verify a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to verify')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Unverify user
  new SlashCommandBuilder()
    .setName('unverify')
    .setDescription('Remove verification from a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to unverify')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Check user status
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Check verification status of a user')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('User to check')
        .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Get server stats
  new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Get verification statistics')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Reset verification message
  new SlashCommandBuilder()
    .setName('reset-verify-message')
    .setDescription('Reset the verification message in the verify channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Test verification flow (admin override)
  new SlashCommandBuilder()
    .setName('test-verification')
    .setDescription('Test the in-game name verification flow by temporarily making yourself unverified')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Force setup verification message (skip permission checks)
  new SlashCommandBuilder()
    .setName('force-setup')
    .setDescription('Force setup verification message (bypasses some permission checks)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Auto-assign unverified roles to members who don't have any verification role
  new SlashCommandBuilder()
    .setName('auto-assign-roles')
    .setDescription('Assign unverified role to all members who have neither verified nor unverified role')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
    
  // Send a random Chongalation quote
  new SlashCommandBuilder()
    .setName('chongalation')
    .setDescription('Share a revered quote from the Chonglers community')
    .addStringOption(option =>
      option.setName('author')
        .setDescription('Get a quote from a specific author (optional)')
        .setRequired(false)),
];

async function handleCommands(interaction) {
  const { commandName } = interaction;
  
  try {
    switch (commandName) {
      case 'verify':
        await handleVerifyCommand(interaction);
        break;
      case 'unverify':
        await handleUnverifyCommand(interaction);
        break;
      case 'status':
        await handleStatusCommand(interaction);
        break;
      case 'stats':
        await handleStatsCommand(interaction);
        break;
      case 'reset-verify-message':
        await handleResetVerifyCommand(interaction);
        break;
      case 'test-verification':
        await handleTestVerificationCommand(interaction);
        break;
      case 'force-setup':
        await handleForceSetupCommand(interaction);
        break;
      case 'auto-assign-roles':
        await handleAutoAssignRolesCommand(interaction);
        break;
      case 'chongalation':
        await handleChongalationCommand(interaction);
        break;
      default:
        await interaction.reply({ content: 'Unknown command!', ephemeral: true });
    }
  } catch (error) {
    console.error(`❌ Error handling command ${commandName}:`, error);
    
    const errorMessage = 'There was an error executing this command!';
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: errorMessage, ephemeral: true });
    } else {
      await interaction.reply({ content: errorMessage, ephemeral: true });
    }
  }
}

async function handleVerifyCommand(interaction) {
  const targetUser = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(targetUser.id);
  
  const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
  const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);
  
  // Check if already verified
  if (!member.roles.cache.has(config.unverifiedRoleId)) {
    await interaction.reply({
      content: `${targetUser.tag} is already verified!`,
      ephemeral: true
    });
    return;
  }
  
  // Remove unverified role and add verified role
  if (unverifiedRole) {
    await member.roles.remove(unverifiedRole);
  }
  
  if (verifiedRole) {
    await member.roles.add(verifiedRole);
  }
  
  const embed = new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('User Manually Verified ✅')
    .setDescription(`${targetUser.tag} has been manually verified by ${interaction.user.tag}`)
    .addFields(
      { name: 'User', value: `${targetUser.tag}`, inline: true },
      { name: 'Verified by', value: `${interaction.user.tag}`, inline: true },
      { name: 'Current Nickname', value: member.nickname || 'None', inline: true },
      { name: 'Community Roles', value: getCommunityRoles(member), inline: true }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  
  console.log(`👤 ${targetUser.tag} manually verified by ${interaction.user.tag}`);
}

async function handleUnverifyCommand(interaction) {
  const targetUser = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(targetUser.id);
  
  const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
  const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);
  
  // Check if already unverified
  if (member.roles.cache.has(config.unverifiedRoleId)) {
    await interaction.reply({
      content: `${targetUser.tag} is already unverified!`,
      ephemeral: true
    });
    return;
  }
  
  // Add unverified role and remove verified role
  if (unverifiedRole) {
    await member.roles.add(unverifiedRole);
  }
  
  if (verifiedRole) {
    await member.roles.remove(verifiedRole);
  }
  
  const embed = new EmbedBuilder()
    .setColor(0xFF0000)
    .setTitle('User Unverified ❌')
    .setDescription(`${targetUser.tag} has been unverified by ${interaction.user.tag}`)
    .addFields(
      { name: 'User', value: `${targetUser.tag}`, inline: true },
      { name: 'Unverified by', value: `${interaction.user.tag}`, inline: true },
      { name: 'Current Nickname', value: member.nickname || 'None', inline: true }
    )
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed] });
  
  console.log(`🔒 ${targetUser.tag} unverified by ${interaction.user.tag}`);
}

async function handleStatusCommand(interaction) {
  const targetUser = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(targetUser.id);
  
  const isVerified = !member.roles.cache.has(config.unverifiedRoleId);
  const hasVerifiedRole = member.roles.cache.has(config.verifiedRoleId);
  
  const embed = new EmbedBuilder()
    .setColor(isVerified ? 0x00FF00 : 0xFF0000)
    .setTitle(`Status for ${targetUser.tag}`)
    .addFields(
      { name: 'Username', value: targetUser.tag, inline: true },
      { name: 'Nickname', value: member.nickname || 'None', inline: true },
      { name: 'Verified', value: isVerified ? 'Yes ✅' : 'No ❌', inline: true },
      { name: 'Has Verified Role', value: hasVerifiedRole ? 'Yes' : 'No', inline: true },
      { name: 'Has Unverified Role', value: member.roles.cache.has(config.unverifiedRoleId) ? 'Yes' : 'No', inline: true },
      { name: 'Community Roles', value: getCommunityRoles(member), inline: true },
      { name: 'Join Date', value: member.joinedAt ? member.joinedAt.toDateString() : 'Unknown', inline: true }
    )
    .setThumbnail(targetUser.displayAvatarURL())
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStatsCommand(interaction) {
  const guild = interaction.guild;
  const members = await guild.members.fetch();
  
  const totalMembers = members.filter(member => !member.user.bot).size;
  const verifiedMembers = members.filter(member => 
    !member.user.bot && !member.roles.cache.has(config.unverifiedRoleId)
  ).size;
  const unverifiedMembers = members.filter(member => 
    !member.user.bot && member.roles.cache.has(config.unverifiedRoleId)
  ).size;
  
  const verificationRate = totalMembers > 0 ? ((verifiedMembers / totalMembers) * 100).toFixed(1) : 0;
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`📊 Server Verification Statistics`)
    .setDescription(`Statistics for ${guild.name}`)
    .addFields(
      { name: 'Total Members', value: totalMembers.toString(), inline: true },
      { name: 'Verified Members', value: `${verifiedMembers} ✅`, inline: true },
      { name: 'Unverified Members', value: `${unverifiedMembers} ❌`, inline: true },
      { name: 'Verification Rate', value: `${verificationRate}%`, inline: true },
      { name: 'Bot Status', value: '🟢 Online', inline: true },
      { name: 'Last Updated', value: new Date().toLocaleString(), inline: true }
    )
    .setThumbnail(guild.iconURL())
    .setTimestamp();
  
  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleResetVerifyCommand(interaction) {
  const config = require('./config');
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
  
  const verifyChannel = interaction.guild.channels.cache.get(config.verifyChannelId);
  
  if (!verifyChannel) {
    await interaction.reply({
      content: '❌ Verify channel not found. Please check your configuration.',
      ephemeral: true
    });
    return;
  }
  
  try {
    // Clear existing messages from the bot
    const messages = await verifyChannel.messages.fetch({ limit: 10 });
    const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);
    if (botMessages.size > 0) {
      await verifyChannel.bulkDelete(botMessages);
    }
    
    // Create new verification message
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
    
    await verifyChannel.send({
      embeds: [embed],
      components: [row]
    });
    
    await interaction.reply({
      content: `✅ Successfully reset verification message in ${verifyChannel}`,
      ephemeral: true
    });
    
    console.log(`🔄 ${interaction.user.tag} reset verification message`);
    
  } catch (error) {
    console.error(`❌ Error resetting verification message:`, error);
    await interaction.reply({
      content: '❌ Error resetting verification message. Please try again.',
      ephemeral: true
    });
  }
}

async function handleTestVerificationCommand(interaction) {
  const config = require('./config');
  
  const member = interaction.member;
  const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
  const verifiedRole = interaction.guild.roles.cache.get(config.verifiedRoleId);
  
  try {
    // Make the admin "unverified" temporarily for testing
    if (unverifiedRole && !member.roles.cache.has(config.unverifiedRoleId)) {
      await member.roles.add(unverifiedRole);
    }
    
    if (verifiedRole && member.roles.cache.has(config.verifiedRoleId)) {
      await member.roles.remove(verifiedRole);
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFFAA00)
      .setTitle('🧪 Test Mode Activated')
      .setDescription('You are now temporarily **unverified** for testing purposes!')
      .addFields(
        { name: '🎯 What to do now:', value: 'Go to the #verify channel and click the "Complete Verification" button to test the enhanced verification flow with role selection.', inline: false },
        { name: '🔄 Reset:', value: 'Use `/verify @yourself` to restore your verified status when done testing.', inline: false }
      )
      .setFooter({ text: 'This is for testing only - you can restore your status anytime' })
      .setTimestamp();
    
    await interaction.reply({ embeds: [embed], ephemeral: true });
    
    console.log(`🧪 ${interaction.user.tag} activated test mode (made themselves unverified)`);
    
  } catch (error) {
    console.error(`❌ Error in test verification command:`, error);
    await interaction.reply({
      content: '❌ Error setting up test mode. Make sure the bot has permission to manage roles.',
      ephemeral: true
    });
  }
}

async function handleForceSetupCommand(interaction) {
  const config = require('./config');
  const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');
  
  const verifyChannel = interaction.guild.channels.cache.get(config.verifyChannelId);
  
  if (!verifyChannel) {
    await interaction.reply({
      content: '❌ Verify channel not found. Please check your configuration.',
      ephemeral: true
    });
    return;
  }
  
  try {
    // Create verification message without trying to delete old ones
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
    
    await verifyChannel.send({
      embeds: [embed],
      components: [row]
    });
    
    await interaction.reply({
      content: `✅ Successfully created verification message in ${verifyChannel} (forced setup)`,
      ephemeral: true
    });
    
    console.log(`🔧 ${interaction.user.tag} used force setup for verification message`);
    
  } catch (error) {
    console.error(`❌ Error in force setup command:`, error);
    await interaction.reply({
      content: `❌ Error creating verification message: ${error.message}`,
      ephemeral: true
    });
  }
}

async function handleAutoAssignRolesCommand(interaction) {
  const config = require('./config');
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const guild = interaction.guild;
    const unverifiedRole = guild.roles.cache.get(config.unverifiedRoleId);
    const verifiedRole = guild.roles.cache.get(config.verifiedRoleId);
    
    if (!unverifiedRole) {
      await interaction.editReply({
        content: '❌ Unverified role not found. Please check your configuration.'
      });
      return;
    }
    
    // Fetch all members
    const members = await guild.members.fetch();
    let assignedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const [memberId, member] of members) {
      if (member.user.bot) continue;
      
      const hasUnverified = member.roles.cache.has(config.unverifiedRoleId);
      const hasVerified = member.roles.cache.has(config.verifiedRoleId);
      
      if (!hasUnverified && !hasVerified) {
        try {
          await member.roles.add(unverifiedRole);
          assignedCount++;
          console.log(`🔒 Auto-assigned unverified role to ${member.user.tag}`);
        } catch (error) {
          console.error(`❌ Could not assign role to ${member.user.tag}:`, error);
          errorCount++;
        }
      } else {
        skippedCount++;
      }
    }
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('🔧 Auto-Role Assignment Complete')
      .addFields(
        { name: '✅ Roles Assigned', value: assignedCount.toString(), inline: true },
        { name: '⏭️ Members Skipped', value: `${skippedCount} (already have roles)`, inline: true },
        { name: '❌ Errors', value: errorCount.toString(), inline: true },
        { name: '📊 Total Members Processed', value: (assignedCount + skippedCount + errorCount).toString(), inline: true }
      )
      .setFooter({ text: 'Members with existing verification roles were skipped' })
      .setTimestamp();
    
    await interaction.editReply({ embeds: [embed] });
    
    console.log(`🔧 Auto-role assignment: ${assignedCount} assigned, ${skippedCount} skipped, ${errorCount} errors`);
    
  } catch (error) {
    console.error(`❌ Error in auto-assign roles command:`, error);
    await interaction.editReply({
      content: `❌ Error during auto-role assignment: ${error.message}`
    });
  }
}

function getCommunityRoles(member) {
  const config = require('./config');
  const roles = [];
  
  if (member.roles.cache.has(config.pugRoleId)) roles.push('Pug');
  if (member.roles.cache.has(config.prospectRoleId)) roles.push('Prospect');
  if (member.roles.cache.has(config.guildieRoleId)) roles.push('Guildie');
  
  return roles.length > 0 ? roles.join(', ') : 'None';
}

async function handleChongalationCommand(interaction) {
  const { getRandomChongalation, getChongalationByAuthor, getAllAuthors } = require('./chongalations');
  
  try {
    const authorFilter = interaction.options.getString('author');
    let chongalation;
    
    if (authorFilter) {
      chongalation = getChongalationByAuthor(authorFilter);
      if (!chongalation) {
        const authors = getAllAuthors();
        await interaction.reply({
          content: `❌ No quotes found for "${authorFilter}". Available authors: ${authors.join(', ')}`,
          ephemeral: true
        });
        return;
      }
    } else {
      chongalation = getRandomChongalation();
    }
    
    const embed = new EmbedBuilder()
      .setColor(0xFFD700) // Gold color for the sacred texts
      .setTitle('📜 Chongalation')
      .setDescription(`*"${chongalation.quote}"*`)
      .addFields({
        name: '📖 Source',
        value: `**${chongalation.author}** - ${chongalation.reference}`,
        inline: false
      })
      .setFooter({ 
        text: 'Chongalations are revered quotes from the Chonglers community, preserved with reverence.' 
      })
      .setTimestamp();
    
    // Add the emoji as a reaction-style element in the description
    embed.setDescription(`*"${chongalation.quote}"*\n\n${chongalation.emoji} 🙏`);
    
    await interaction.reply({ embeds: [embed] });
    
    console.log(`📜 ${interaction.user.tag} shared a Chongalation: "${chongalation.quote}" by ${chongalation.author}`);
    
  } catch (error) {
    console.error(`❌ Error in chongalation command:`, error);
    await interaction.reply({
      content: '❌ Error retrieving Chongalation. The sacred texts are temporarily unavailable.',
      ephemeral: true
    });
  }
}

module.exports = {
  commands,
  handleCommands
};
