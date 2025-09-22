const { Events } = require('discord.js');
const config = require('../config/config');
const { assignUnverifiedRole } = require('../core/roles');

/**
 * Member event handlers for join and update events
 */

// Store original usernames for reference
const originalUsernames = new Map();

/**
 * Handles new member joins - assigns unverified role and caches username
 * @param {GuildMember} member - The new member who joined
 */
async function handleMemberJoin(member) {
  try {
    console.log(`👋 New member joined: ${member.user.tag}`);
    
    // Store their original username
    originalUsernames.set(member.id, member.user.username);
    
    // Add unverified role using the roles module
    await assignUnverifiedRole(member);
    
    // No separate welcome message - users will see the persistent verification message
    
  } catch (error) {
    console.error(`❌ Error handling new member ${member.user.tag}:`, error);
  }
}

/**
 * Handles member updates (including nickname changes)
 * @param {GuildMember} oldMember - The member before the update
 * @param {GuildMember} newMember - The member after the update
 */
async function handleMemberUpdate(oldMember, newMember) {
  try {
    // Skip if this is a bot
    if (newMember.user.bot) return;
    
    // Check if nickname changed
    const oldNickname = oldMember.nickname;
    const newNickname = newMember.nickname;
    const originalUsername = originalUsernames.get(newMember.id);
    
    // Note: Nickname changes are now handled through the verification flow
    // No need to log here as it's already logged in the modal submission handler
    
  } catch (error) {
    console.error(`❌ Error handling member update for ${newMember.user.tag}:`, error);
  }
}

/**
 * Initializes member roles during bot startup
 * Ensures all existing members have either verified or unverified roles
 * @param {Guild} guild - The Discord guild
 * @param {Collection} roles - Guild roles cache
 */
async function initializeMemberRoles(guild) {
  try {
    console.log(`🔍 Starting member role initialization for guild: ${guild.name}`);
    
    // Log configuration values
    console.log(`📋 Configuration check:`);
    console.log(`   UNVERIFIED_ROLE_ID: ${config.unverifiedRoleId}`);
    console.log(`   PUG_ROLE_ID: ${config.pugRoleId}`);
    console.log(`   PROSPECT_ROLE_ID: ${config.prospectRoleId}`);
    console.log(`   GUILDIE_ROLE_ID: ${config.guildieRoleId}`);
    
    // Cache all members and ensure they have proper roles
    const members = await guild.members.fetch();
    console.log(`👥 Fetched ${members.size} total members`);
    
    const unverifiedRole = guild.roles.cache.get(config.unverifiedRoleId);
    console.log(`🔍 Unverified role lookup result: ${unverifiedRole ? `Found "${unverifiedRole.name}"` : 'NOT FOUND'}`);
    
    // Log all available roles for debugging
    console.log(`📝 Available roles in guild:`);
    guild.roles.cache.forEach(role => {
      console.log(`   - ${role.name} (ID: ${role.id})`);
    });
    
    let assignedRoles = 0;
    
    for (const [memberId, member] of members) {
      if (!member.user.bot) {
        // Cache username
        originalUsernames.set(member.id, member.user.username);
        
        // Check if member needs unverified role
        const hasUnverified = member.roles.cache.has(config.unverifiedRoleId);
        const hasCommunityRole = [config.pugRoleId, config.prospectRoleId, config.guildieRoleId]
          .some(roleId => roleId && member.roles.cache.has(roleId));
        
        console.log(`👤 Checking ${member.user.tag}:`);
        console.log(`   Has unverified role: ${hasUnverified}`);
        console.log(`   Has community role: ${hasCommunityRole}`);
        console.log(`   Current roles: ${member.roles.cache.map(r => r.name).join(', ')}`);
        
        // If they have no verification-related roles, assign unverified
        if (!hasUnverified && !hasCommunityRole) {
          console.log(`   → Needs unverified role assignment`);
          
          if (!unverifiedRole) {
            console.error(`❌ Cannot assign unverified role - role object is null/undefined`);
            console.error(`   Expected role ID: ${config.unverifiedRoleId}`);
            continue;
          }
          
          console.log(`   → Attempting to assign "${unverifiedRole.name}" role...`);
          try {
            await member.roles.add(unverifiedRole);
            assignedRoles++;
            console.log(`✅ Successfully assigned unverified role to ${member.user.tag}`);
          } catch (error) {
            console.error(`❌ Could not assign role to ${member.user.tag}:`, error);
            console.error(`   Role object:`, unverifiedRole);
            console.error(`   Role ID:`, config.unverifiedRoleId);
          }
        } else {
          console.log(`   → Already has appropriate roles, skipping`);
        }
      }
    }
    
    console.log(`📋 Cached ${originalUsernames.size} member usernames`);
    if (assignedRoles > 0) {
      console.log(`🔧 Auto-assigned unverified role to ${assignedRoles} members`);
    }
    
    return assignedRoles;
  } catch (error) {
    console.error('❌ Error initializing member roles:', error);
    return 0;
  }
}

/**
 * Gets the original username for a member
 * @param {string} memberId - The member's Discord ID
 * @returns {string|undefined} The original username or undefined if not cached
 */
function getOriginalUsername(memberId) {
  return originalUsernames.get(memberId);
}

/**
 * Sets up event listeners for member events
 * @param {Client} client - The Discord client
 */
function setupMemberEventListeners(client) {
  // Handle new member joins
  client.on(Events.GuildMemberAdd, handleMemberJoin);
  
  // Handle member updates (including nickname changes)
  client.on(Events.GuildMemberUpdate, handleMemberUpdate);
}

module.exports = {
  handleMemberJoin,
  handleMemberUpdate,
  initializeMemberRoles,
  getOriginalUsername,
  setupMemberEventListeners,
  originalUsernames // Export for backward compatibility if needed
};
