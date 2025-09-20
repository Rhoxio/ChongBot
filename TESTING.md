# Testing Your Button-Based Verification Bot

## ✅ Setup Checklist

Before testing, ensure you have:

1. **Created Discord Bot** and copied token + client ID
2. **Set up server roles**: "Unverified" and "Verified"
3. **Created #verify channel** with proper permissions
4. **Set channel permissions** (deny Unverified from other channels)
5. **Configured .env file** with all IDs
6. **Deployed commands**: `npm run deploy`

## 🧪 Testing Steps

### 1. Start the Bot
```bash
npm start
```

Look for these success messages:
```
✅ Ready! Logged in as YourBot#1234
🏠 Connected to guild: Your Server Name
🔍 Setup Check:
   Unverified Role: ✅ Unverified
   Verified Role: ✅ Verified  
   Verify Channel: ✅ #verify
✅ Set up verification message in #verify
📋 Cached X member usernames
🚀 Bot is ready with button-based verification!
```

### 2. Check Verify Channel
- Go to your #verify channel
- You should see a professional verification message with a blue button: **"🏷️ Set My Nickname"**

### 3. Test New User Flow

**Option A: Use Alt Account**
1. Create Discord alt account or ask friend to join
2. They should automatically get "Unverified" role
3. They should receive a welcome DM (or message in #verify if DM fails)

**Option B: Test with Existing User**
1. Use `/unverify @yourself` command to reset your status
2. You'll get the Unverified role back

### 4. Test Verification Process

1. **Click the Button**: Click "🏷️ Set My Nickname"
2. **Modal Popup**: A popup should appear asking for your nickname
3. **Enter Nickname**: Type a name different from your Discord username
4. **Success**: You should get:
   - Green success message 
   - "Verified" role added
   - "Unverified" role removed
   - Access to all channels

### 5. Test Edge Cases

**Already Verified Users**:
- Clicking button shows: "✅ You're already verified!"

**Same Username**:
- Entering your Discord username shows error: "Please choose a different nickname"

**Empty/Invalid Nicknames**:
- Too short/long nicknames show validation errors

## 🛠️ Admin Commands Testing

Test these slash commands:

- `/verify @user` - Manually verify someone
- `/unverify @user` - Remove verification 
- `/status @user` - Check verification status
- `/stats` - View server statistics
- `/reset-verify-message` - Reset the verification button

## 🐛 Troubleshooting

### Bot Not Responding
```bash
# Check logs for errors
npm start
```

### Button Not Working
- Verify bot has "Use Application Commands" permission
- Try `/reset-verify-message` command
- Check bot role is above managed roles

### Permissions Issues
- Bot needs "Manage Roles" permission
- Bot's role must be higher than "Verified"/"Unverified" roles
- Check channel permissions are set correctly

### Modal Not Appearing
- Ensure Discord is up to date
- Try refreshing Discord (Ctrl+R)
- Check browser/app permissions

## 📊 Expected User Experience

**New User Journey**:
1. User joins → Gets Unverified role → Can only see #verify
2. Receives welcome message directing to #verify channel
3. Clicks button → Popup appears → Enters nickname → Instant verification
4. Gains access to all channels

**Time to verify**: ~30 seconds
**User friction**: Minimal (just one click + text input)
**Success rate**: Should be near 100% with clear instructions

The button-based system is much more user-friendly than the old manual nickname changing method!
