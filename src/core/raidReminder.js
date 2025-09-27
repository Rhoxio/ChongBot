/**
 * Modular raid reminder message system
 * Handles creation and sending of raid signup reminder messages
 */

/**
 * Format a date for display in raid reminders
 * @param {string|Date|number} dateTime - The date/time to format (Unix timestamp or Date)
 * @returns {string} Formatted date string
 */
function formatDate(dateTime) {
  let date;

  // Handle Unix timestamps (seconds) from Raid Helper API
  if (typeof dateTime === 'number' && dateTime < 10000000000) {
    // If timestamp is less than 10 billion, it's likely in seconds, convert to milliseconds
    date = new Date(dateTime * 1000);
  } else {
    date = new Date(dateTime);
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'America/Los_Angeles'
  });
}

/**
 * Format a time for display in raid reminders
 * @param {string|Date|number} dateTime - The date/time to format (Unix timestamp or Date)
 * @returns {string} Formatted time string
 */
function formatTime(dateTime) {
  let date;

  // Handle Unix timestamps (seconds) from Raid Helper API
  if (typeof dateTime === 'number' && dateTime < 10000000000) {
    // If timestamp is less than 10 billion, it's likely in seconds, convert to milliseconds
    date = new Date(dateTime * 1000);
  } else {
    date = new Date(dateTime);
  }

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'America/Los_Angeles',
    timeZoneName: 'short'
  });
}

/**
 * Create a raid signup reminder message
 * @param {Object} raid - The raid event object
 * @param {string|Date} raid.startTime - When the raid starts
 * @param {string} raid.channelId - Discord channel ID for signups
 * @param {string} [raid.title] - Optional raid title
 * @returns {string} Formatted reminder message
 */
function createReminderMessage(raid) {
  const raidDate = formatDate(raid.startTime);
  const raidTime = formatTime(raid.startTime);
  const raidTitle = raid.title ? ` "${raid.title}"` : '';
  const channelLink = raid.channelId ? `<#${raid.channelId}>` : 'Raid Helper (no Discord channel linked)';

  return `Hey! Don't forget to sign up for the raid${raidTitle} on ${raidDate} at ${raidTime}.

You can sign up here: ${channelLink}`;
}

/**
 * Send a raid reminder DM to a Discord member
 * @param {Object} member - Discord guild member object
 * @param {Object} raid - The raid event object
 * @returns {Object} Result object with success status and details
 */
async function sendRaidReminder(member, raid) {
  const message = createReminderMessage(raid);

  try {
    await member.send(message);
    return {
      success: true,
      member: member.user.tag,
      userId: member.user.id
    };
  } catch (error) {
    return {
      success: false,
      member: member.user.tag,
      userId: member.user.id,
      error: error.message
    };
  }
}

/**
 * Send raid reminders to multiple members
 * @param {Array} members - Array of Discord guild member objects
 * @param {Object} raid - The raid event object
 * @returns {Object} Results summary with success/failure counts and details
 */
async function sendRaidReminders(members, raid) {
  const results = {
    total: members.length,
    successful: 0,
    failed: 0,
    details: []
  };

  for (const member of members) {
    const result = await sendRaidReminder(member, raid);
    results.details.push(result);

    if (result.success) {
      results.successful++;
    } else {
      results.failed++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}

/**
 * Create a consolidated reminder message for multiple raids
 * @param {Array} raids - Array of raid event objects
 * @returns {string} Formatted reminder message for multiple raids
 */
function createConsolidatedReminderMessage(raids) {
  if (raids.length === 1) {
    return createReminderMessage(raids[0]);
  }

  let message = `Hey! Don't forget to sign up for these upcoming raids:\n\n`;

  raids.forEach((raid, index) => {
    const raidDate = formatDate(raid.startTime);
    const raidTime = formatTime(raid.startTime);
    const raidTitle = raid.title ? ` "${raid.title}"` : '';

    message += `**${index + 1}.** ${raidTitle} on ${raidDate} at ${raidTime}\n`;
    message += `   Sign up: <#${raid.channelId}>\n\n`;
  });

  message += `Make sure to sign up for all the raids you plan to attend! 🏆`;

  return message;
}

/**
 * Send a consolidated raid reminder DM for multiple raids
 * @param {Object} member - Discord guild member object
 * @param {Array} raids - Array of raid event objects
 * @returns {Object} Result object with success status and details
 */
async function sendConsolidatedRaidReminder(member, raids) {
  const message = createConsolidatedReminderMessage(raids);

  try {
    await member.send(message);
    return {
      success: true,
      member: member.user.tag,
      userId: member.user.id,
      raidCount: raids.length
    };
  } catch (error) {
    return {
      success: false,
      member: member.user.tag,
      userId: member.user.id,
      raidCount: raids.length,
      error: error.message
    };
  }
}

module.exports = {
  formatDate,
  formatTime,
  createReminderMessage,
  sendRaidReminder,
  sendRaidReminders,
  createConsolidatedReminderMessage,
  sendConsolidatedRaidReminder
};