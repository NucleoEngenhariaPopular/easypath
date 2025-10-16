#!/bin/bash
# List all available flows from the Platform Backend
# Usage: ./scripts/list-flows.sh

# Change to project root directory
cd "$(dirname "$0")/.." || exit 1

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Platform Backend URL
BACKEND_URL="${PLATFORM_BACKEND_URL:-http://localhost:8000}"

echo -e "${CYAN}📋 Available Flows${NC}"
echo ""

# Make API request
RESPONSE=$(curl -s "$BACKEND_URL/api/flows" 2>&1)

# Check if request was successful
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error: Could not connect to Platform Backend at $BACKEND_URL${NC}"
    echo ""
    echo "Make sure the backend is running:"
    echo "  docker compose -f docker/docker-compose.dev.yml up backend"
    exit 1
fi

# Parse and display flows
if echo "$RESPONSE" | grep -q "id"; then
    echo "$RESPONSE" | python3 -c "
import sys
import json

try:
    flows = json.load(sys.stdin)
    if not flows:
        print('No flows found. Create one in the Platform Dashboard at http://localhost:5173')
        sys.exit(0)

    print(f'{"ID":<6} {"Name":<30} {"Description":<50}')
    print('-' * 90)

    for flow in flows:
        flow_id = str(flow.get('id', 'N/A'))
        name = flow.get('name', 'Unnamed')[:30]
        desc = flow.get('description', 'No description')[:50]
        print(f'{flow_id:<6} {name:<30} {desc:<50}')

    print()
    print(f'Total flows: {len(flows)}')
    print()
    print('💡 To test a flow with Telegram:')
    print('   ./scripts/switch-flow.sh <flow_id> [bot_id]')
    print()
    print('   Or set FLOW_ID in apps/messaging-gateway/.env and run:')
    print('   ./scripts/register-telegram-bot.sh')

except json.JSONDecodeError:
    print('Error: Invalid JSON response from backend')
    sys.exit(1)
except Exception as e:
    print(f'Error: {e}')
    sys.exit(1)
" 2>/dev/null || {
        echo "⚠️  Python3 not found. Raw response:"
        echo "$RESPONSE"
    }
else
    echo -e "${YELLOW}No flows found or backend not responding.${NC}"
    echo ""
    echo "Create a flow in the Platform Dashboard: http://localhost:5173"
fi
