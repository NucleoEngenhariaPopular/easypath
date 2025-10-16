#!/bin/bash
# Register a Telegram bot with EasyPath Messaging Gateway
# Usage: ./register-telegram-bot.sh [bot_token] [flow_id] [owner_id] [bot_name]

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🤖 EasyPath Telegram Bot Registration${NC}"
echo ""

# Load environment variables from apps/messaging-gateway/.env if it exists
ENV_FILE="apps/messaging-gateway/.env"
if [ -f "$ENV_FILE" ]; then
    echo -e "${YELLOW}📄 Loading configuration from $ENV_FILE${NC}"
    export $(grep -v '^#' "$ENV_FILE" | xargs)
else
    echo -e "${YELLOW}⚠️  Warning: $ENV_FILE not found. Using command-line arguments or defaults.${NC}"
fi

# Auto-detect webhook base URL if missing
if [ -z "$WEBHOOK_BASE_URL" ]; then
    echo -e "${YELLOW}🌐 Detecting webhook URL from ngrok...${NC}"
    NGROK_API_URL=${NGROK_API_URL:-http://localhost:4040}
    NGROK_RESPONSE=$(curl -s "$NGROK_API_URL/api/tunnels" 2>/dev/null)
    if [ -n "$NGROK_RESPONSE" ]; then
        if command -v jq &> /dev/null; then
            WEBHOOK_BASE_URL=$(echo "$NGROK_RESPONSE" | jq -r '.tunnels[] | select(.proto=="https") | .public_url' | head -n1)
        else
            WEBHOOK_BASE_URL=$(echo "$NGROK_RESPONSE" | grep -o '"public_url":"https://[^\"]*"' | head -n1 | sed 's/"public_url":"//;s/"//g')
        fi
        if [ -n "$WEBHOOK_BASE_URL" ]; then
            echo -e "${GREEN}✅ Detected webhook URL: ${WEBHOOK_BASE_URL}${NC}"
        else
            echo -e "${YELLOW}⚠️  No HTTPS tunnel found. Set WEBHOOK_BASE_URL manually.${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Could not contact ngrok API. Set WEBHOOK_BASE_URL manually.${NC}"
    fi
fi

# Override with command-line arguments if provided
BOT_TOKEN="${1:-$TELEGRAM_BOT_TOKEN}"
FLOW_ID="${2:-$FLOW_ID}"
OWNER_ID="${3:-$OWNER_ID}"
BOT_NAME="${4:-$BOT_NAME}"

# Validate required parameters
if [ -z "$BOT_TOKEN" ]; then
    echo -e "${RED}❌ Error: Bot token is required${NC}"
    echo ""
    echo "Usage: $0 <bot_token> [flow_id] [owner_id] [bot_name]"
    echo ""
    echo "Example:"
    echo "  $0 1234567890:ABCdefGHIjklMNOpqrsTUVwxyz 1 user-123 \"My Bot\""
    echo ""
    echo "Or set TELEGRAM_BOT_TOKEN in $ENV_FILE"
    exit 1
fi

if [ -z "$FLOW_ID" ]; then
    echo -e "${YELLOW}⚠️  Warning: FLOW_ID not set. Using default: 1${NC}"
    FLOW_ID=1
fi

if [ -z "$OWNER_ID" ]; then
    echo -e "${YELLOW}⚠️  Warning: OWNER_ID not set. Using default: user-123${NC}"
    OWNER_ID="user-123"
fi

if [ -z "$BOT_NAME" ]; then
    echo -e "${YELLOW}⚠️  Warning: BOT_NAME not set. Using default: My Telegram Bot${NC}"
    BOT_NAME="My Telegram Bot"
fi

# Gateway URL
GATEWAY_URL="${MESSAGING_GATEWAY_URL:-http://localhost:8082}"

echo ""
echo -e "${GREEN}📝 Registration Details:${NC}"
echo "  Gateway URL: $GATEWAY_URL"
echo "  Webhook URL: ${WEBHOOK_BASE_URL:-<not set>}"
echo "  Bot Name:    $BOT_NAME"
echo "  Flow ID:     $FLOW_ID"
echo "  Owner ID:    $OWNER_ID"
echo "  Bot Token:   ${BOT_TOKEN:0:10}...${BOT_TOKEN: -5}"
echo ""

# Make API request
echo -e "${YELLOW}🔄 Registering bot...${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL/api/bots" \
  -H "Content-Type: application/json" \
  -d "{
    \"platform\": \"telegram\",
    \"bot_name\": \"$BOT_NAME\",
    \"bot_token\": \"$BOT_TOKEN\",
    \"flow_id\": $FLOW_ID,
    \"owner_id\": \"$OWNER_ID\"
  }")

# Split response body and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_STATUS" -eq 200 ] || [ "$HTTP_STATUS" -eq 201 ]; then
    echo -e "${GREEN}✅ Bot registered successfully!${NC}"
    echo ""
    echo -e "${GREEN}Response:${NC}"
    echo "$HTTP_BODY" | python3 -m json.tool 2>/dev/null || echo "$HTTP_BODY"
    echo ""
    echo -e "${GREEN}🎉 Your bot is ready! Send a message to it on Telegram.${NC}"
    echo ""
    echo -e "${YELLOW}💡 Useful commands:${NC}"
    echo "  • View ngrok URL:  ./get-ngrok-url.sh"
    echo "  • Check logs:      docker-compose -f docker-compose.dev.yml logs messaging-gateway"
    echo "  • ngrok dashboard: http://localhost:4040"
else
    echo -e "${RED}❌ Error: Failed to register bot (HTTP $HTTP_STATUS)${NC}"
    echo ""
    echo -e "${RED}Response:${NC}"
    echo "$HTTP_BODY"
    exit 1
fi
