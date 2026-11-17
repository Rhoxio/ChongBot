const { EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');
const config = require('../config/config');
const { assignCommunityRole } = require('../core/roles');
const { lookupForeverCharacter, splitCharacterName, describeLookupResult } = require('../core/foreverArmory');

// Character names entered in the modal, kept until the member picks a role
const pendingVerifications = new Map();

// Discord nickname limit
const MAX_NICKNAME_LENGTH = 32;

/**
 * Handles all Discord interaction events (buttons, modals, select menus)
 *
 * Verification flow (WoW Forever):
 *   1. Member clicks the button and enters their character's first name and surname
 *   2. Bot sets their nickname to "First Surname" and shows the community role menu
 *   3. Picking a role lets them in right away
 *   4. The armory lookup runs in the background and posts to the auto logs channel.
 *      It never blocks access.
 */

/**
 * Handles button interactions
 * @param {Interaction} interaction - The Discord interaction
 */
async function handleButtonInteraction(interaction) {
  if (interaction.customId === 'verify_nickname') {
    // Allow server owner to test the modal regardless of roles
    const isOwner = interaction.guild.ownerId === interaction.user.id;

    if (isOwner) {
      console.log('🧪 Owner testing modal - bypassing role checks');
    } else if (!interaction.member.roles.cache.has(config.unverifiedRoleId)) {
      await interaction.reply({
        content: '✅ You\'re already verified! You have access to all channels.',
        ephemeral: true
      });
      return;
    }

    const modal = new ModalBuilder()
      .setCustomId('nickname_modal')
      .setTitle('Your WoW Forever Character');

    const firstNameInput = new TextInputBuilder()
      .setCustomId('first_name_input')
      .setLabel('Character first name')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(MAX_NICKNAME_LENGTH)
      .setPlaceholder('e.g. Thrall')
      .setRequired(true);

    const surnameInput = new TextInputBuilder()
      .setCustomId('surname_input')
      .setLabel('Character surname')
      .setStyle(TextInputStyle.Short)
      .setMinLength(1)
      .setMaxLength(MAX_NICKNAME_LENGTH)
      .setPlaceholder('e.g. Doomhammer')
      .setRequired(true);

    modal.addComponents(
      new ActionRowBuilder().addComponents(firstNameInput),
      new ActionRowBuilder().addComponents(surnameInput)
    );

    await interaction.showModal(modal);
  }
}

function createRoleSelectMenu() {
  return new StringSelectMenuBuilder()
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
}

/**
 * Handles modal form submissions
 * @param {Interaction} interaction - The Discord interaction
 */
async function handleModalSubmit(interaction) {
  if (interaction.customId !== 'nickname_modal') return;

  const firstName = interaction.fields.getTextInputValue('first_name_input').trim();
  const surname = interaction.fields.getTextInputValue('surname_input').trim();
  const nickname = `${firstName} ${surname}`;
  const isOwner = interaction.guild.ownerId === interaction.user.id;

  if (!firstName || !surname) {
    await interaction.reply({
      content: '❌ Please enter both your character\'s first name and surname.',
      ephemeral: true
    });
    return;
  }

  if (/\s/.test(firstName)) {
    await interaction.reply({
      content: '❌ Put only your first name in the first box, and your surname in the second.',
      ephemeral: true
    });
    return;
  }

  if (nickname.length > MAX_NICKNAME_LENGTH) {
    await interaction.reply({
      content: `❌ "${nickname}" is longer than Discord's ${MAX_NICKNAME_LENGTH}-character nickname limit. Please contact a moderator.`,
      ephemeral: true
    });
    return;
  }

  try {
    await interaction.member.setNickname(nickname);
    console.log(`📝 ${interaction.user.tag} set nickname to: ${nickname}`);

    // Owner test mode: Discord won't let bots change the owner's roles,
    // so run the armory lookup and show the result instead.
    if (isOwner) {
      await interaction.deferReply({ ephemeral: true });
      const lookup = describeLookupResult(await lookupForeverCharacter(firstName, surname));

      const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🧪 Test Mode - Nickname Set!')
        .setDescription(`Your nickname is now **${nickname}**.\n\n**Armory lookup:** ${lookup.summary}`)
        .addFields(
          ...lookup.fields,
          { name: '🎯 For Real Users:', value: 'They would now pick a community role and get in right away. The lookup above runs in the background and posts to the auto logs channel.', inline: false },
          { name: '👑 Owner Note:', value: 'As server owner, your roles cannot be modified by bots (Discord security feature).', inline: false }
        )
        .setFooter({ text: 'This is a test response for the server owner' })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      console.log(`🧪 Owner ${interaction.user.tag} tested verification - Name: ${nickname}`);
      return;
    }

    pendingVerifications.set(interaction.user.id, { firstName, surname });

    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('✅ Nickname Set!')
      .setDescription(`Great! Your nickname is now **${nickname}**.`)
      .addFields({
        name: '🎭 Last Step: Choose Your Community Role',
        value: 'Pick a role below and you\'ll get access to all channels right away.',
        inline: false
      })
      .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(createRoleSelectMenu())],
      ephemeral: true
    });

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
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      if (replyError.code === 10062) {
        console.log('ℹ️ Cannot reply to expired interaction');
      } else {
        console.error('❌ Could not send error reply:', replyError);
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
    const roleChoice = interaction.values[0];
    await interaction.deferUpdate();
    console.log(`🎭 ${interaction.user.tag} selected role: ${roleChoice}`);
    await completeVerification(interaction, roleChoice);
  }
}

async function completeVerification(interaction, role) {
  const member = interaction.member;

  // Fall back to the nickname if the bot restarted between steps
  const names = pendingVerifications.get(interaction.user.id) || splitCharacterName(member.displayName);
  pendingVerifications.delete(interaction.user.id);

  try {
    const assignedRole = await assignCommunityRole(member, role);

    const embed = new EmbedBuilder()
      .setColor(0x00FF00)
      .setTitle('✅ Verification Complete!')
      .setDescription(`Welcome to Chonglers, **${member.displayName}**! You're all set.`)
      .addFields({
        name: '🎮 Your Details',
        value: `**Character:** ${member.displayName}\n**Community Role:** ${assignedRole}`,
        inline: false
      }, {
        name: '🎉 You\'re in!',
        value: 'You now have access to all channels. Welcome to the guild!',
        inline: false
      }, {
        name: '💡 Tips',
        value: 'Keep your Discord nickname updated if you change characters. Use `/chongalation` for some guild wisdom!',
        inline: false
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed], components: [] });
    console.log(`✅ ${interaction.user.tag} completed verification - Role: ${assignedRole}`);

    // Don't await: the member is already in, the lookup just reports to officers
    runBackgroundLookup(member, assignedRole, names).catch(error => {
      console.error(`❌ Background armory lookup failed for ${interaction.user.tag}:`, error);
    });

  } catch (error) {
    console.error(`❌ Error completing verification for ${interaction.user.tag}:`, error);
    await interaction.editReply({
      content: '❌ There was an error completing your verification. Please try again or contact a moderator.',
      embeds: [],
      components: []
    });
  }
}

/**
 * Looks up a newly verified member on the WoW Forever armory and posts the
 * result to the auto logs channel.
 * @param {GuildMember} member - The member who completed verification
 * @param {string} assignedRole - The role that was assigned
 * @param {{firstName: string, surname: string}|null} names - Character name parts
 */
async function runBackgroundLookup(member, assignedRole, names) {
  const result = names
    ? await lookupForeverCharacter(names.firstName, names.surname)
    : { status: 'error', message: 'No surname in nickname, so no lookup was possible.' };
  const lookup = describeLookupResult(result);

  console.log(`🔎 Armory lookup for ${member.user.tag} (${member.displayName}): ${result.status}`);

  if (!config.autoLogsChannelId) {
    console.log('ℹ️ Auto logs channel not configured, skipping auto logs message');
    return;
  }

  const autoLogsChannel = member.guild.channels.cache.get(config.autoLogsChannelId);
  if (!autoLogsChannel) {
    console.error(`❌ Auto logs channel not found (ID: ${config.autoLogsChannelId})`);
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(lookup.found ? 0x00FF00 : 0xFFA500)
    .setTitle(`🎉 New Member Verified - ${member.displayName}`)
    .setDescription(lookup.summary)
    .addFields(
      { name: 'Discord User', value: member.user.tag, inline: true },
      { name: 'Community Role', value: assignedRole, inline: true },
      { name: 'Game', value: 'WoW Forever', inline: true },
      ...lookup.fields
    )
    .setThumbnail(member.user.displayAvatarURL())
    .setFooter({ text: 'Auto-generated from verification completion' })
    .setTimestamp();

  await autoLogsChannel.send({ embeds: [embed] });
  console.log(`📊 Sent auto logs message for ${member.user.tag} to #${autoLogsChannel.name}`);
}

module.exports = {
  handleButtonInteraction,
  handleModalSubmit,
  handleSelectMenuInteraction
};
