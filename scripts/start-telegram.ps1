# Quick start script for Telegram integration (Windows PowerShell)
# Usage: .\scripts\start-telegram.ps1

# Change to project root directory
Set-Location (Split-Path -Parent (Split-Path -Parent $PSCommandPath))

Write-Host "🚀 Starting EasyPath with Telegram Integration" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (-Not (Test-Path "apps\messaging-gateway\.env")) {
    Write-Host "⚠️  No .env file found. Creating from template..." -ForegroundColor Yellow
    Copy-Item "apps\messaging-gateway\.env.example" "apps\messaging-gateway\.env"
    Write-Host "✅ Created .env file. Please update it with your configuration:" -ForegroundColor Green
    Write-Host "   - NGROK_AUTHTOKEN (get from https://dashboard.ngrok.com)"
    Write-Host "   - TELEGRAM_BOT_TOKEN (get from @BotFather)"
    Write-Host "   - SECRET_KEY (generate with: python -c `"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())`")"
    Write-Host ""
    Write-Host "Press Enter after updating the .env file..."
    Read-Host
}

Write-Host ""
Write-Host "🐳 Starting Docker services..." -ForegroundColor Cyan
docker compose -f docker\docker-compose.messaging.yml up --build -d

Write-Host ""
Write-Host "⏳ Waiting for services to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Check if services are running
try {
    $null = Invoke-WebRequest -Uri "http://localhost:8082/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Messaging Gateway is running on http://localhost:8082" -ForegroundColor Green
} catch {
    Write-Host "❌ Messaging Gateway failed to start. Check logs:" -ForegroundColor Red
    Write-Host "   docker compose -f docker\docker-compose.messaging.yml logs messaging-gateway"
    exit 1
}

try {
    $null = Invoke-WebRequest -Uri "http://localhost:8081/health" -UseBasicParsing -ErrorAction Stop
    Write-Host "✅ Engine is running on http://localhost:8081" -ForegroundColor Green
} catch {
    Write-Host "❌ Engine failed to start. Check logs:" -ForegroundColor Red
    Write-Host "   docker compose -f docker\docker-compose.messaging.yml logs engine"
    exit 1
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "🎉 All services are running!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Create your Telegram bot with @BotFather"
Write-Host "  2. Add your bot token to apps\messaging-gateway\.env"
Write-Host "  3. Register your bot:"
Write-Host "     .\scripts\register-telegram-bot.ps1" -ForegroundColor Yellow
Write-Host ""
Write-Host "  4. Test your bot on Telegram!"
Write-Host ""
Write-Host "Useful commands:"
Write-Host "  View logs:     docker compose -f docker\docker-compose.messaging.yml logs -f"
Write-Host "  Stop services: docker compose -f docker\docker-compose.messaging.yml down"
Write-Host ""
