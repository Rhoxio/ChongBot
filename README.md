# Chonglers Discord Bot

A comprehensive Discord verification bot with a **two-step verification system** featuring button-based interactions, role selection, and admin controls. Ensures clear communication by requiring users to set in-game character names and select community roles before gaining server access.

## ✨ Features

### 🔐 **Two-Step Verification System**
- **Step 1**: Modal form to set in-game character name
- **Step 2**: Dropdown menu to select community role (Pug/Prospect/Guildie)
- **Button-based UI** with beautiful Discord embeds
- **No verification until both steps complete**

### 🎭 **Community Role Management**
- **🐶 Pug** - Pick-up group member for one-off raids
- **⚡ Prospect** - Experienced player looking to join
- **🛡️ Guildie** - Full guild member
- **Automatic role switching** (removes old role when selecting new one)

### 🛠️ **Admin Controls & Security**
- **Permission-protected commands** (admins + allow-listed users only)
- **Manual verification tools** for moderators
- **Server statistics** and verification tracking
- **Force setup** and testing tools

### 🎉 **User Experience**
- **Single verification channel** with persistent message
- **Clear instructions** with role previews
- **Instant feedback** and error handling
- **Owner testing mode** for safe development

## 🚀 How It Works

### **For New Users:**
1. **Join Server** → Automatically get "Unverified" role (no channel access)
2. **Go to #verify** → See welcome message with "Complete Verification" button
3. **Click Button** → Modal opens to enter in-game character name
4. **Set Nickname** → Dropdown appears to select community role
5. **Choose Role** → Get "Verified" role + community role + full server access

### **For Admins:**
- Use `/verify @user` to manually verify users
- Use `/stats` to see verification metrics
- Use `/reset-verify-message` to update the verification message
- Use `/chongalation` for fun community quotes!

## 📋 Setup Instructions

### 1. Discord Bot Creation

1. **Discord Developer Portal**: https://discord.com/developers/applications
2. **Create New Application** → Choose a name
3. **Bot Section** → "Add Bot" → Copy the bot token
4. **Enable Privileged Gateway Intents:**
   - ✅ Server Members Intent
   - ✅ Message Content Intent

### 2. Server Preparation

#### **Create Roles (in this order):**
```
👑 Admin Roles (your existing roles)
🤖 ChongBot Role ← Bot's role (MUST BE ABOVE MANAGED ROLES)
🛡️ Guildie Role
⚡ Prospect Role  
🐶 Pug Role
✅ Verified Role
❌ Unverified Role
👥 @everyone (bottom)
```

#### **Create Channels:**
- **#verify** - Where the verification message will live
- **#general** - Main chat (or your preferred default channel)

#### **Set Channel Permissions:**
1. **For restricted channels:**
   - ❌ Remove `@everyone` view permissions
   - ✅ Allow `Verified` role to view/chat
   - ❌ Deny `Unverified` role access

2. **For #verify channel:**
   - ✅ Allow `@everyone` to view
   - ✅ Allow bot to send/manage messages

### 3. Get Discord IDs

**Enable Developer Mode:** User Settings → App Settings → Advanced → Developer Mode

**Right-click and "Copy ID" for:**
- Your server (Guild ID)
- #verify channel
- #general channel  
- Unverified role
- Verified role
- Pug role
- Prospect role
- Guildie role
- Your user ID (for admin access)

### 4. Bot Configuration

#### **Local Development:**
```bash
# Copy the example config
cp config.example.env .env

# Edit .env with your values
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_server_id_here
VERIFY_CHANNEL_ID=your_verify_channel_id_here
GENERAL_CHANNEL_ID=your_general_channel_id_here
UNVERIFIED_ROLE_ID=your_unverified_role_id_here
VERIFIED_ROLE_ID=your_verified_role_id_here
PUG_ROLE_ID=your_pug_role_id_here
PROSPECT_ROLE_ID=your_prospect_role_id_here
GUILDIE_ROLE_ID=your_guildie_role_id_here
REQUIRED_NICKNAME_CHANGE=true
ADMIN_USER_IDS=your_user_id_here,another_admin_id_here
```

#### **Railway Deployment:**
Set the same environment variables in your Railway dashboard.

### 5. Installation & Launch

```bash
# Install dependencies
npm install

# Deploy slash commands (required!)
npm run deploy

# Start the bot
npm start

# Development with auto-restart
npm run dev
```

## 🎮 Commands

### **Public Commands**
- `/chongalation [author]` - Get a random community quote

### **Admin Commands** (Admins + Allow-listed Users Only)
- `/verify @user` - Manually verify a user
- `/unverify @user` - Remove verification from a user
- `/status @user` - Check user's verification status
- `/stats` - View server verification statistics
- `/reset-verify-message` - Update the verification message
- `/test-verification` - Test the verification flow (admin override)
- `/force-setup` - Force setup verification system
- `/auto-assign-roles` - Bulk assign unverified role to members

## 🔐 Permission Requirements

### **Bot Permissions (Essential)**
- ✅ **Manage Roles** - Add/remove verification and community roles
- ✅ **Manage Nicknames** - Set user nicknames during verification
- ✅ **Send Messages** - Send verification messages and responses
- ✅ **View Channels** - Access channels to manage verification
- ✅ **Use Slash Commands** - Enable all `/` commands
- ✅ **Read Message History** - Manage existing bot messages

### **Bot Permissions (Recommended)**
- ✅ **Manage Messages** - Clean up old messages (prevents errors)

### **Admin Access Control**
The bot checks for admin permissions in this order:
1. **Allow-listed Discord IDs** (`ADMIN_USER_IDS`)
2. **Discord Administrator permission**
3. **Manage Roles permission** (fallback)

## 🚀 Deployment Options

### **Railway (Recommended)**
1. Connect your GitHub repo to Railway
2. Set all environment variables in Railway dashboard
3. Deploy automatically on git push
4. See `RAILWAY_QUICK_START.md` for detailed instructions

### **Local Development**
1. Set up `.env` file with your configuration
2. Run `npm start` to start the bot locally
3. Great for testing and development

## 🎯 Key Features Explained

### **Two-Step Verification**
- **Prevents incomplete verification** - users must complete both nickname AND role selection
- **Role-based access control** - users only get verified after choosing their community role
- **Better user experience** - clear, guided process with proper UI components

### **Community Roles**
- **Pug**: Temporary members for pick-up groups and one-off raids
- **Prospect**: Experienced players interested in joining the guild
- **Guildie**: Full guild members with complete access

### **Admin Security**
- **Multiple permission layers** - allow-listed users, Discord admins, role managers
- **Command restrictions** - sensitive commands are admin-only
- **Testing capabilities** - admins can test the flow without affecting their roles

### **Smart Error Handling**
- **Graceful interaction failures** - handles Discord API timeouts
- **User-friendly error messages** - clear feedback on what went wrong
- **Automatic recovery** - bot continues working even after errors

## 🛠️ Customization

### **Modify Verification Message**
Edit `verification-utils.js` to change:
- Embed colors and styling
- Role descriptions
- Instructions and help text
- Button labels

### **Add New Roles**
1. Create the role in Discord
2. Add role ID to environment variables
3. Update `assignCommunityRole()` function in `index.js`
4. Add role option to dropdown in verification flow

### **Custom Commands**
Add new commands in `commands.js`:
- Follow existing patterns for admin vs public commands
- Use proper permission checks
- Include error handling

## 🚨 Troubleshooting

### **Bot Not Responding**
- ✅ Check bot token is correct
- ✅ Verify bot is online in Discord
- ✅ Ensure bot has required permissions
- ✅ Check console for error messages

### **Commands Not Working**
- ✅ Run `npm run deploy` to register commands
- ✅ Check bot has `applications.commands` scope
- ✅ Verify user has admin permissions for admin commands
- ✅ Ensure bot role is above managed roles

### **Verification Issues**
- ✅ Check all role IDs are correct in environment variables
- ✅ Verify bot can manage the Unverified/Verified roles
- ✅ Ensure #verify channel allows bot to send messages
- ✅ Check role hierarchy (bot role above managed roles)

### **Permission Errors**
- ✅ Bot role must be above Verified/Unverified/Community roles
- ✅ Enable "Manage Roles" and "Manage Nicknames" permissions
- ✅ Grant channel access permissions in #verify

## 📊 Monitoring & Maintenance

### **Health Checks**
- Bot includes Express server on port 3000 for Railway health checks
- Console logging shows verification activity and errors
- Use `/stats` command to monitor verification rates

### **Updates & Deployment**
- Push to main branch → Railway auto-deploys
- Environment variables persist between deployments
- Commands auto-deploy via `postinstall` script

## 🔗 Quick Links

- **Setup Guide**: [`docs/SETUP.md`](docs/SETUP.md)
- **Testing Guide**: [`docs/TESTING.md`](docs/TESTING.md)
- **Deployment Guide**: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)
- **Railway Quick Start**: [`docs/RAILWAY_QUICK_START.md`](docs/RAILWAY_QUICK_START.md)

## 💡 Tips

- **Test locally first** before deploying to production
- **Use `/test-verification`** to verify the flow works correctly
- **Monitor console logs** for user verification activity
- **Keep environment variables secure** and never commit them
- **Update role descriptions** to match your community's needs

---

Built with ❤️ using Discord.js v14 | Deployed on Railway 🚀