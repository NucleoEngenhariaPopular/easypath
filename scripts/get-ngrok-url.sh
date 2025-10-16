#!/bin/bash
# Helper script to get ngrok public URL for webhook configuration
# Run this after starting docker-compose -f docker-compose.dev.yml up

echo "🔍 Fetching ngrok public URL..."
echo ""

# Query ngrok API (ngrok exposes API on port 4040)
response=$(curl -s http://localhost:4040/api/tunnels 2>&1)

if [ $? -eq 0 ]; then
    # Extract HTTPS tunnel URL using jq (or grep if jq not available)
    if command -v jq &> /dev/null; then
public_url=$(echo "$response" | jq -r '.tunnels[] | select(.proto=="https") | .public_url' | head -n1)
    else
        # Fallback to grep/sed if jq not available
        public_url=$(echo "$response" | grep -o '"public_url":"https://[^"]*"' | head -n1 | sed 's/"public_url":"//;s/"//g')
    fi

    if [ -n "$public_url" ]; then
        echo "✅ ngrok is running!"
        echo ""
        echo "Public HTTPS URL: $public_url"
        echo ""
        echo "📋 Next steps:"
        echo "  1. Copy this URL: $public_url"
        echo "  2. Update WEBHOOK_BASE_URL in your .env file"
        echo "  3. Restart messaging-gateway: docker-compose -f docker-compose.dev.yml restart messaging-gateway"
        echo ""
        echo "Or use this command to create a bot (replace YOUR_BOT_TOKEN and flow_id):"
        echo ""
        echo "curl -X POST http://localhost:8082/api/bots \\"
        echo "  -H 'Content-Type: application/json' \\"
        echo "  -d '{"
        echo "    \"platform\": \"telegram\","
        echo "    \"bot_name\": \"My Bot\","
        echo "    \"bot_token\": \"YOUR_BOT_TOKEN\","
        echo "    \"flow_id\": 1,"
        echo "    \"owner_id\": \"user-123\""
        echo "  }'"
        echo ""
        echo "View ngrok web interface: http://localhost:4040"
    else
        echo "❌ No HTTPS tunnel found"
        echo "Make sure ngrok container is running with: docker-compose -f docker-compose.dev.yml ps"
    fi
else
    echo "❌ Could not connect to ngrok"
    echo ""
    echo "Troubleshooting:"
    echo "  1. Make sure ngrok is running: docker-compose -f docker-compose.dev.yml ps"
    echo "  2. Check ngrok logs: docker-compose -f docker-compose.dev.yml logs ngrok"
    echo "  3. Verify NGROK_AUTHTOKEN is set in .env file"
    echo "     Get token from: https://dashboard.ngrok.com/get-started/your-authtoken"
fi
