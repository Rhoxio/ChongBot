const config = require('../config/config');

/**
 * Role management functions for verification and community roles
 */

/**
 * Assigns a community role to a member based on their selection
 * Removes any existing community roles first to prevent conflicts
 * @param {GuildMember} member - The Discord guild member
 * @param {string} roleChoice - The selected role ('pug', 'prospect', or 'guildie')
 * @returns {Promise<string>} The name of the assigned role
 */
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
  
  // Remove unverified role first (since they're now getting a community role)
  const unverifiedRole = member.guild.roles.cache.get(config.unverifiedRoleId);
  if (unverifiedRole && member.roles.cache.has(config.unverifiedRoleId)) {
    await member.roles.remove(unverifiedRole);
    console.log(`🔓 Removed unverified role from ${member.user.tag}`);
  }
  
  // Remove other community roles
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


/**
 * Assigns the unverified role to a new member
 * @param {GuildMember} member - The Discord guild member
 */
async function assignUnverifiedRole(member) {
  const unverifiedRole = member.guild.roles.cache.get(config.unverifiedRoleId);

  if (unverifiedRole && !member.roles.cache.has(config.unverifiedRoleId)) {
    await member.roles.add(unverifiedRole);
    console.log(`🔒 Added unverified role to ${member.user.tag}`);
  }
}

/**
 * Transfers the Raider of the Week role to a new member
 * Removes the role from current holder and assigns to new member
 * @param {GuildMember} newMember - The Discord guild member to receive RotW role
 * @param {Guild} guild - The Discord guild
 * @returns {Promise<{previousHolder: string|null, newHolder: string}>} Transfer details
 */
async function transferRotwRole(newMember, guild) {
  const rotwRole = guild.roles.cache.get(config.rotwRoleId);

  if (!rotwRole) {
    throw new Error(`RotW role not found (ID: ${config.rotwRoleId})`);
  }

  // Find current RotW holder
  let previousHolder = null;
  const currentHolder = rotwRole.members.first();

  if (currentHolder) {
    previousHolder = currentHolder.user.tag;
    await currentHolder.roles.remove(rotwRole);
    console.log(`👑 Removed RotW role from ${currentHolder.user.tag}`);
  }

  // Assign RotW role to new member
  if (!newMember.roles.cache.has(config.rotwRoleId)) {
    await newMember.roles.add(rotwRole);
    console.log(`🏆 Added RotW role to ${newMember.user.tag}`);
  }

  return {
    previousHolder,
    newHolder: newMember.user.tag
  };
}

module.exports = {
  assignCommunityRole,
  assignUnverifiedRole,
  transferRotwRole
};
