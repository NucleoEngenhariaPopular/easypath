# Development Scripts

This folder contains scripts for starting the EasyPath development environment.

## Available Scripts

### Windows

- **`start-dev.bat`** - Start the full development environment (Frontend + Backend + Engine + Redis + PostgreSQL + Messaging Gateway + ngrok)

  ```batch
  scripts\dev\start-dev.bat
  ```

### Linux/MacOS

- **`start-dev.sh`** - Start the full development environment (Frontend + Backend + Engine + Redis + PostgreSQL + Messaging Gateway + ngrok)

  ```bash
  ./scripts/dev/start-dev.sh
  ```

## What Gets Started

When you run `start-dev.bat` or `start-dev.sh`, the following services are started:

- **Frontend** (React + Vite): http://localhost:5173
- **Backend API** (FastAPI): http://localhost:8000
- **Engine API** (EasyPath Engine): http://localhost:8081
- **Messaging Gateway** (Telegram/WhatsApp): http://localhost:8082
- **PostgreSQL Database**: localhost:5432
- **Redis** (Session Storage): localhost:6379
- **ngrok Dashboard**: http://localhost:4040

## First Time Setup

The scripts will automatically:
1. Check if `.env` files exist for `engine` and `messaging-gateway`
2. Copy from `.env.example` if missing
3. **You must edit these files** to add your API keys before the services will work correctly

### Required Configuration

**`apps/engine/.env`** - Add your LLM provider API key:
```env
LLM_PROVIDER=gemini  # or deepseek
GOOGLE_API_KEY=your-api-key-here
# DEEPSEEK_API_KEY=your-api-key-here
```

**`apps/messaging-gateway/.env`** - Configure messaging gateway settings (see `.env.example` for details)

## Stopping Services

Press `Ctrl+C` in the terminal where Docker Compose is running to stop all services.

## Troubleshooting

- **Port conflicts**: Make sure ports 5173, 8000, 8081, 8082, 5432, 6379, and 4040 are available
- **Docker not running**: Ensure Docker Desktop (Windows/Mac) or Docker daemon (Linux) is running
- **API keys missing**: Check that `.env` files have been configured with your API keys

