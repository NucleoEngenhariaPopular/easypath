@echo off
REM Start Platform only (Frontend + Backend + PostgreSQL)
REM Lighter version without Engine and Redis

echo 🚀 Starting EasyPath Platform (Frontend + Backend)...
echo.

REM Start platform services
echo Starting platform services with Docker Compose...
docker-compose -f docker-compose.platform.yml up --build

echo.
echo ✅ Platform started!
echo.
echo Services available at:
echo   - Frontend:  http://localhost:5173
echo   - Backend:   http://localhost:8000
echo   - PostgreSQL: localhost:5432
echo.
echo Press Ctrl+C to stop all services
