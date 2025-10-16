#!/bin/bash
# Quick start script for Telegram integration
# Usage: ./scripts/start-telegram.sh

# Change to project root directory
cd "$(dirname "$0")/.." || exit 1

echo "🚀 Starting EasyPath with Telegram Integration"
echo "=============================================="
echo ""

# Check if .env file exists
if [ ! -f "apps/messaging-gateway/.env" ]; then
    echo "⚠️  No .env file found. Creating from template..."
    cp apps/messaging-gateway/.env.example apps/messaging-gateway/.env
    echo "✅ Created .env file. Please update it with your configuration:"
    echo "   - NGROK_AUTHTOKEN (get from https://dashboard.ngrok.com)"
    echo "   - TELEGRAM_BOT_TOKEN (get from @BotFather)"
    echo "   - SECRET_KEY (generate with: python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\")"
    echo ""
    echo "Press Enter after updating the .env file..."
    read
fi

# Check if database migration has been run
echo "📊 Checking database..."
if psql $DATABASE_URL -c "SELECT 1 FROM bot_configs LIMIT 1" &> /dev/null; then
    echo "✅ Database tables exist"
else
    echo "⚠️  Running database migration..."
    psql $DATABASE_URL -f apps/messaging-gateway/migrations/001_create_bot_tables.sql
    echo "✅ Database migration complete"
fi

echo ""
echo "🐳 Starting Docker services..."
docker compose -f docker/docker-compose.messaging.yml up --build -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

# Check if services are running
if curl -s http://localhost:8082/health > /dev/null; then
    echo "✅ Messaging Gateway is running on http://localhost:8082"
else
    echo "❌ Messaging Gateway failed to start. Check logs:"
    echo "   docker compose -f docker/docker-compose.messaging.yml logs messaging-gateway"
    exit 1
fi

if curl -s http://localhost:8081/health > /dev/null; then
    echo "✅ Engine is running on http://localhost:8081"
else
    echo "❌ Engine failed to start. Check logs:"
    echo "   docker compose -f docker/docker-compose.messaging.yml logs engine"
    exit 1
fi

echo ""
echo "=============================================="
echo "🎉 All services are running!"
echo ""
echo "Next steps:"
echo "  1. Create your Telegram bot with @BotFather"
echo "  2. Add your bot token to apps/messaging-gateway/.env"
echo "  3. Register your bot:"
echo "     ./scripts/register-telegram-bot.sh"
echo ""
echo "  4. Test your bot on Telegram!"
echo ""
echo "Useful commands:"
echo "  View logs:     docker compose -f docker/docker-compose.messaging.yml logs -f"
echo "  Stop services: docker compose -f docker/docker-compose.messaging.yml down"
echo ""
