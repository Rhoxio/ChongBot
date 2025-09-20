# 🚀 Railway Quick Deploy Guide

## Ready to Deploy! Your bot is now Railway-ready.

### ✅ What's Been Prepared

- ✅ **Railway configuration** (`railway.json`)
- ✅ **Health check endpoints** (for monitoring)
- ✅ **Auto-deploy commands** (via `postinstall` script)
- ✅ **Production-ready package.json**
- ✅ **All dependencies installed**

### 🎯 Deploy in 5 Minutes

#### 1. **Push to GitHub**
```bash
# Initialize git (if not done)
git init
git add .
git commit -m "Chonglers Discord Bot - Ready for Railway"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/chonglers-discord-bot.git
git branch -M main
git push -u origin main
```

#### 2. **Deploy to Railway**
1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `chonglers-discord-bot` repository
5. Railway will auto-detect Node.js and start building

#### 3. **Add Environment Variables**
In Railway dashboard → **Variables** tab, add:
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

#### 4. **Deploy & Go Live! 🎉**
- Railway automatically redeploys after adding variables
- Your bot will be online 24/7
- Check logs in Railway dashboard

### 🔍 **Monitor Your Bot**

**Health Check URLs:**
- `https://your-app.railway.app/` - Bot status
- `https://your-app.railway.app/health` - Detailed health info

**Railway Dashboard:**
- Real-time logs
- Resource usage
- Automatic restarts

### 💰 **Cost**
- **Railway Hobby**: $5/month
- **Free trial** available for testing
- Perfect for Discord bots!

### 🎮 **Your Bot Features**
- ✅ **In-game name verification** with button interface
- ✅ **Auto role assignment** for new members
- ✅ **Admin commands** (`/verify`, `/stats`, etc.)
- ✅ **Chongalations** (`/chongalation`) - Random guild quotes!
- ✅ **24/7 uptime** with automatic restarts

### 🔄 **Future Updates**
Just push to GitHub - Railway auto-deploys!
```bash
git add .
git commit -m "Bot updates"
git push
```

---

**Your Chonglers Discord Bot is ready for the cloud! 🚀**
