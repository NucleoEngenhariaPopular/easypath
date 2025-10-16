#!/bin/bash
# Switch a Telegram bot to use a different flow
# Usage: ./scripts/switch-flow.sh <flow_id> [bot_id]

set -e

# Change to project root directory
cd "$(dirname "$0")/.." || exit 1

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🔄 Switch Bot to Different Flow${NC}"
echo ""

# Parse arguments
FLOW_ID="$1"
BOT_ID="${2:-1}"  # Default to bot ID 1 if not specified

# Validate required parameters
if [ -z "$FLOW_ID" ]; then
    echo -e "${RED}❌ Error: Flow ID is required${NC}"
    echo ""
    echo "Usage: $0 <flow_id> [bot_id]"
    echo ""
    echo "Examples:"
    echo "  $0 2           # Switch bot 1 to flow 2"
    echo "  $0 3 2         # Switch bot 2 to flow 3"
    echo ""
    echo "💡 To see available flows, run:"
    echo "   ./scripts/list-flows.sh"
    exit 1
fi

# Gateway URL
GATEWAY_URL="${MESSAGING_GATEWAY_URL:-http://localhost:8082}"

echo -e "${YELLOW}Switching bot #$BOT_ID to flow #$FLOW_ID...${NC}"
echo ""

# Make API request
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$GATEWAY_URL/api/bots/$BOT_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"flow_id\": $FLOW_ID
  }")

# Split response body and status code
HTTP_BODY=$(echo "$RESPONSE" | head -n -1)
HTTP_STATUS=$(echo "$RESPONSE" | tail -n 1)

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✅ Bot switched successfully!${NC}"
    echo ""
    echo -e "${GREEN}Updated Configuration:${NC}"
    echo "$HTTP_BODY" | python3 -m json.tool 2>/dev/null || echo "$HTTP_BODY"
    echo ""
    echo -e "${GREEN}🎉 Your bot is now using flow #$FLOW_ID${NC}"
    echo ""
    echo "Test it on Telegram by sending a message to your bot!"
    echo ""
    echo -e "${YELLOW}💡 Useful commands:${NC}"
    echo "  • List flows:    ./scripts/list-flows.sh"
    echo "  • View logs:     docker compose -f docker/docker-compose.dev.yml logs -f messaging-gateway"
    echo "  • List bots:     curl http://localhost:8082/api/bots"
elif [ "$HTTP_STATUS" -eq 404 ]; then
    echo -e "${RED}❌ Error: Bot #$BOT_ID not found${NC}"
    echo ""
    echo "Available bots:"
    curl -s "$GATEWAY_URL/api/bots" | python3 -m json.tool 2>/dev/null || echo "Could not fetch bots"
    echo ""
    echo "To create a new bot:"
    echo "  ./scripts/register-telegram-bot.sh YOUR_BOT_TOKEN $FLOW_ID user-123 \"My Bot\""
    exit 1
else
    echo -e "${RED}❌ Error: Failed to switch flow (HTTP $HTTP_STATUS)${NC}"
    echo ""
    echo -e "${RED}Response:${NC}"
    echo "$HTTP_BODY"
    echo ""
    echo "Troubleshooting:"
    echo "  • Make sure the messaging gateway is running"
    echo "  • Verify bot ID exists: curl http://localhost:8082/api/bots"
    echo "  • Verify flow ID exists: ./scripts/list-flows.sh"
    exit 1
fi
