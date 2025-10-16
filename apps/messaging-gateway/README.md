# EasyPath Messaging Gateway

The Messaging Gateway connects messaging platforms (Telegram, WhatsApp) to your EasyPath conversation flows, enabling real-world testing and production deployments.

## 🎯 Features

- **Telegram Integration** - Fully working with webhook support
- **WhatsApp Integration** - Coming soon (Twilio/Meta Cloud API)
- **Conversation History** - All messages stored in database
- **Bot Management API** - REST API for configuring bots
- **Real-time Processing** - Messages forwarded to EasyPath engine
- **Multi-bot Support** - Run multiple bots simultaneously

## 🏗️ Architecture

```
Telegram/WhatsApp
    ↓ (webhook)
Messaging Gateway (Port 8082)
    ↓ (HTTP)
EasyPath Engine (Port 8081)
    ↓ (Redis)
Flow Execution + LLM
    ↓ (response)
Messaging Gateway
    ↓ (Bot API)
User receives message
```

## 📋 Prerequisites

1. **PostgreSQL database** (shared with platform backend)
2. **EasyPath engine** running on port 8081
3. **Telegram Bot Token** (from [@BotFather](https://t.me/botfather))
4. **Public domain** or ngrok for webhook (Telegram needs HTTPS)
5. **Secret key** for encrypting bot tokens (generate with `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)

## 🚀 Quick Start

### 1. Create Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow prompts
3. Choose a name (e.g., "My EasyPath Bot")
4. Choose a username (must end with "bot", e.g., "myeasypath_bot")
5. Copy the bot token (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Run Database Migration

```bash
# Connect to your PostgreSQL database
psql -U postgres -d easypath -f migrations/001_create_bot_tables.sql
```

### 3. Configure Environment

Copy `.env.example` to `.env` and update:

```bash
# Database (same as platform backend)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/easypath

# Engine API
ENGINE_API_URL=http://localhost:8081

# Webhook URL (your public domain or ngrok)
WEBHOOK_BASE_URL=https://yourdomain.com  # Or https://abc123.ngrok.io

# Security - IMPORTANT: Generate new key for production!
SECRET_KEY=your-fernet-encryption-key-here
```

**Generate SECRET_KEY:**
```python
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### 4. Run with Docker Compose

```bash
# From project root
docker-compose -f docker-compose.messaging.yml up --build
```

The gateway will be available at `http://localhost:8082`

### 5. Create Bot Configuration

**Option A: Using API**

```bash
curl -X POST http://localhost:8082/api/bots \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "telegram",
    "bot_name": "My Test Bot",
    "bot_token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "flow_id": 1,
    "owner_id": "user-123"
  }'
```

**Option B: Using Python**

```python
import requests

response = requests.post("http://localhost:8082/api/bots", json={
    "platform": "telegram",
    "bot_name": "My Test Bot",
    "bot_token": "YOUR_BOT_TOKEN",
    "flow_id": 1,  # ID of your flow in platform DB
    "owner_id": "your-user-id"
})

bot = response.json()
print(f"Bot created! ID: {bot['id']}")
print(f"Webhook configured: {bot['webhook_url']}")
```

### 6. Test Your Bot!

1. Open Telegram
2. Search for your bot username (e.g., @myeasypath_bot)
3. Send `/start` or any message
4. Your flow will execute and respond! 🎉

## 📚 API Documentation

### Bot Management Endpoints

#### Create Bot
```http
POST /api/bots
Content-Type: application/json

{
  "platform": "telegram",
  "bot_name": "My Bot",
  "bot_token": "bot_token_here",
  "flow_id": 1,
  "owner_id": "user_id"
}
```

#### List Bots
```http
GET /api/bots?owner_id=user123&platform=telegram
```

#### Get Bot Details
```http
GET /api/bots/{bot_id}
```

#### Update Bot
```http
PUT /api/bots/{bot_id}
Content-Type: application/json

{
  "bot_name": "Updated Name",
  "is_active": true
}
```

#### Delete Bot
```http
DELETE /api/bots/{bot_id}
```

#### List Conversations
```http
GET /api/bots/{bot_id}/conversations
```

#### Get Conversation Messages
```http
GET /api/conversations/{conversation_id}/messages
```

### Webhook Endpoints

#### Telegram Webhook
```http
POST /webhooks/telegram/{bot_config_id}
```
(Telegram automatically sends updates here)

#### Webhook Info
```http
GET /webhooks/telegram/{bot_config_id}/info
```
Returns current webhook status and configuration.

## 🔧 Development

### Run Locally (without Docker)

```bash
cd apps/messaging-gateway

# Create virtual environment
python -m venv .venv
source .venv/bin/activate  # or .venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/easypath
export ENGINE_API_URL=http://localhost:8081
export WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
export SECRET_KEY=your-secret-key

# Run the server
uvicorn app.main:app --reload --port 8082
```

### Using ngrok for Local Testing

```bash
# Install ngrok: https://ngrok.com/download

# Start ngrok tunnel
ngrok http 8082

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Update WEBHOOK_BASE_URL in your .env file
```

### Viewing Logs

```bash
# Docker logs
docker-compose -f docker-compose.messaging.yml logs -f messaging-gateway

# Filter by bot
docker-compose -f docker-compose.messaging.yml logs messaging-gateway | grep "bot_id=1"
```

## 🔒 Security

1. **Encrypt Bot Tokens** - All tokens are encrypted with Fernet before storage
2. **Use HTTPS** - Telegram requires HTTPS webhooks
3. **Rotate SECRET_KEY** - Change in production and store securely
4. **Validate Webhooks** - Add webhook_secret validation (TODO)
5. **Rate Limiting** - Add rate limiting for production (TODO)

## 🐛 Troubleshooting

### Bot doesn't respond

1. **Check webhook status:**
   ```bash
   curl http://localhost:8082/webhooks/telegram/{bot_id}/info
   ```

2. **Check logs:**
   ```bash
   docker-compose -f docker-compose.messaging.yml logs messaging-gateway
   ```

3. **Verify engine is running:**
   ```bash
   curl http://localhost:8081/health
   ```

4. **Test bot token:**
   ```bash
   curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
   ```

### Webhook setup fails

- Ensure `WEBHOOK_BASE_URL` is a valid HTTPS URL
- Check that your server is publicly accessible
- Verify port 8082 is not blocked by firewall
- Try using ngrok for local testing

### Database connection fails

- Verify PostgreSQL is running
- Check DATABASE_URL format
- Ensure migrations have been run
- Test connection: `psql $DATABASE_URL -c "SELECT 1"`

## 🔄 Future Enhancements

- [ ] WhatsApp integration (Twilio/Meta API)
- [ ] Rich media support (images, files, buttons)
- [ ] Webhook validation with secrets
- [ ] Rate limiting per bot
- [ ] Analytics dashboard
- [ ] SMS integration
- [ ] Multi-language support

## 📖 Related Documentation

- [EasyPath Engine Documentation](../engine/README.md)
- [Platform Backend Documentation](../platform/backend/README.md)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)

## 🆘 Support

For issues or questions:
1. Check logs first
2. Verify configuration
3. Test individual components
4. Open an issue with detailed logs

---

Built with ❤️ for EasyPath
