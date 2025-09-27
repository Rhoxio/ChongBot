require('dotenv').config();

module.exports = {
  // Discord Bot Configuration
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  
  // Server Configuration
  guildId: process.env.GUILD_ID,
  verifyChannelId: process.env.VERIFY_CHANNEL_ID,
  generalChannelId: process.env.GENERAL_CHANNEL_ID,
  autoLogsChannelId: process.env.AUTO_LOGS_CHANNEL_ID,
  
  // Role Configuration
  unverifiedRoleId: process.env.UNVERIFIED_ROLE_ID,
  verifiedRoleId: process.env.VERIFIED_ROLE_ID,
  
  // Community Roles
  pugRoleId: process.env.PUG_ROLE_ID,
  prospectRoleId: process.env.PROSPECT_ROLE_ID,
  guildieRoleId: process.env.GUILDIE_ROLE_ID,

  // Raid Roles
  officerRoleId: process.env.OFFICER_ROLE_ID,
  raiderRoleId: process.env.RAIDER_ROLE_ID,
  trialRoleId: process.env.TRIAL_ROLE_ID,
  
  // Raid Helper API
  raidHelperApiKey: process.env.RAID_HELPER_API_KEY,

  // Bot Settings
  requiredNicknameChange: process.env.REQUIRED_NICKNAME_CHANGE === 'true',
  adminUserIds: process.env.ADMIN_USER_IDS ? process.env.ADMIN_USER_IDS.split(',') : [],

  // Server Configuration for Warcraftlogs
  servers: [
    { label: 'Pagle', value: 'pagle' },
    { label: 'Lei Shen', value: 'lei-shen' },
    { label: 'Ra-Den', value: 'raden' },
    { label: 'Nazgrim', value: 'nazgrim' },
    { label: 'Galakras', value: 'galakras' }
  ],
  
  // Messages
  messages: {
    welcome: {
      title: "Welcome to Chonglers! 🎮",
      description: "To keep communication clear between Discord and in-game, we need your Discord name to match your in-game name.",
      instructions: [
        "Please set your Discord nickname to match your in-game character name.",
        "This helps everyone know who they're talking to both in Discord and in-game!",
        "",
        "Click the button in #verify to set your nickname and gain access to all channels."
      ],
      footer: "This ensures clear communication across all platforms!"
    },
    verified: {
      title: "Welcome to the server! ✅",
      description: "Thanks for setting your nickname! You now have access to all channels."
    },
    alreadyVerified: {
      description: "You're already verified and have access to all channels!"
    }
  }
};
