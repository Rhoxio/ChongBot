# Railway Deployment Guide

## 🚀 Deploy Your Chonglers Discord Bot to Railway

### Prerequisites
- Railway account (https://railway.app)
- GitHub account
- Your Discord bot token and IDs ready

### Step 1: Push to GitHub

1. **Initialize Git Repository** (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit - Chonglers Discord Bot"
   ```

2. **Create GitHub Repository**:
   - Go to GitHub and create a new repository
   - Name it `chonglers-discord-bot`
   - Don't initialize with README (we already have files)

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/chonglers-discord-bot.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Railway

1. **Login to Railway**: https://railway.app
2. **Create New Project**: Click "New Project"
3. **Deploy from GitHub**: Select "Deploy from GitHub repo"
4. **Select Repository**: Choose your `chonglers-discord-bot` repository
5. **Deploy**: Railway will automatically detect it's a Node.js project

### Step 3: Configure Environment Variables

In your Railway project dashboard, go to **Variables** tab and add:

```
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_bot_client_id_here
GUILD_ID=your_server_id_here
VERIFY_CHANNEL_ID=your_verify_channel_id_here
GENERAL_CHANNEL_ID=your_general_channel_id_here
UNVERIFIED_ROLE_ID=your_unverified_role_id_here
VERIFIED_ROLE_ID=your_verified_role_id_here
REQUIRED_NICKNAME_CHANGE=true
ADMIN_USER_IDS=your_user_id_here
```

### Step 4: Deploy & Monitor

1. **Automatic Deployment**: Railway will automatically deploy after you add environment variables
2. **Check Logs**: Go to "Deployments" tab to see build and runtime logs
3. **Monitor**: Your bot should come online in Discord

### Step 5: Verify Deployment

1. **Check Bot Status**: Your bot should appear online in Discord
2. **Test Commands**: Try `/chongalation` or `/stats` 
3. **Test Verification**: Have someone join and test the verification flow

## 🔧 Troubleshooting

### Bot Not Starting
- Check Railway logs for errors
- Verify all environment variables are set correctly
- Ensure Discord token is valid

### Commands Not Working
- Commands are automatically deployed via `postinstall` script
- Check logs for "Successfully reloaded application (/) commands"

### Permission Issues
- Verify bot has all required permissions in Discord
- Check role hierarchy in your Discord server

## 💰 Railway Pricing

- **Hobby Plan**: $5/month - Perfect for Discord bots
- **Free Trial**: Available for testing
- **Usage-based**: Only pay for what you use

## 🔄 Updates

To update your bot:
1. Make changes locally
2. Commit and push to GitHub:
   ```bash
   git add .
   git commit -m "Update bot features"
   git push
   ```
3. Railway automatically redeploys!

## 📊 Monitoring

Railway provides:
- **Real-time logs**
- **Metrics dashboard**
- **Automatic restarts** on crashes
- **Health checks**

Your bot will be running 24/7 with automatic restarts if anything goes wrong!

## 🎯 Next Steps

After deployment:
- Monitor logs for the first few hours
- Test all bot functionality
- Set up any additional monitoring if needed
- Enjoy your 24/7 Discord bot! 🎉
