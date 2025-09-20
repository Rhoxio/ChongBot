# Quick Setup Guide

## Prerequisites
- Node.js 16.9.0 or higher
- A Discord server where you have admin permissions

## Quick Start (5 minutes)

### 1. Create Discord Bot
1. Go to https://discord.com/developers/applications
2. Click "New Application" → Enter bot name → Create
3. Go to "Bot" → "Add Bot" 
4. Copy the **Token** (keep this safe!)
5. Enable **Server Members Intent** and **Message Content Intent**

### 2. Get Bot Client ID
1. Go to "General Information" 
2. Copy the **Application ID** (this is your Client ID)

### 3. Create Server Roles
In your Discord server:
1. Server Settings → Roles → Create Role
2. Create "**Unverified**" role (no permissions to channels)
3. Create "**Verified**" role (access to all channels)

### 4. Set Channel Permissions
For each channel you want to protect:
1. Right-click channel → Edit Channel → Permissions
2. Remove `@everyone` permissions 
3. Add `Verified` role with Send Messages + View Channel
4. Add `Unverified` role and deny View Channel

### 5. Create Verify Channel
1. Create a channel called `#verify` 
2. Allow both `Unverified` and `Verified` roles to see it
3. This is where the bot will place the verification button

### 6. Get Discord IDs
Enable Developer Mode: User Settings → Advanced → Developer Mode

Right-click and "Copy ID" for:
- Your server name (Guild ID)
- Verify channel
- Unverified role  
- Verified role
- Your username (Admin User ID)

### 7. Configure Bot
1. Copy `config.example.env` to `.env`
2. Fill in all the values you collected above

### 8. Install & Run
```bash
npm install
npm run deploy  # Register bot commands
npm start       # Start the bot
```

## Testing
1. Invite bot to server using this URL format:
   `https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=268435456&scope=bot%20applications.commands`
2. Bot will automatically create a verification message in #verify channel
3. Create a test account or ask a friend to join
4. Verify they get the unverified role and welcome DM/message
5. Have them go to #verify channel and click "Set My Nickname" button
6. They enter a nickname in the popup → Instantly get verified

## Need Help?
- Check console output for errors
- Verify all IDs are correct in `.env`
- Ensure bot permissions are set properly
- Make sure roles are positioned correctly (bot role above managed roles)
