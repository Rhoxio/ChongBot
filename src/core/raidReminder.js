/**
 * Modular raid reminder message system
 * Handles creation and sending of raid signup reminder messages
 */

/**
 * Format a date for display in raid reminders
 * @param {string|Date} dateTime - The date/time to format
 * @returns {string} Formatted date string
 */
function formatDate(dateTime) {
  const date = new Date(dateTime);
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
 * @param {string|Date} dateTime - The date/time to format
 * @returns {string} Formatted time string
 */
function formatTime(dateTime) {
  const date = new Date(dateTime);
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

  return `Hey! Don't forget to sign up for the raid${raidTitle} on ${raidDate} at ${raidTime}.

You can sign up here: <#${raid.channelId}>`;
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

module.exports = {
  formatDate,
  formatTime,
  createReminderMessage,
  sendRaidReminder,
  sendRaidReminders
};