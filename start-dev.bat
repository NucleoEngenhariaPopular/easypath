@echo off
REM Start full development environment (Frontend + Backend + Engine + Redis + PostgreSQL)

echo 🚀 Starting EasyPath Development Environment...
echo.

REM Check if .env exists for engine
if not exist "apps\engine\.env" (
    echo ⚠️  Warning: apps\engine\.env not found
    echo    Copying from .env.example...
    copy "apps\engine\.env.example" "apps\engine\.env"
    echo    Please update apps\engine\.env with your API keys
    echo.
)

REM Ensure messaging-gateway .env exists
if not exist "apps\messaging-gateway\.env" (
    echo ⚠️  Warning: apps\messaging-gateway\.env not found
    echo    Copying from .env.example...
    copy "apps\messaging-gateway\.env.example" "apps\messaging-gateway\.env"
    echo    Please update apps\messaging-gateway\.env with your keys
    echo.
)

REM Start all services
echo Starting all services with Docker Compose...
docker-compose -f docker\docker-compose.dev.yml up --build

echo.
echo ✅ Development environment started!
echo.
echo Services available at:
echo   - Frontend:  http://localhost:5173
echo   - Backend:   http://localhost:8000
echo   - Engine:    http://localhost:8081
echo   - Messaging Gateway: http://localhost:8082
echo   - PostgreSQL: localhost:5432
echo   - Redis:     localhost:6379
echo   - ngrok Dashboard: http://localhost:4040
echo.
echo Press Ctrl+C to stop all services
