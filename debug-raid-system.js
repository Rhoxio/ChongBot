#!/usr/bin/env node

/**
 * Debug script to analyze the raid signup system outside of Discord
 * This will help us see what's happening with role membership and API responses
 */

const { Client, GatewayIntentBits } = require('discord.js');
const config = require('./src/config/config');
const { getRaidEligibleMembers, findMissingSignups } = require('./src/handlers/raidSignupCheck');
const { fetchUpcomingRaids, extractSignedUpUserIds } = require('./src/core/raidHelperApi');

async function debugRaidSystem() {
  console.log('🔍 Starting raid system debug...\n');

  // Create Discord client
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
    ],
  });

  try {
    // Login to Discord
    console.log('🔐 Logging into Discord...');
    await client.login(config.token);
    console.log('✅ Discord login successful\n');

    // Get the guild
    console.log(`🏠 Fetching guild: ${config.guildId}`);
    const guild = await client.guilds.fetch(config.guildId);
    console.log(`✅ Connected to guild: ${guild.name}\n`);

    // Debug 1: Check role configuration and membership
    console.log('='.repeat(60));
    console.log('🎭 ROLE MEMBERSHIP DEBUG');
    console.log('='.repeat(60));

    console.log(`📋 Configuration:`);
    console.log(`   RAIDER_ROLE_ID: ${config.raiderRoleId}`);
    console.log(`   TRIAL_ROLE_ID: ${config.trialRoleId}\n`);

    // Check if roles exist
    const raiderRole = guild.roles.cache.get(config.raiderRoleId);
    const trialRole = guild.roles.cache.get(config.trialRoleId);

    console.log(`🔍 Role Status:`);
    console.log(`   Raider Role: ${raiderRole ? `✅ "${raiderRole.name}" (${raiderRole.members.size} members)` : `❌ Not found`}`);
    console.log(`   Trial Role: ${trialRole ? `✅ "${trialRole.name}" (${trialRole.members.size} members)` : `❌ Not found`}\n`);

    // Show all roles on the server to help identify the correct ones
    console.log(`🔍 All roles on the server (showing roles with members):`);
    guild.roles.cache
      .filter(role => role.members.size > 0 && !role.managed && role.name !== '@everyone')
      .sort((a, b) => b.members.size - a.members.size)
      .forEach(role => {
        console.log(`   - "${role.name}" (ID: ${role.id}) - ${role.members.size} members`);
      });
    console.log('');

    if (raiderRole && raiderRole.members.size > 0) {
      console.log(`👥 Raider Role Members:`);
      raiderRole.members.forEach(member => {
        console.log(`   - ${member.user.tag} (${member.displayName})`);
      });
      console.log('');
    }

    if (trialRole && trialRole.members.size > 0) {
      console.log(`👥 Trial Role Members:`);
      trialRole.members.forEach(member => {
        console.log(`   - ${member.user.tag} (${member.displayName})`);
      });
      console.log('');
    }

    // Get raid-eligible members using the actual function
    console.log('🔍 Getting raid-eligible members using getRaidEligibleMembers()...');
    const raidEligibleMembers = await getRaidEligibleMembers(guild);
    console.log(`📊 Total raid-eligible members found: ${raidEligibleMembers.length}\n`);

    if (raidEligibleMembers.length > 0) {
      console.log(`👥 All Raid-Eligible Members:`);
      raidEligibleMembers.forEach(member => {
        const roles = [];
        if (member.roles.cache.has(config.raiderRoleId)) roles.push('Raider');
        if (member.roles.cache.has(config.trialRoleId)) roles.push('Trial');
        console.log(`   - ${member.user.tag} (${member.displayName}) [${roles.join(', ')}]`);
      });
      console.log('');
    }

    // Debug 2: Check API responses and signup detection
    console.log('='.repeat(60));
    console.log('🔗 API RESPONSE DEBUG');
    console.log('='.repeat(60));

    console.log('📡 Fetching upcoming events from RaidHelper API...');
    const upcomingEvents = await fetchUpcomingRaids();
    console.log(`📅 Found ${upcomingEvents.length} upcoming events\n`);

    // Also test with longer date range to see if we can find events with signup data
    console.log('📡 Fetching events for next 7 days to find events with signups...');
    const longerRangeEvents = await fetchUpcomingRaids(config.guildId, 7);
    console.log(`📅 Found ${longerRangeEvents.length} events in next 7 days`);

    const eventsWithSignups = longerRangeEvents.filter(event => event.signUps && event.signUps.length > 0);
    console.log(`📝 Events with signup data: ${eventsWithSignups.length}\n`);

    if (eventsWithSignups.length > 0) {
      console.log(`🎯 Found events with signups! Analyzing first one...`);
      const eventWithSignups = eventsWithSignups[0];
      console.log(`   Event: "${eventWithSignups.title}"`);
      console.log(`   Signups: ${eventWithSignups.signUps.length}`);
      console.log(`   Sample signup:`, JSON.stringify(eventWithSignups.signUps[0], null, 4));
      console.log('');
    }

    if (upcomingEvents.length > 0) {
      // Show detailed structure of first few events
      const eventsToAnalyze = upcomingEvents.slice(0, 3);

      for (let i = 0; i < eventsToAnalyze.length; i++) {
        const event = eventsToAnalyze[i];
        console.log(`📋 Event ${i + 1}: "${event.title}"`);
        console.log(`   ID: ${event.id}`);
        console.log(`   Start Time: ${event.startTime} (${new Date(event.startTime * 1000).toISOString()})`);
        console.log(`   Channel ID: ${event.channelId || 'Not set'}`);
        console.log(`   Has signUps: ${!!event.signUps}`);
        console.log(`   SignUps type: ${typeof event.signUps}`);
        console.log(`   SignUps length: ${event.signUps ? event.signUps.length : 'N/A'}`);

        if (event.signUps && event.signUps.length > 0) {
          console.log(`   📝 Sample signup structure (first 3):`);
          const samplesToShow = Math.min(3, event.signUps.length);
          for (let j = 0; j < samplesToShow; j++) {
            const signup = event.signUps[j];
            console.log(`     Signup ${j + 1}:`, JSON.stringify(signup, null, 8));
          }

          // Test signup extraction
          console.log(`   🔍 Testing extractSignedUpUserIds()...`);
          const signedUpUserIds = extractSignedUpUserIds(event.signUps);
          console.log(`   📊 Extracted user IDs: ${signedUpUserIds.size} unique users`);
          console.log(`   👥 User IDs:`, Array.from(signedUpUserIds));

          // Test missing signups calculation
          if (raidEligibleMembers.length > 0) {
            const missingSignups = findMissingSignups(raidEligibleMembers, event.signUps);
            console.log(`   ⚠️ Missing signups: ${missingSignups.length} members`);
            if (missingSignups.length > 0) {
              console.log(`   📤 Members who need reminders:`);
              missingSignups.forEach(member => {
                console.log(`     - ${member.user.tag} (${member.displayName})`);
              });
            }
          }
        } else {
          console.log(`   📝 No signups found for this event`);
        }
        console.log('');
      }
    }

    console.log('✅ Debug complete!');

  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await client.destroy();
  }
}

// Run the debug if this file is executed directly
if (require.main === module) {
  debugRaidSystem()
    .then(() => {
      console.log('🏁 Debug script finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Debug script crashed:', error);
      process.exit(1);
    });
}

module.exports = { debugRaidSystem };