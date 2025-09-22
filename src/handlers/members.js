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
    // Cache all members and ensure they have proper roles
    const members = await guild.members.fetch();
    const unverifiedRole = guild.roles.cache.get(config.unverifiedRoleId);
    let assignedRoles = 0;
    
    for (const [memberId, member] of members) {
      if (!member.user.bot) {
        // Cache username
        originalUsernames.set(member.id, member.user.username);
        
        // Check if member needs unverified role
        const hasUnverified = member.roles.cache.has(config.unverifiedRoleId);
        const hasCommunityRole = [config.pugRoleId, config.prospectRoleId, config.guildieRoleId]
          .some(roleId => roleId && member.roles.cache.has(roleId));
        
        // If they have no verification-related roles, assign unverified
        if (!hasUnverified && !hasCommunityRole) {
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
