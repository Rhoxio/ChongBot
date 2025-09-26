const { EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../config/config');

/**
 * Core verification system components
 * Contains verification logic, embed creation, and button creation for the verification flow
 */

/**
 * Creates the main verification embed shown in the #verify channel
 * @returns {EmbedBuilder} The verification embed
 */
function createVerificationEmbed() {
  return new EmbedBuilder()
    .setColor(0x00FF00)
    .setTitle('🎮 Welcome to Chonglers!')
    .setDescription('**New members:** Complete our quick 3-step verification to access all channels and join the community!')
    .addFields(
      {
        name: '🎯 Why verify?',
        value: 'Setting your Discord name to match your in-game character and selecting your server helps everyone connect your Discord messages to your in-game actions, making communication crystal clear during gameplay!',
        inline: false
      },
      {
        name: '✨ Quick 3-Step Process:',
        value: '**Step 1:** Click the button below and enter your exact in-game character name\n**Step 2:** Choose your server from the dropdown menu\n**Step 3:** Choose your community role from the dropdown menu\n\n🎉 **That\'s it!** Once both dropdowns are selected, you\'ll instantly gain access to all channels and your community role.',
        inline: false
      },
      {
        name: '🌍 Servers Available:',
        value: 'Pagle • Lei Shen • Ra-Den • Nazgrim • Galakras',
        inline: false
      },
      {
        name: '🎭 Community Roles Available:',
        value: '🐶 **Pug** - Pick-up group member for one-off raids\n⚡ **Prospect** - Experienced player looking to join\n🛡️ **Guildie** - Full guild member',
        inline: false
      },
      {
        name: '💡 Pro Tip',
        value: 'Use your **exact in-game character name** and select the correct server - this ensures seamless communication between Discord and the game!',
        inline: false
      },
      {
        name: '🔄 Already verified?',
        value: 'If you need to update your name, server, or re-verify, just click the button again!',
        inline: false
      }
    )
    .setFooter({ text: 'This is a quick 3-step setup that takes just a few seconds!' })
    .setTimestamp();
}

/**
 * Creates the verification button for the embed
 * @returns {ButtonBuilder} The verification button
 */
function createVerificationButton() {
  return new ButtonBuilder()
    .setCustomId('verify_nickname')
    .setLabel('🎮 Complete Verification')
    .setStyle(ButtonStyle.Primary);
}

/**
 * Verifies a user by removing unverified role and adding verified role
 * @param {GuildMember} member - The Discord guild member to verify
 */
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

module.exports = {
  createVerificationEmbed,
  createVerificationButton,
  verifyUser
};
