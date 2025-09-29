/**
 * Raid Helper API integration
 * Handles communication with Raid Helper API for event and signup data
 */

const config = require('../config/config');

// Node.js 18+ has fetch built-in, but for older versions we might need node-fetch
// For now, assume Node 18+ environment or polyfill is available
if (typeof fetch === 'undefined') {
  console.warn('⚠️ fetch is not available - Raid Helper API calls will fail');
}

const RAID_HELPER_BASE_URL = 'https://raid-helper.dev/api';

/**
 * Make a request to the Raid Helper API
 * @param {string} endpoint - API endpoint (without base URL)
 * @param {Object} options - Additional fetch options
 * @returns {Promise<Object>} API response data
 */
async function makeRaidHelperRequest(endpoint, options = {}) {
  const url = `${RAID_HELPER_BASE_URL}${endpoint}`;

  // Validate API key exists
  if (!config.raidHelperApiKey) {
    throw new Error('Raid Helper API key not configured in environment variables');
  }

  const defaultHeaders = {
    'Authorization': config.raidHelperApiKey,
    'Content-Type': 'application/json'
  };

  const requestOptions = {
    method: 'GET',
    headers: { ...defaultHeaders, ...options.headers },
    ...options
  };

  try {
    console.log(`🔗 Making Raid Helper API request to: ${endpoint}`);
    console.log(`🔑 Using API key: ${config.raidHelperApiKey ? config.raidHelperApiKey.substring(0, 10) + '...' : 'NOT SET'}`);
    console.log(`📋 Request headers:`, { ...requestOptions.headers, Authorization: '[REDACTED]' });

    const response = await fetch(url, requestOptions);

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ API Error Response:`, errorText);
      throw new Error(`Raid Helper API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`✅ Raid Helper API request successful - received ${JSON.stringify(data).length} characters`);
    return data;
  } catch (error) {
    console.error(`❌ Raid Helper API request failed:`, error);
    throw error;
  }
}

/**
 * Fetch events from the server for the next specified number of days
 * @param {string} serverId - Discord server ID
 * @param {number} days - Number of days to look ahead (default: 3)
 * @returns {Promise<Array>} Array of upcoming raid events
 */
async function fetchUpcomingRaids(serverId = config.guildId, days = 3) {
  const now = new Date();
  const endDate = new Date();
  endDate.setDate(now.getDate() + days);

  const startTimeFilter = Math.floor(now.getTime() / 1000);
  const endTimeFilter = Math.floor(endDate.getTime() / 1000);

  console.log(`📅 Fetching events from ${now.toISOString()} to ${endDate.toISOString()}`);
  console.log(`📅 Unix filters: ${startTimeFilter} to ${endTimeFilter}`);

  // Build URL with query parameters instead of headers for filters
  const baseEndpoint = `/v3/servers/${serverId}/events`;
  const queryParams = new URLSearchParams({
    StartTimeFilter: startTimeFilter.toString(),
    EndTimeFilter: endTimeFilter.toString(),
    IncludeSignUps: 'true'
  });
  const endpoint = `${baseEndpoint}?${queryParams.toString()}`;

  try {
    const data = await makeRaidHelperRequest(endpoint, {
      method: 'GET'
      // No extra headers needed - filters are in URL params
    });

    // Filter and return only the events array
    let events = data.postedEvents || [];
    console.log(`📅 Found ${events.length} upcoming events in next ${days} days`);

    // Filter out events outside our time range (API seems to ignore time filters)
    const currentTime = Math.floor(Date.now() / 1000);
    const futureLimit = currentTime + (days * 24 * 60 * 60);

    const originalCount = events.length;
    events = events.filter(event => {
      return event.startTime >= currentTime && event.startTime <= futureLimit;
    });
    console.log(`📅 Post-filtered events: ${originalCount} -> ${events.length} (removed ${originalCount - events.length} out-of-range events)`);

    // Sort events by start time (earliest first)
    events = events.sort((a, b) => a.startTime - b.startTime);
    console.log(`📅 Sorted ${events.length} events by start time (earliest first)`);

    // Step 2: Fetch individual event details with signup data using v2 API
    console.log(`🔍 Fetching signup data for ${events.length} events using v2 API...`);
    const eventsWithSignups = [];

    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`📋 Fetching signup data for event ${i + 1}/${events.length}: "${event.title}" (${event.id})`);

      try {
        const eventWithSignups = await fetchEventById(event.id);
        eventsWithSignups.push(eventWithSignups);
        console.log(`✅ Got ${eventWithSignups.signUps ? eventWithSignups.signUps.length : 0} signups for "${event.title}"`);
      } catch (error) {
        console.error(`❌ Failed to fetch signup data for event ${event.id}:`, error.message);
        // Add the original event without signup data as fallback
        eventsWithSignups.push({ ...event, signUps: [] });
      }

      // Small delay to avoid rate limiting
      if (i < events.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }

    // Log sample event structure for debugging
    if (eventsWithSignups.length > 0) {
      const firstEvent = eventsWithSignups[0];
      console.log(`📋 Sample event structure with signup data:`, {
        id: firstEvent.id,
        title: firstEvent.title,
        startTime: firstEvent.startTime,
        startTimeConverted: new Date(firstEvent.startTime * 1000).toISOString(),
        hasSignUps: !!firstEvent.signUps,
        signUpCount: firstEvent.signUps ? firstEvent.signUps.length : 0
      });

      console.log(`📋 First 3 events by start time with signup counts:`);
      eventsWithSignups.slice(0, 3).forEach((event, index) => {
        console.log(`  ${index + 1}. "${event.title}" - ${event.startTime} (${new Date(event.startTime * 1000).toISOString()}) - ${event.signUps ? event.signUps.length : 0} signups`);
      });
    }

    console.log(`✅ Successfully fetched ${eventsWithSignups.length} events with signup data`);
    return eventsWithSignups;
  } catch (error) {
    console.error(`❌ Failed to fetch upcoming raids:`, error);
    throw error;
  }
}

/**
 * Fetch a specific event by ID
 * @param {string} eventId - Raid Helper event ID
 * @returns {Promise<Object>} Event data with signups
 */
async function fetchEventById(eventId) {
  const endpoint = `/v2/events/${eventId}`;
  const data = await makeRaidHelperRequest(endpoint);
  console.log(`📋 Fetched event: ${data.title || 'Unknown'} (${eventId})`);
  return data;
}

/**
 * Get signup information for a specific event
 * @param {string} eventId - Raid Helper event ID
 * @returns {Promise<Array>} Array of signup objects
 */
async function getRaidSignups(eventId) {
  const event = await fetchEventById(eventId);
  const signups = event.signUps || [];
  console.log(`👥 Found ${signups.length} signups for event ${eventId}`);
  return signups;
}

/**
 * Extract Discord user IDs from Raid Helper signups
 * @param {Array} signups - Array of Raid Helper signup objects
 * @returns {Set<string>} Set of Discord user IDs who are signed up
 */
function extractSignedUpUserIds(signups) {
  const userIds = new Set();

  for (const signup of signups) {
    if (signup.userId) {
      userIds.add(signup.userId);
    }
  }

  console.log(`🔍 Extracted ${userIds.size} unique user IDs from signups`);
  return userIds;
}

/**
 * Check if an event is likely a raid based on title/description
 * This is a basic filter - can be enhanced based on actual event patterns
 * @param {Object} event - Raid Helper event object
 * @returns {boolean} True if event appears to be a raid
 */
function isRaidEvent(event) {
  const title = (event.title || '').toLowerCase();
  const description = (event.description || '').toLowerCase();

  // Basic raid keywords - can be customized based on your guild's naming conventions
  const raidKeywords = [
    'raid', 'bwl', 'mc', 'molten core', 'blackwing lair', 'aq40', 'naxx', 'naxxramas',
    'onyxia', 'zg', 'zul\'gurub', 'aq20', 'temple', 'karazhan', 'kara', 'gruul',
    'magtheridon', 'ssc', 'tk', 'hyjal', 'bt', 'sunwell', 'icc', 'icecrown',
    'ulduar', 'toc', 'naxx25', 'naxx10', 'weekly', 'clear',
    // Mists of Pandaria raids
    'msv', 'mogu\'shan', 'vaults', 'hof', 'heart of fear', 'toes', 'terrace', 'endless spring',
    'tot', 'throne of thunder', 'soo', 'siege of orgrimmar'
  ];

  return raidKeywords.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  );
}

/**
 * Filter events to only include raids
 * @param {Array} events - Array of Raid Helper events
 * @returns {Array} Filtered array of raid events
 */
function filterRaidEvents(events) {
  const raidEvents = events.filter(isRaidEvent);
  console.log(`🏆 Filtered to ${raidEvents.length} raid events from ${events.length} total events`);
  return raidEvents;
}

/**
 * Test the Raid Helper API connection with a simple request
 * Uses the public event endpoint which doesn't require server authorization
 * @returns {Promise<Object>} Test results
 */
async function testApiConnection() {
  try {
    console.log('🧪 Testing basic Raid Helper API connectivity...');

    // Use the example event from the documentation (public endpoint, no auth required)
    const testEventId = '998707032230203474';
    const endpoint = `/v2/events/${testEventId}`;

    // Make request without authorization headers for this public endpoint
    const url = `${RAID_HELPER_BASE_URL}${endpoint}`;
    const response = await fetch(url);

    if (!response.ok) {
      // Don't spam logs for expected 404 on example event
      return {
        success: false,
        error: `Example event not found (${response.status}) - this is normal`,
        skipError: true
      };
    }

    const data = await response.json();
    console.log('✅ Basic API connectivity test successful!');

    return {
      success: true,
      eventTitle: data.title,
      eventId: data.id,
      hasSignups: !!(data.signUps && data.signUps.length > 0)
    };

  } catch (error) {
    // Only log if it's not a network/404 issue
    if (!error.message.includes('404') && !error.message.includes('Not Found')) {
      console.error('❌ Basic API connectivity test failed:', error.message);
    }
    return {
      success: false,
      error: error.message,
      skipError: true
    };
  }
}

/**
 * Test the server-specific API with your actual configuration
 * @param {string} serverId - Your Discord server ID
 * @returns {Promise<Object>} Test results
 */
async function testServerApiConnection(serverId = config.guildId) {
  try {
    console.log(`🧪 Testing server-specific API for guild: ${serverId}`);

    if (!config.raidHelperApiKey) {
      throw new Error('RAID_HELPER_API_KEY not set in environment variables');
    }

    // First try a simple request without filters to test basic auth
    console.log('🔍 Testing basic server API access...');
    const simpleEndpoint = `/v3/servers/${serverId}/events`;

    try {
      const simpleData = await makeRaidHelperRequest(simpleEndpoint, {
        method: 'GET'
      });

      console.log('✅ Basic server API access successful');

      // Now try with filters
      console.log('🔍 Testing with time filters...');
      const events = await fetchUpcomingRaids(serverId, 7); // Next 7 days

      return {
        success: true,
        totalEvents: events.length,
        raidEvents: filterRaidEvents(events).length,
        sampleEvent: events.length > 0 ? {
          title: events[0].title,
          startTime: events[0].startTime,
          hasSignups: !!(events[0].signUps && events[0].signUps.length > 0)
        } : null
      };

    } catch (authError) {
      // If basic auth fails, provide specific troubleshooting
      if (authError.message.includes('401') || authError.message.includes('authorization')) {
        throw new Error(`Authentication failed - API key may be invalid or expired. Try refreshing with /apikey command in Discord.`);
      }
      throw authError;
    }

  } catch (error) {
    console.error('❌ Server API test failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  makeRaidHelperRequest,
  fetchUpcomingRaids,
  fetchEventById,
  getRaidSignups,
  extractSignedUpUserIds,
  isRaidEvent,
  filterRaidEvents,
  testApiConnection,
  testServerApiConnection
};