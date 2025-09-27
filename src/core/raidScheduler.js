/**
 * Raid signup reminder scheduler
 * Handles the daily cron job for checking raid signups and sending reminders
 */

const cron = require('node-cron');
const { performDailyRaidCheck } = require('../handlers/raidSignupCheck');

/**
 * Initialize the raid signup reminder scheduler
 * @param {Object} client - Discord client object
 */
function initializeRaidScheduler(client) {
  console.log('⏰ Initializing raid signup reminder scheduler...');

  // Schedule daily check at 4:30 PM PST/PDT
  const cronJob = cron.schedule('30 16 * * *', async () => {
    console.log('🕐 Daily raid signup check triggered at 4:30 PM PST');

    try {
      const results = await performDailyRaidCheck(client);

      if (results.success) {
        console.log('✅ Daily raid check completed successfully');
        console.log(`📊 Summary: ${results.raidEvents} raids, ${results.totalReminders} reminders sent`);
      } else {
        console.error('❌ Daily raid check failed:', results.error);
      }
    } catch (error) {
      console.error('❌ Unexpected error during daily raid check:', error);
    }
  }, {
    scheduled: false, // Don't start immediately
    timezone: 'America/Los_Angeles' // PST/PDT timezone
  });

  // Start the cron job
  cronJob.start();
  console.log('✅ Raid scheduler started - will run daily at 4:30 PM PST/PDT');

  // Return the job for potential management (stop/start)
  return cronJob;
}

/**
 * Get information about the next scheduled run
 * @returns {Object} Information about the next scheduled execution
 */
function getNextScheduledRun() {
  const now = new Date();
  const nextRun = new Date();

  // Set to 4:30 PM today
  nextRun.setHours(16, 30, 0, 0);

  // If it's already past 4:30 PM today, schedule for tomorrow
  if (now >= nextRun) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  // Convert to PST/PDT for display
  const pstTime = nextRun.toLocaleString('en-US', {
    timeZone: 'America/Los_Angeles',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  const hoursUntil = Math.ceil((nextRun - now) / (1000 * 60 * 60));

  return {
    nextRun: nextRun,
    nextRunPST: pstTime,
    hoursUntil: hoursUntil
  };
}

/**
 * Validate that the scheduler environment is properly configured
 * @returns {Object} Validation results
 */
function validateSchedulerConfig() {
  const config = require('../config/config');
  const issues = [];

  // Check required configuration
  if (!config.guildId) {
    issues.push('GUILD_ID not configured');
  }

  if (!config.raidHelperApiKey) {
    issues.push('RAID_HELPER_API_KEY not configured');
  }

  if (!config.raiderRoleId) {
    issues.push('RAIDER_ROLE_ID not configured');
  }

  if (!config.trialRoleId) {
    issues.push('TRIAL_ROLE_ID not configured');
  }

  return {
    valid: issues.length === 0,
    issues: issues
  };
}

/**
 * Test the scheduler configuration without starting the cron job
 * Useful for debugging during bot startup
 * @param {Object} client - Discord client object
 * @returns {Promise<Object>} Test results
 */
async function testSchedulerSetup(client) {
  console.log('🧪 Testing raid scheduler setup...');

  const validation = validateSchedulerConfig();
  if (!validation.valid) {
    return {
      success: false,
      error: 'Configuration issues',
      issues: validation.issues
    };
  }

  try {
    // Test basic connectivity without sending reminders
    const config = require('../config/config');
    const guild = await client.guilds.fetch(config.guildId);
    console.log(`✅ Guild connection test passed: ${guild.name}`);

    const nextRun = getNextScheduledRun();
    console.log(`⏰ Next scheduled run: ${nextRun.nextRunPST}`);

    return {
      success: true,
      guild: guild.name,
      nextRun: nextRun
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initializeRaidScheduler,
  getNextScheduledRun,
  validateSchedulerConfig,
  testSchedulerSetup
};