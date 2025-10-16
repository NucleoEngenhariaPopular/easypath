# Helper script to get ngrok public URL for webhook configuration
# Run this after starting docker-compose -f docker-compose.dev.yml up

Write-Host "🔍 Fetching ngrok public URL..." -ForegroundColor Cyan
Write-Host ""

try {
    # Query ngrok API (ngrok exposes API on port 4040)
    $response = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -ErrorAction Stop

    $tunnel = $response.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1

    if ($tunnel) {
        $publicUrl = $tunnel.public_url
        Write-Host "✅ ngrok is running!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Public HTTPS URL: $publicUrl" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "📋 Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Copy this URL: $publicUrl" -ForegroundColor White
        Write-Host "  2. Update WEBHOOK_BASE_URL in your .env file" -ForegroundColor White
        Write-Host "  3. Restart messaging-gateway: docker-compose -f docker-compose.dev.yml restart messaging-gateway" -ForegroundColor White
        Write-Host ""
        Write-Host "Or use this command to create a bot (replace YOUR_BOT_TOKEN and flow_id):" -ForegroundColor Cyan
        Write-Host ""
        Write-Host @"
Invoke-WebRequest -Uri "http://localhost:8082/api/bots" ``
  -Method POST ``
  -ContentType "application/json" ``
  -Body '{
    "platform": "telegram",
    "bot_name": "My Bot",
    "bot_token": "YOUR_BOT_TOKEN",
    "flow_id": 1,
    "owner_id": "user-123"
  }'
"@ -ForegroundColor Yellow
        Write-Host ""
        Write-Host "View ngrok web interface: http://localhost:4040" -ForegroundColor Gray
    } else {
        Write-Host "❌ No HTTPS tunnel found" -ForegroundColor Red
        Write-Host "Make sure ngrok container is running with: docker-compose -f docker-compose.dev.yml ps" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Could not connect to ngrok" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting:" -ForegroundColor Yellow
    Write-Host "  1. Make sure ngrok is running: docker-compose -f docker-compose.dev.yml ps" -ForegroundColor White
    Write-Host "  2. Check ngrok logs: docker-compose -f docker-compose.dev.yml logs ngrok" -ForegroundColor White
    Write-Host "  3. Verify NGROK_AUTHTOKEN is set in .env file" -ForegroundColor White
    Write-Host "     Get token from: https://dashboard.ngrok.com/get-started/your-authtoken" -ForegroundColor White
}
