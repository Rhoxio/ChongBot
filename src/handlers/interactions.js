const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const config = require('../config/config');
const { assignCommunityRole } = require('../core/roles');

/**
 * Handles all Discord interaction events (buttons, modals, select menus)
 */

/**
 * Handles button interactions
 * @param {Interaction} interaction - The Discord interaction
 */
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

/**
 * Handles modal form submissions
 * @param {Interaction} interaction - The Discord interaction
 */
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
      console.log(`📝 ${interaction.user.tag} set nickname to: ${nickname} (verification pending role selection)`);

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
            .setDescription('Pick-up group member for one-off raids')
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

/**
 * Handles select menu interactions
 * @param {Interaction} interaction - The Discord interaction
 */
async function handleSelectMenuInteraction(interaction) {
  if (interaction.customId === 'role_selection') {
    const roleChoice = interaction.values[0]; // Get the selected value
    
    try {
      // Remove unverified role and assign community role based on selection
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

      // Send auto logs message to configured channel
      await sendAutoLogsMessage(interaction.member, assignedRole);

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

/**
 * Sends an auto logs message to the configured channel when someone completes verification
 * @param {GuildMember} member - The member who completed verification
 * @param {string} assignedRole - The role that was assigned
 */
async function sendAutoLogsMessage(member, assignedRole) {
  if (!config.autoLogsChannelId) {
    console.log('ℹ️ Auto logs channel not configured, skipping auto logs message');
    return;
  }

  try {
    const autoLogsChannel = member.guild.channels.cache.get(config.autoLogsChannelId);
    
    if (!autoLogsChannel) {
      console.error(`❌ Auto logs channel not found (ID: ${config.autoLogsChannelId})`);
      return;
    }

    // Clean the character name for URL safety (same logic as /logs command)
    let characterName = member.displayName;
    const originalName = characterName;
    characterName = characterName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

    if (!characterName) {
      console.error(`❌ Could not create valid character name from "${originalName}" for auto logs`);
      return;
    }

    // Generate the Warcraft Logs URL
    const logsUrl = `https://classic.warcraftlogs.com/character/us/pagle/${characterName}`;

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle(`🎉 New Member Verified - ${member.displayName}`)
      .setDescription(`[📊 View ${characterName}'s logs on Pagle](${logsUrl})`)
      .addFields(
        { name: 'Discord User', value: member.user.tag, inline: true },
        { name: 'In-Game Name', value: member.displayName, inline: true },
        { name: 'Community Role', value: assignedRole, inline: true },
        { name: 'Server', value: 'Pagle (US)', inline: true },
        { name: 'Expansion', value: 'Mists of Pandaria Classic', inline: true }
      )
      .setThumbnail(member.user.displayAvatarURL())
      .setFooter({ text: 'Auto-generated from verification completion' })
      .setTimestamp();

    await autoLogsChannel.send({ embeds: [embed] });
    console.log(`📊 Sent auto logs message for ${member.user.tag} (${characterName}) to #${autoLogsChannel.name}`);

  } catch (error) {
    console.error(`❌ Error sending auto logs message for ${member.user.tag}:`, error);
  }
}

module.exports = {
  handleButtonInteraction,
  handleModalSubmit,
  handleSelectMenuInteraction
};
