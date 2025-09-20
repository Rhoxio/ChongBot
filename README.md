# Chonglers Discord Bot

A Discord bot that enforces nickname changes before users can access server channels. This ensures all members have meaningful display names rather than their default Discord usernames.

## Features

- 🔒 **Automatic Role Management**: Assigns unverified role to new members
- 📝 **Nickname Detection**: Automatically detects when users change their server nickname
- ✅ **Auto-Verification**: Grants access when nickname is changed to something different from Discord username
- 🛠️ **Admin Commands**: Manual verification controls for moderators
- 📊 **Statistics**: Track verification rates and server stats
- 💬 **Welcome Messages**: Clear instructions for new users

## How It Works

1. **New Member Joins**: Bot assigns an "Unverified" role and sends welcome instructions
2. **User Changes Nickname**: When user changes their server nickname to something different from their Discord username
3. **Auto-Verification**: Bot removes "Unverified" role and adds "Verified" role
4. **Channel Access**: User can now see and access all server channels

## Setup Instructions

### 1. Create Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to "Bot" section and click "Add Bot"
4. Copy the bot token (you'll need this later)
5. Enable these Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent

### 2. Invite Bot to Server

1. Go to "OAuth2" > "URL Generator"
2. Select scopes: `bot` and `applications.commands`
3. Select bot permissions:
   - Manage Roles
   - Send Messages
   - Use Slash Commands
   - Read Message History
   - View Channels
4. Use the generated URL to invite the bot to your server

### 3. Server Setup

#### Create Roles
1. Create two roles in your Discord server:
   - **Unverified** (no channel permissions)
   - **Verified** (access to all channels)

#### Set Channel Permissions
1. For each channel you want to restrict:
   - Remove `@everyone` role permissions
   - Allow `Verified` role to view/send messages
   - Deny `Unverified` role access

2. Create a welcome channel:
   - Allow both `Verified` and `Unverified` roles to see this channel
   - This is where instructions will be sent

#### Get IDs
Right-click and "Copy ID" for:
- Your server (Guild ID)
- Welcome channel
- General/main channel
- Unverified role
- Verified role
- Your user ID (for admin commands)

### 4. Configure Bot

1. Copy `config.example.env` to `.env`
2. Fill in all the required values:

```env
# Discord Bot Configuration
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here

# Server Configuration
GUILD_ID=your_server_id_here
WELCOME_CHANNEL_ID=your_welcome_channel_id_here
GENERAL_CHANNEL_ID=your_general_channel_id_here

# Role Configuration
UNVERIFIED_ROLE_ID=your_unverified_role_id_here
VERIFIED_ROLE_ID=your_verified_role_id_here

# Bot Settings
REQUIRED_NICKNAME_CHANGE=true
ADMIN_USER_IDS=your_user_id_here
```

### 5. Install and Run

```bash
# Install dependencies
npm install

# Deploy slash commands
node deploy-commands.js

# Start the bot
npm start

# Or for development with auto-restart
npm run dev
```

## Admin Commands

The bot includes several slash commands for moderators:

- `/verify @user` - Manually verify a user
- `/unverify @user` - Remove verification from a user  
- `/status @user` - Check verification status of a user
- `/stats` - View server verification statistics

## Customization

### Messages
Edit the messages in `config.js` to customize:
- Welcome message text
- Verification confirmation
- Instructions

### Verification Logic
The bot currently verifies users when they change their nickname to anything different from their Discord username. You can modify the verification logic in the `handleNicknameVerification()` function.

### Additional Features
Consider adding:
- Time-based verification reminders
- Automatic role assignment based on nickname patterns
- Integration with other moderation bots
- Webhook notifications for admin actions

## Troubleshooting

### Bot Not Responding
- Check bot token is correct
- Ensure bot has necessary permissions
- Verify bot is online in Discord

### Roles Not Working
- Check role IDs are correct
- Ensure bot's role is higher than managed roles
- Verify channel permissions are set correctly

### Commands Not Appearing
- Run `node deploy-commands.js` to register commands
- Check bot has `applications.commands` scope
- Ensure user has appropriate permissions

## Security Notes

- Keep your bot token secret and never commit it to version control
- Use environment variables for sensitive configuration
- Regularly rotate your bot token if compromised
- Only grant necessary permissions to the bot

## Support

If you need help with setup or encounter issues:
1. Check the console output for error messages
2. Verify all IDs and tokens are correct
3. Ensure bot permissions are properly configured
4. Test with a small server first before deploying to main server

---

Built with ❤️ using Discord.js v14
