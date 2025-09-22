const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder } = require('discord.js');
const config = require('../config/config');
const { createVerificationEmbed, createVerificationButton } = require('../core/verification');
const { getRandomChongalation, getChongalationByAuthor, getAllAuthors } = require('./chongalations');
const { assignCommunityRole } = require('../core/roles');

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
  
  // Warcraft Logs lookup by Discord user
  new SlashCommandBuilder()
    .setName('logs')
    .setDescription('Get Warcraft Logs link for a character on Pagle')
    .addUserOption(option =>
      option.setName('user')
        .setDescription('Discord user to look up (uses your own name if not provided)')
        .setRequired(false)),
  
  // Warcraft Logs lookup by exact character name
  new SlashCommandBuilder()
    .setName('logsby')
    .setDescription('Get Warcraft Logs link by exact character name (supports special characters)')
    .addStringOption(option =>
      option.setName('character')
        .setDescription('Exact character name (e.g., Ðruið, Mäge, etc.)')
        .setRequired(true)),
];

// Check if user has admin permissions (either Discord admin or allow-listed)
function isUserAdmin(interaction) {
  const userId = interaction.user.id;
  const member = interaction.member;
  
  // Check if user is in the admin allow-list
  if (config.adminUserIds.includes(userId)) {
    return true;
  }
  
  // Check if user has Discord administrator permissions
  if (member && member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }
  
  // Check if user has manage roles permission (fallback for admin commands)
  if (member && member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    return true;
  }
  
  return false;
}

async function handleCommands(interaction) {
  const { commandName } = interaction;
  
  // Define admin-only commands
  const adminCommands = [
    'verify', 'unverify', 'status', 'stats', 
    'reset-verify-message', 'test-verification', 
    'force-setup', 'auto-assign-roles'
  ];
  
  // Check admin permissions for sensitive commands
  if (adminCommands.includes(commandName)) {
    if (!isUserAdmin(interaction)) {
      await interaction.reply({
        content: '❌ You do not have permission to use this command. Only administrators and allow-listed users can run admin commands.',
        ephemeral: true
      });
      return;
    }
  }
  
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
      case 'logs':
        await handleLogsCommand(interaction);
        break;
      case 'logsby':
        await handleLogsByCommand(interaction);
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
  
  // Check if already verified (has any community role)
  const communityRoles = getCommunityRoles(member);
  if (communityRoles !== 'None') {
    await interaction.reply({
      content: `${targetUser.tag} is already verified with community role(s): ${communityRoles}`,
      ephemeral: true
    });
    return;
  }
  
  try {
    // Assign Pug role (which will also remove unverified role)
    const assignedRole = await assignCommunityRole(member, 'pug');
    
    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('User Manually Verified ✅')
      .setDescription(`${targetUser.tag} has been manually verified by ${interaction.user.tag}`)
      .addFields(
        { name: 'User', value: `${targetUser.tag}`, inline: true },
        { name: 'Verified by', value: `${interaction.user.tag}`, inline: true },
        { name: 'Role Assigned', value: assignedRole, inline: true },
        { name: 'Current Nickname', value: member.nickname || 'None', inline: true }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    console.error(`❌ Error verifying ${targetUser.tag}:`, error);
    await interaction.reply({
      content: `❌ Error verifying ${targetUser.tag}. Please check bot permissions and role configuration.`,
      ephemeral: true
    });
  }
}

async function handleUnverifyCommand(interaction) {
  const targetUser = interaction.options.getUser('user');
  const member = await interaction.guild.members.fetch(targetUser.id);
  
  const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
  
  // Check if already unverified (has unverified role and no community roles)
  const communityRoles = getCommunityRoles(member);
  if (member.roles.cache.has(config.unverifiedRoleId) && communityRoles === 'None') {
    await interaction.reply({
      content: `${targetUser.tag} is already unverified!`,
      ephemeral: true
    });
    return;
  }
  
  // Remove all community roles and add unverified role
  const roleMap = {
    'pug': config.pugRoleId,
    'prospect': config.prospectRoleId,
    'guildie': config.guildieRoleId
  };
  
  for (const roleId of Object.values(roleMap)) {
    if (roleId && member.roles.cache.has(roleId)) {
      const roleToRemove = interaction.guild.roles.cache.get(roleId);
      if (roleToRemove) {
        await member.roles.remove(roleToRemove);
      }
    }
  }
  
  if (unverifiedRole && !member.roles.cache.has(config.unverifiedRoleId)) {
    await member.roles.add(unverifiedRole);
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
  
  const communityRoles = getCommunityRoles(member);
  const isVerified = communityRoles !== 'None';
  const hasUnverifiedRole = member.roles.cache.has(config.unverifiedRoleId);
  
  const embed = new EmbedBuilder()
    .setColor(isVerified ? 0x00FF00 : 0xFF0000)
    .setTitle(`Status for ${targetUser.tag}`)
    .addFields(
      { name: 'Username', value: targetUser.tag, inline: true },
      { name: 'Nickname', value: member.nickname || 'None', inline: true },
      { name: 'Verified', value: isVerified ? 'Yes ✅' : 'No ❌', inline: true },
      { name: 'Community Roles', value: communityRoles, inline: true },
      { name: 'Has Unverified Role', value: hasUnverifiedRole ? 'Yes' : 'No', inline: true },
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
  const verifiedMembers = members.filter(member => {
    if (member.user.bot) return false;
    const communityRoles = getCommunityRoles(member);
    return communityRoles !== 'None';
  }).size;
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
  // Config imported at top of file
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
    // Clear existing messages from the bot (with better error handling)
    try {
      const messages = await verifyChannel.messages.fetch({ limit: 10 });
      const botMessages = messages.filter(msg => msg.author.id === interaction.client.user.id);
      if (botMessages.size > 0) {
        await verifyChannel.bulkDelete(botMessages);
      }
    } catch (deleteError) {
      console.log('⚠️ Could not delete old messages (they may already be gone):', deleteError.message);
      // Continue anyway - this isn't critical
    }
    
    // Create new verification message using shared functions
    const embed = createVerificationEmbed();
    const button = createVerificationButton();
    
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
  // Config imported at top of file
  
  const member = interaction.member;
  const unverifiedRole = interaction.guild.roles.cache.get(config.unverifiedRoleId);
  
  try {
    // Remove any community roles and add unverified role for testing
    const roleMap = {
      'pug': config.pugRoleId,
      'prospect': config.prospectRoleId,
      'guildie': config.guildieRoleId
    };
    
    for (const roleId of Object.values(roleMap)) {
      if (roleId && member.roles.cache.has(roleId)) {
        const roleToRemove = interaction.guild.roles.cache.get(roleId);
        if (roleToRemove) {
          await member.roles.remove(roleToRemove);
        }
      }
    }
    
    if (unverifiedRole && !member.roles.cache.has(config.unverifiedRoleId)) {
      await member.roles.add(unverifiedRole);
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
  // Config imported at top of file
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
      .setLabel('🎮 Complete Verification')
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
  // Config imported at top of file
  
  await interaction.deferReply({ ephemeral: true });
  
  try {
    const guild = interaction.guild;
    const unverifiedRole = guild.roles.cache.get(config.unverifiedRoleId);
    
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
      const communityRoles = getCommunityRoles(member);
      const hasAnyVerificationRole = hasUnverified || communityRoles !== 'None';
      
      if (!hasAnyVerificationRole) {
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
  // Config imported at top of file
  const roles = [];
  
  if (member.roles.cache.has(config.pugRoleId)) roles.push('Pug');
  if (member.roles.cache.has(config.prospectRoleId)) roles.push('Prospect');
  if (member.roles.cache.has(config.guildieRoleId)) roles.push('Guildie');
  
  return roles.length > 0 ? roles.join(', ') : 'None';
}

async function handleChongalationCommand(interaction) {
  // Chongalations imported at top of file
  
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

async function handleLogsCommand(interaction) {
  let targetUser = interaction.options.getUser('user');
  let targetMember;
  let nameSource = '';
  
  // Use the mentioned user or default to the command user
  if (targetUser) {
    targetMember = await interaction.guild.members.fetch(targetUser.id);
    nameSource = ` (${targetUser.tag}'s Discord name)`;
  } else {
    targetUser = interaction.user;
    targetMember = interaction.member;
    nameSource = ' (your Discord name)';
  }
  
  // Use their server nickname (display name)
  let characterName = targetMember.displayName;
  const originalName = characterName;
  
  // Clean the character name for URL safety
  characterName = characterName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  
  if (!characterName) {
    await interaction.reply({
      content: `❌ Could not create a valid character name from "${originalName}". The Discord name contains no valid characters.`,
      ephemeral: true
    });
    return;
  }
  
  // Generate the Warcraft Logs URL for Pagle server, Mists of Pandaria
  const logsUrl = `https://classic.warcraftlogs.com/character/us/pagle/${characterName}`;
  
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle(`📊 Warcraft Logs - ${characterName}`)
    .setDescription(`[View ${characterName}'s logs on Pagle](${logsUrl})${nameSource}`)
    .addFields(
      { name: 'Server', value: 'Pagle (US)', inline: true },
      { name: 'Expansion', value: 'Mists of Pandaria Classic', inline: true },
      { name: 'Character', value: characterName, inline: true },
      { name: 'Discord User', value: targetUser.tag, inline: true }
    )
    .setFooter({ text: 'Click the link above to view detailed combat logs' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  
  console.log(`📊 ${interaction.user.tag} requested logs for ${targetUser.tag} (character: ${characterName})`);
}

async function handleLogsByCommand(interaction) {
  const characterName = interaction.options.getString('character').trim();
  
  if (!characterName) {
    await interaction.reply({
      content: '❌ Please provide a character name.',
      ephemeral: true
    });
    return;
  }
  
  // URL encode the character name to handle special characters
  const encodedCharacterName = encodeURIComponent(characterName.toLowerCase());
  
  // Generate the Warcraft Logs URL for Pagle server, Mists of Pandaria
  const logsUrl = `https://classic.warcraftlogs.com/character/us/pagle/${encodedCharacterName}`;
  
  const embed = new EmbedBuilder()
    .setColor(0xFF6B00) // Different color to distinguish from /logs
    .setTitle(`📊 Warcraft Logs - ${characterName}`)
    .setDescription(`[View ${characterName}'s logs on Pagle](${logsUrl})`)
    .addFields(
      { name: 'Server', value: 'Pagle (US)', inline: true },
      { name: 'Expansion', value: 'Mists of Pandaria Classic', inline: true },
      { name: 'Character', value: characterName, inline: true },
      { name: 'Search Type', value: 'Exact Name', inline: true }
    )
    .setFooter({ text: 'Exact character name lookup - supports special characters' })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  
  console.log(`📊 ${interaction.user.tag} requested logs for exact character name: ${characterName}`);
}

module.exports = {
  commands,
  handleCommands
};
