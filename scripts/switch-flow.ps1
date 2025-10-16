# Switch a Telegram bot to use a different flow
# Usage: .\scripts\switch-flow.ps1 <flow_id> [bot_id]

param(
    [Parameter(Mandatory=$true)]
    [int]$FlowId,

    [int]$BotId = 1
)

# Change to project root directory
Set-Location (Split-Path -Parent (Split-Path -Parent $PSCommandPath))

Write-Host "🔄 Switch Bot to Different Flow" -ForegroundColor Cyan
Write-Host ""

# Gateway URL
$GatewayUrl = if ($env:MESSAGING_GATEWAY_URL) { $env:MESSAGING_GATEWAY_URL } else { "http://localhost:8082" }

Write-Host "Switching bot #$BotId to flow #$FlowId..." -ForegroundColor Yellow
Write-Host ""

# Make API request
$Body = @{
    flow_id = $FlowId
} | ConvertTo-Json

try {
    $Response = Invoke-WebRequest -Uri "$GatewayUrl/api/bots/$BotId" `
        -Method PATCH `
        -ContentType "application/json" `
        -Body $Body `
        -ErrorAction Stop

    Write-Host "✅ Bot switched successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Updated Configuration:" -ForegroundColor Green
    $Response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10 | Write-Host
    Write-Host ""
    Write-Host "🎉 Your bot is now using flow #$FlowId" -ForegroundColor Green
    Write-Host ""
    Write-Host "Test it on Telegram by sending a message to your bot!"
    Write-Host ""
    Write-Host "💡 Useful commands:" -ForegroundColor Yellow
    Write-Host "  • List flows:    .\scripts\list-flows.ps1"
    Write-Host "  • View logs:     docker compose -f docker\docker-compose.dev.yml logs -f messaging-gateway"
    Write-Host "  • List bots:     Invoke-RestMethod http://localhost:8082/api/bots | ConvertTo-Json"

} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__

    if ($StatusCode -eq 404) {
        Write-Host "❌ Error: Bot #$BotId not found" -ForegroundColor Red
        Write-Host ""
        Write-Host "Available bots:"
        try {
            $Bots = Invoke-RestMethod -Uri "$GatewayUrl/api/bots"
            $Bots | ConvertTo-Json -Depth 10 | Write-Host
        } catch {
            Write-Host "Could not fetch bots" -ForegroundColor Red
        }
        Write-Host ""
        Write-Host "To create a new bot:"
        Write-Host "  .\scripts\register-telegram-bot.ps1 YOUR_BOT_TOKEN $FlowId user-123 `"My Bot`""
    } else {
        Write-Host "❌ Error: Failed to switch flow (HTTP $StatusCode)" -ForegroundColor Red
        Write-Host ""
        Write-Host "Response:" -ForegroundColor Red
        if ($_.ErrorDetails.Message) {
            $_.ErrorDetails.Message | Write-Host
        } else {
            $_.Exception.Message | Write-Host
        }
        Write-Host ""
        Write-Host "Troubleshooting:"
        Write-Host "  • Make sure the messaging gateway is running"
        Write-Host "  • Verify bot ID exists: Invoke-RestMethod http://localhost:8082/api/bots"
        Write-Host "  • Verify flow ID exists: .\scripts\list-flows.ps1"
    }
    exit 1
}
