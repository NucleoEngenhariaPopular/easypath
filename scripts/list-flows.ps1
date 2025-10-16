# List all available flows from the Platform Backend
# Usage: .\scripts\list-flows.ps1

# Change to project root directory
Set-Location (Split-Path -Parent (Split-Path -Parent $PSCommandPath))

Write-Host "📋 Available Flows" -ForegroundColor Cyan
Write-Host ""

# Platform Backend URL
$BackendUrl = if ($env:PLATFORM_BACKEND_URL) { $env:PLATFORM_BACKEND_URL } else { "http://localhost:8000" }

try {
    # Make API request
    $Response = Invoke-RestMethod -Uri "$BackendUrl/api/flows" -Method GET -ErrorAction Stop

    if ($Response.Count -eq 0) {
        Write-Host "No flows found. Create one in the Platform Dashboard at http://localhost:5173" -ForegroundColor Yellow
        exit 0
    }

    # Display flows in a table
    Write-Host ("{0,-6} {1,-30} {2,-50}" -f "ID", "Name", "Description")
    Write-Host ("-" * 90)

    foreach ($flow in $Response) {
        $id = $flow.id
        $name = if ($flow.name.Length -gt 30) { $flow.name.Substring(0, 27) + "..." } else { $flow.name }
        $desc = if ($flow.description.Length -gt 50) { $flow.description.Substring(0, 47) + "..." } else { $flow.description }

        if (-not $desc) { $desc = "No description" }

        Write-Host ("{0,-6} {1,-30} {2,-50}" -f $id, $name, $desc)
    }

    Write-Host ""
    Write-Host "Total flows: $($Response.Count)" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 To test a flow with Telegram:" -ForegroundColor Yellow
    Write-Host "   .\scripts\switch-flow.ps1 <flow_id> [bot_id]"
    Write-Host ""
    Write-Host "   Or set FLOW_ID in apps\messaging-gateway\.env and run:"
    Write-Host "   .\scripts\register-telegram-bot.ps1"

} catch {
    Write-Host "❌ Error: Could not connect to Platform Backend at $BackendUrl" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure the backend is running:"
    Write-Host "  docker compose -f docker\docker-compose.dev.yml up backend"
    Write-Host ""
    Write-Host "Error details: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
