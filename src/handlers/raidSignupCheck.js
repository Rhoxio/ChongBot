/**
 * Main raid signup check handler
 * Processes upcoming raids and sends reminders to members who haven't signed up
 */

const config = require('../config/config');
const { fetchUpcomingRaids, filterRaidEvents, extractSignedUpUserIds } = require('../core/raidHelperApi');
const { sendRaidReminders, sendConsolidatedRaidReminder } = require('../core/raidReminder');

/**
 * Get Discord members who are eligible for raids (Raider + Trial roles)
 * @param {Object} guild - Discord guild object
 * @returns {Array} Array of guild members with raid-eligible roles
 */
async function getRaidEligibleMembers(guild) {
  console.log('🔍 Fetching raid-eligible members...');

  const raiderRole = guild.roles.cache.get(config.raiderRoleId);
  const trialRole = guild.roles.cache.get(config.trialRoleId);

  if (!raiderRole || !trialRole) {
    console.error('❌ Could not find raid roles:', {
      raiderRole: raiderRole ? `✅ ${raiderRole.name}` : `❌ ${config.raiderRoleId}`,
      trialRole: trialRole ? `✅ ${trialRole.name}` : `❌ ${config.trialRoleId}`
    });
    return [];
  }

  // Combine members from both roles
  const allRaidMembers = new Map();

  // Add raider role members
  raiderRole.members.forEach(member => {
    allRaidMembers.set(member.id, member);
  });

  // Add trial role members (removes duplicates automatically)
  trialRole.members.forEach(member => {
    allRaidMembers.set(member.id, member);
  });

  const members = Array.from(allRaidMembers.values());
  console.log(`👥 Found ${members.length} raid-eligible members (${raiderRole.members.size} raiders, ${trialRole.members.size} trials)`);

  return members;
}

/**
 * Find members who haven't signed up for a specific raid
 * @param {Array} raidEligibleMembers - All members eligible for raids
 * @param {Array} raidSignups - Current signups for the raid
 * @returns {Array} Members who need to sign up
 */
function findMissingSignups(raidEligibleMembers, raidSignups) {
  const signedUpUserIds = extractSignedUpUserIds(raidSignups);

  const missingMembers = raidEligibleMembers.filter(member =>
    !signedUpUserIds.has(member.id)
  );

  console.log(`📊 Signup status: ${raidSignups.length} signed up, ${missingMembers.length} missing`);
  return missingMembers;
}

/**
 * Process a single raid and send reminders to missing members
 * @param {Object} guild - Discord guild object
 * @param {Object} raid - Raid event object
 * @param {Array} raidEligibleMembers - All members eligible for raids
 * @returns {Object} Results of reminder sending
 */
async function processRaidReminders(guild, raid, raidEligibleMembers) {
  console.log(`🏆 Processing raid: ${raid.title || 'Unknown'} (${raid.id})`);

  try {
    const raidSignups = raid.signUps || [];
    const missingMembers = findMissingSignups(raidEligibleMembers, raidSignups);

    if (missingMembers.length === 0) {
      console.log('✅ All raid-eligible members are signed up!');
      return {
        raid: raid.title || 'Unknown',
        raidId: raid.id,
        totalEligible: raidEligibleMembers.length,
        signedUp: raidSignups.length,
        missing: 0,
        remindersSent: 0,
        errors: 0
      };
    }

    console.log(`📤 Sending reminders to ${missingMembers.length} members...`);
    const results = await sendRaidReminders(missingMembers, raid);

    console.log(`✅ Reminders complete: ${results.successful} sent, ${results.failed} failed`);

    // Log failed DMs for debugging
    if (results.failed > 0) {
      const failedMembers = results.details
        .filter(r => !r.success)
        .map(r => `${r.member} (${r.error})`)
        .join(', ');
      console.log(`❌ Failed DMs: ${failedMembers}`);
    }

    return {
      raid: raid.title || 'Unknown',
      raidId: raid.id,
      totalEligible: raidEligibleMembers.length,
      signedUp: raidSignups.length,
      missing: missingMembers.length,
      remindersSent: results.successful,
      errors: results.failed,
      details: results.details
    };

  } catch (error) {
    console.error(`❌ Error processing raid ${raid.id}:`, error);
    return {
      raid: raid.title || 'Unknown',
      raidId: raid.id,
      error: error.message
    };
  }
}

/**
 * Core business logic for raid signup checking with dependency injection
 * @param {Object} dependencies - Injected dependencies
 * @param {Array} dependencies.events - Array of raid events to process
 * @param {Array} dependencies.eligibleMembers - Array of Discord members eligible for raids
 * @param {Function} dependencies.sendReminder - Function to send reminders (real or mock)
 * @param {boolean} dependencies.dryRun - If true, don't actually send messages
 * @returns {Object} Processing results
 */
async function processRaidSignupCheck(dependencies) {
  const { events, eligibleMembers, sendReminder, dryRun = false } = dependencies;

  console.log(`📅 Processing ${events.length} events for ${eligibleMembers.length} eligible members${dryRun ? ' (DRY RUN)' : ''}`);

  if (events.length === 0) {
    return {
      success: true,
      totalEvents: 0,
      processedEvents: 0,
      totalReminders: 0,
      totalErrors: 0,
      results: []
    };
  }

  if (eligibleMembers.length === 0) {
    console.log('👥 No eligible members found');
    return {
      success: true,
      totalEvents: events.length,
      processedEvents: events.length,
      totalReminders: 0,
      totalErrors: 0,
      results: [],
      error: 'No eligible members found'
    };
  }

  // Build a map of members to their missing raids
  const memberMissingRaids = new Map();

  // Process each event to collect missing signups per member
  for (const event of events) {
    console.log(`📅 Analyzing event: ${event.title || 'Unknown'} (${event.id})`);
    const eventSignups = event.signUps || [];
    const missingMembers = findMissingSignups(eligibleMembers, eventSignups);

    // Add this event to each missing member's list
    for (const member of missingMembers) {
      if (!memberMissingRaids.has(member.id)) {
        memberMissingRaids.set(member.id, {
          member: member,
          raids: []
        });
      }
      memberMissingRaids.get(member.id).raids.push(event);
    }
  }

  console.log(`📊 Found ${memberMissingRaids.size} members who need reminders for ${events.length} total events`);

  if (memberMissingRaids.size === 0) {
    console.log('✅ All eligible members are signed up for all events!');
    return {
      success: true,
      totalEvents: events.length,
      processedEvents: events.length,
      totalReminders: 0,
      totalErrors: 0,
      results: []
    };
  }

  // Send consolidated reminders to each member
  const results = [];
  let totalReminders = 0;
  let totalErrors = 0;

  for (const [memberId, { member, raids }] of memberMissingRaids) {
    console.log(`📤 ${dryRun ? 'Would send' : 'Sending'} consolidated reminder to ${member.user.tag} for ${raids.length} event(s)...`);

    try {
      const result = await sendReminder(member, raids, dryRun);
      results.push(result);

      if (result.success) {
        totalReminders++;
        console.log(`✅ ${dryRun ? 'Would send' : 'Sent'} consolidated reminder to ${member.user.tag} for ${raids.length} events`);
      } else {
        totalErrors++;
        console.error(`❌ Failed to send reminder to ${member.user.tag}: ${result.error}`);
      }

      // Small delay to avoid rate limiting (even in dry run for realistic timing)
      if (!dryRun) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      totalErrors++;
      console.error(`❌ Error sending reminder to ${member.user.tag}:`, error);
      results.push({
        success: false,
        member: member.user.tag,
        userId: member.id,
        raidCount: raids.length,
        error: error.message
      });
    }
  }

  console.log(`🎯 Processing complete: ${events.length} events processed, ${totalReminders} ${dryRun ? 'simulated ' : ''}reminders sent, ${totalErrors} errors`);

  return {
    success: true,
    totalEvents: events.length,
    processedEvents: events.length,
    totalReminders,
    totalErrors,
    results
  };
}

/**
 * Main function to check all upcoming raids and send consolidated reminders
 * @param {Object} client - Discord client object
 * @returns {Object} Summary of all reminder activities
 */
async function performDailyRaidCheck(client) {
  console.log('🚀 Starting daily raid signup check...');

  try {
    const guild = await client.guilds.fetch(config.guildId);
    console.log(`🏠 Connected to guild: ${guild.name}`);

    // Get all upcoming events
    const upcomingEvents = await fetchUpcomingRaids();

    // Get raid-eligible members
    const raidEligibleMembers = await getRaidEligibleMembers(guild);

    // Use dependency injection for the core logic
    const result = await processRaidSignupCheck({
      events: upcomingEvents,
      eligibleMembers: raidEligibleMembers,
      sendReminder: sendConsolidatedRaidReminder,
      dryRun: false
    });

    return {
      ...result,
      raidEvents: result.processedEvents // Maintain backward compatibility
    };

  } catch (error) {
    console.error('❌ Daily raid check failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getRaidEligibleMembers,
  findMissingSignups,
  processRaidReminders,
  performDailyRaidCheck,
  processRaidSignupCheck
};