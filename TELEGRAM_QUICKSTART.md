# 🚀 Telegram Integration - Quick Start Guide

Get your EasyPath flows running on Telegram in **5 minutes**!

## Prerequisites

- Docker and Docker Compose installed
- A Telegram account
- An ngrok account (free) - sign up at https://dashboard.ngrok.com

## Step 1: Setup Environment (1 minute)

```bash
# Clone and navigate to project
cd easypath

# Copy environment template
cp apps/messaging-gateway/.env.example apps/messaging-gateway/.env

# Generate encryption key
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Copy the output and add to .env as SECRET_KEY
```

Edit `apps/messaging-gateway/.env`:
```bash
SECRET_KEY=your-generated-key-here
NGROK_AUTHTOKEN=your-ngrok-token-here  # Get from https://dashboard.ngrok.com
WEBHOOK_BASE_URL=your-ngrok-https-url   # Auto-detected when using bundled ngrok container
TELEGRAM_BOT_TOKEN=your-bot-token-here  # We'll get this in Step 2
FLOW_ID=1
OWNER_ID=user-123
BOT_NAME=My Test Bot
```

## Step 2: Create Telegram Bot (1 minute)

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name: `My EasyPath Bot`
4. Choose a username: `myeasypath_bot` (must end with `_bot`)
5. **Copy the bot token** → Add to `apps/messaging-gateway/.env` as `TELEGRAM_BOT_TOKEN`

## Step 3: Start Services (2 minutes)

```bash
# Option 1: Using helper script (recommended)
./scripts/dev/start-dev.sh   # Linux/macOS
.\scripts\dev\start-dev.bat  # Windows CMD (PowerShell alternative: .\scripts\start-telegram.ps1)

# Option 2: Direct docker compose
docker compose -f docker/docker-compose.dev.yml up --build
```

Wait for all services to start (~1-2 minutes on first run).

## Step 4: Register Bot (30 seconds)

```bash
# In a new terminal, register your bot
./scripts/register-telegram-bot.sh  # Linux/macOS
.\scripts\register-telegram-bot.ps1  # Windows

# The script will:
# - Read your bot token from .env
# - Get the ngrok URL automatically
# - Register the bot with EasyPath
# - Configure Telegram webhook
```

**Expected output:**
```
✅ Bot registered successfully!

Response:
{
  "id": 1,
  "platform": "telegram",
  "bot_name": "My Test Bot",
  "webhook_url": "https://abc123.ngrok-free.app/webhooks/telegram/1"
}

🎉 Your bot is ready! Send a message to it on Telegram.
```

## Step 5: Test Your Bot! 🎉

1. Open Telegram
2. Search for your bot: `@myeasypath_bot`
3. Send `/start` or any message
4. **Your flow executes instantly!**

## 🔍 Useful Commands

### List available flows
```bash
./scripts/list-flows.sh  # Linux/macOS
.\scripts\list-flows.ps1  # Windows

# Shows all flows with ID, name, and description
```

### Switch bot to different flow
```bash
./scripts/switch-flow.sh 2     # Switch bot 1 to flow 2 (Linux/macOS)
.\scripts\switch-flow.ps1 2    # Windows

./scripts/switch-flow.sh 3 2   # Switch bot 2 to flow 3
```

### Get ngrok URL
```bash
./scripts/get-ngrok-url.sh  # Linux/macOS
.\scripts\get-ngrok-url.ps1  # Windows
```

### View logs
```bash
docker compose -f docker/docker-compose.dev.yml logs -f messaging-gateway
```

### View ngrok requests
Open http://localhost:4040 in your browser

### List all bots
```bash
curl http://localhost:8082/api/bots?owner_id=user-123
```

### View conversation history
```bash
curl http://localhost:8082/api/bots/1/conversations
```

---

## 🎯 What's Next?

✅ **Your bot is live!** Messages from Telegram → Flow execution → Responses back
✅ **Variables work** - Extract data from user messages
✅ **Loops work** - Repeat questions until conditions are met
✅ **History stored** - All messages saved in database

### Next Steps:

1. **Create more complex flows** in the Platform dashboard
2. **Test different scenarios** with variables and conditions
3. **Monitor conversations** via the API
4. **Add more bots** - different flows for different purposes

### Future Enhancements:

- Add WhatsApp integration (similar process with Twilio)
- Build a UI for bot management in the Platform frontend
- Add rich media support (images, buttons)
- Set up production deployment with proper HTTPS

## 🐛 Troubleshooting

**Bot doesn't respond?**
1. Check if services are running:
   ```bash
   docker compose -f docker/docker-compose.dev.yml ps
   ```
2. View logs:
   ```bash
   docker compose -f docker/docker-compose.dev.yml logs messaging-gateway
   docker compose -f docker/docker-compose.dev.yml logs engine
   ```
3. Check ngrok is working:
   ```bash
   ./scripts/get-ngrok-url.sh  # Should show your HTTPS URL
   ```

**Registration script fails?**
- Verify `apps/messaging-gateway/.env` has all required fields
- Make sure services are running first
- Check ngrok is connected (port 4040 should be accessible)

**ngrok not working?**
- Verify `NGROK_AUTHTOKEN` in `.env` is correct
- Get your token from https://dashboard.ngrok.com/get-started/your-authtoken
- Restart services after updating the token

**Services won't start?**
- Make sure ports 5173, 8000, 8081, 8082, 4040, 5432, 6379 are available
- Check Docker is running
- Try: `docker compose -f docker/docker-compose.dev.yml down` then start again

---

## 📚 Full Documentation

See `apps/messaging-gateway/README.md` for complete documentation including:
- API reference
- Architecture details
- Security best practices
- WhatsApp integration guide (coming soon)

---

## 📝 Quick Reference (All Commands)

Here's the complete flow in one place:

```bash
# 1. Setup environment
cp apps/messaging-gateway/.env.example apps/messaging-gateway/.env
# Edit .env and add: SECRET_KEY, NGROK_AUTHTOKEN, TELEGRAM_BOT_TOKEN

# 2. Start services
./scripts/start-dev.sh  # or .ps1 on Windows

# 3. Register bot (in new terminal)
./scripts/register-telegram-bot.sh  # or .ps1 on Windows

# 4. Test on Telegram!
# Open Telegram, search for your bot, send a message

# Useful commands:
./scripts/list-flows.sh                                         # List all flows
./scripts/switch-flow.sh 2                                      # Switch bot to flow 2
./scripts/get-ngrok-url.sh                                      # Get ngrok URL
docker compose -f docker/docker-compose.dev.yml logs -f         # View all logs
docker compose -f docker/docker-compose.dev.yml down            # Stop services
curl http://localhost:8082/api/bots?owner_id=user-123          # List bots
```

---

**🎉 Congratulations! Your EasyPath flows are now live on Telegram!**
