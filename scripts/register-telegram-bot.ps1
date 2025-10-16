# Register a Telegram bot with EasyPath Messaging Gateway
# Usage: .\register-telegram-bot.ps1 [bot_token] [flow_id] [owner_id] [bot_name]

param(
    [string]$BotToken,
    [int]$FlowId,
    [string]$OwnerId,
    [string]$BotName
)

Write-Host "🤖 EasyPath Telegram Bot Registration" -ForegroundColor Green
Write-Host ""

# Load environment variables from apps/messaging-gateway/.env if it exists
$EnvFile = "apps\messaging-gateway\.env"
if (Test-Path $EnvFile) {
    Write-Host "📄 Loading configuration from $EnvFile" -ForegroundColor Yellow
    Get-Content $EnvFile | ForEach-Object {
        if ($_ -match '^([^#][^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            Set-Item -Path "env:$key" -Value $value
        }
    }
} else {
    Write-Host "⚠️  Warning: $EnvFile not found. Using command-line arguments or defaults." -ForegroundColor Yellow
}

# Auto-detect webhook base URL if missing
if (-not $env:WEBHOOK_BASE_URL -or [string]::IsNullOrWhiteSpace($env:WEBHOOK_BASE_URL)) {
    Write-Host "🌐 Detecting webhook URL from ngrok..." -ForegroundColor Yellow
    $ngrokApiUrl = if ($env:NGROK_API_URL) { $env:NGROK_API_URL } else { "http://localhost:4040" }
    try {
        $ngrokResponse = Invoke-WebRequest -Uri "$ngrokApiUrl/api/tunnels" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
        $data = ($ngrokResponse.Content | ConvertFrom-Json)
        $httpsTunnel = $data.tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($httpsTunnel -and $httpsTunnel.public_url) {
            $env:WEBHOOK_BASE_URL = $httpsTunnel.public_url.TrimEnd('/')
            Write-Host "✅ Detected webhook URL: $($env:WEBHOOK_BASE_URL)" -ForegroundColor Green
        } else {
            Write-Host "⚠️  No HTTPS tunnel found. Set WEBHOOK_BASE_URL manually." -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️  Could not contact ngrok API. Set WEBHOOK_BASE_URL manually." -ForegroundColor Yellow
    }
}

# Override with command-line arguments if provided, otherwise use environment variables
if (-not $BotToken) { $BotToken = $env:TELEGRAM_BOT_TOKEN }
if (-not $FlowId) { $FlowId = [int]($env:FLOW_ID -replace '[^0-9]','') }
if (-not $OwnerId) { $OwnerId = $env:OWNER_ID }
if (-not $BotName) { $BotName = $env:BOT_NAME }

# Validate required parameters
if (-not $BotToken) {
    Write-Host "❌ Error: Bot token is required" -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage: .\register-telegram-bot.ps1 <bot_token> [flow_id] [owner_id] [bot_name]"
    Write-Host ""
    Write-Host "Example:"
    Write-Host '  .\register-telegram-bot.ps1 "1234567890:ABCdefGHIjklMNOpqrsTUVwxyz" 1 "user-123" "My Bot"'
    Write-Host ""
    Write-Host "Or set TELEGRAM_BOT_TOKEN in $EnvFile"
    exit 1
}

if (-not $FlowId -or $FlowId -eq 0) {
    Write-Host "⚠️  Warning: FLOW_ID not set. Using default: 1" -ForegroundColor Yellow
    $FlowId = 1
}

if (-not $OwnerId) {
    Write-Host "⚠️  Warning: OWNER_ID not set. Using default: user-123" -ForegroundColor Yellow
    $OwnerId = "user-123"
}

if (-not $BotName) {
    Write-Host "⚠️  Warning: BOT_NAME not set. Using default: My Telegram Bot" -ForegroundColor Yellow
    $BotName = "My Telegram Bot"
}

# Gateway URL
$GatewayUrl = if ($env:MESSAGING_GATEWAY_URL) { $env:MESSAGING_GATEWAY_URL } else { "http://localhost:8082" }

Write-Host ""
Write-Host "📝 Registration Details:" -ForegroundColor Green
Write-Host "  Gateway URL: $GatewayUrl"
Write-Host "  Webhook URL: $(if ($env:WEBHOOK_BASE_URL) { $env:WEBHOOK_BASE_URL } else { '<not set>' })"
Write-Host "  Bot Name:    $BotName"
Write-Host "  Flow ID:     $FlowId"
Write-Host "  Owner ID:    $OwnerId"
Write-Host "  Bot Token:   $($BotToken.Substring(0, 10))...$($BotToken.Substring($BotToken.Length - 5))"
Write-Host ""

# Make API request
Write-Host "🔄 Registering bot..." -ForegroundColor Yellow

$Body = @{
    platform = "telegram"
    bot_name = $BotName
    bot_token = $BotToken
    flow_id = $FlowId
    owner_id = $OwnerId
} | ConvertTo-Json

try {
    $Response = Invoke-WebRequest -Uri "$GatewayUrl/api/bots" `
        -Method POST `
        -ContentType "application/json" `
        -Body $Body `
        -ErrorAction Stop

    Write-Host "✅ Bot registered successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Green
    $Response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    Write-Host "🎉 Your bot is ready! Send a message to it on Telegram." -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Useful commands:" -ForegroundColor Yellow
    Write-Host "  • View ngrok URL:  .\get-ngrok-url.ps1"
    Write-Host "  • Check logs:      docker-compose -f docker-compose.dev.yml logs messaging-gateway"
    Write-Host "  • ngrok dashboard: http://localhost:4040"
} catch {
    Write-Host "❌ Error: Failed to register bot" -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Response:" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        $_.ErrorDetails.Message | Write-Host
    } else {
        $_.Exception.Message | Write-Host
    }
    exit 1
}
