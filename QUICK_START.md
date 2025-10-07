# EasyPath Quick Start Guide

Get EasyPath up and running in minutes with Docker!

## Prerequisites

- Docker and Docker Compose installed
- Git (to clone the repository)
- 8GB RAM recommended
- Ports available: 5173 (Frontend), 8000 (Backend), 8081 (Engine), 5432 (PostgreSQL), 6379 (Redis)

## Option 1: Platform Only (Recommended for Frontend Development)

Start just the **Frontend + Backend + Database** for building flows and testing the UI.

### Windows

```powershell
.\start-platform.bat
```

### Linux/MacOS

```bash
chmod +x start-platform.sh
./start-platform.sh
```

### Manual (any OS)

```bash
docker-compose -f docker-compose.platform.yml up --build
```

**Services:**
- 🌐 Frontend: http://localhost:5173
- 🚀 Backend API: http://localhost:8000
- 🗄️ PostgreSQL: localhost:5432
- 📚 API Docs: http://localhost:8000/docs

## Option 2: Full Stack (Platform + Engine)

Start the **complete environment** including the conversation engine for end-to-end testing.

### Windows

```powershell
.\start-dev.bat
```

### Linux/MacOS

```bash
chmod +x start-dev.sh
./start-dev.sh
```

### Manual (any OS)

```bash
# First time: Set up engine environment
cp apps/engine/.env.example apps/engine/.env
# Edit apps/engine/.env and add your LLM API keys

# Start all services
docker-compose -f docker-compose.dev.yml up --build
```

**Services:**
- 🌐 Frontend: http://localhost:5173
- 🚀 Backend API: http://localhost:8000
- ⚙️ Engine API: http://localhost:8081
- 🗄️ PostgreSQL: localhost:5432
- 🔴 Redis: localhost:6379
- 📚 Backend API Docs: http://localhost:8000/docs
- 📚 Engine API Docs: http://localhost:8081/docs

## First Time Setup

### 1. Configure Engine (if using full stack)

Edit `apps/engine/.env` and add your LLM provider API key:

```bash
# For DeepSeek
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-key-here

# Or for Google Gemini
LLM_PROVIDER=gemini
GOOGLE_API_KEY=your-key-here
```

### 2. Access the Application

1. Open browser: http://localhost:5173
2. Log in with Supabase credentials (if configured)
3. Start building flows!

## Quick Test

### Test Backend API

```bash
# Health check
curl http://localhost:8000/users/

# Create a user
curl -X POST http://localhost:8000/users/ \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

### Test Engine API (if running full stack)

```bash
# Health check
curl http://localhost:8081/health/

# Test chat (requires a flow JSON file)
curl -X POST http://localhost:8081/chat/message \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session",
    "flow_path": "/path/to/your/flow.json",
    "user_message": "Hello!"
  }'
```

## Stopping Services

Press `Ctrl+C` in the terminal, or:

```bash
# Platform only
docker-compose -f docker-compose.platform.yml down

# Full stack
docker-compose -f docker-compose.dev.yml down

# Remove volumes (deletes database data)
docker-compose -f docker-compose.dev.yml down -v
```

## Development Workflow

### Frontend Development

The frontend has hot-reload enabled. Make changes to files in `apps/platform/frontend/src/` and see them instantly in the browser.

```bash
# Frontend logs
docker logs -f easypath_frontend

# Restart frontend only
docker-compose -f docker-compose.platform.yml restart frontend
```

### Backend Development

Backend also has auto-reload with uvicorn.

```bash
# Backend logs
docker logs -f easypath_backend

# Restart backend only
docker-compose -f docker-compose.platform.yml restart backend
```

### Database Access

```bash
# Connect to PostgreSQL
docker exec -it easypath_postgres psql -U user -d easypath

# View tables
\dt

# View flows
SELECT * FROM flows;
```

## Troubleshooting

### Port Already in Use

If you see "port already in use" errors:

```bash
# Check what's using the port (example: 8000)
# Windows
netstat -ano | findstr :8000

# Linux/MacOS
lsof -i :8000

# Kill the process or change ports in docker-compose files
```

### Frontend Can't Reach Backend

Check CORS settings in `apps/platform/backend/main.py`:

```python
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
```

### Engine Can't Connect to Redis

Ensure Redis is healthy:

```bash
docker exec -it easypath_redis redis-cli ping
# Should return: PONG
```

### Database Connection Issues

```bash
# Check PostgreSQL logs
docker logs easypath_postgres

# Verify connection string in backend
docker exec -it easypath_backend env | grep DATABASE_URL
```

## Testing with Postman

### Import Flow Example

1. Use the sample flow: `apps/engine/tests/fixtures/sample_flow.json`
2. Create a flow via Backend API:

```http
POST http://localhost:8000/flows/
Content-Type: application/json

{
  "name": "Test Flow",
  "description": "My first flow",
  "flow_data": { ... paste flow JSON ... }
}
```

3. Test with Engine using file path (traditional way):

```http
POST http://localhost:8081/chat/message
Content-Type: application/json

{
  "session_id": "session-123",
  "flow_path": "/app/fixtures/sample_flow.json",
  "user_message": "Hello!"
}
```

## Next Steps

1. ✅ Explore the Frontend at http://localhost:5173
2. ✅ Check API documentation at http://localhost:8000/docs
3. ✅ Build your first conversation flow
4. ✅ Test flows with the Engine
5. 📖 Read the full documentation in `README.md`

## Useful Commands

```bash
# View all running containers
docker ps

# View logs from all services
docker-compose -f docker-compose.dev.yml logs -f

# Rebuild specific service
docker-compose -f docker-compose.dev.yml up --build backend

# Clean everything (including volumes)
docker-compose -f docker-compose.dev.yml down -v
docker system prune -a

# Execute command in running container
docker exec -it easypath_backend /bin/sh
```

## Architecture Overview

```
┌─────────────┐
│  Frontend   │  React + Vite (Port 5173)
│   (React)   │
└──────┬──────┘
       │ HTTP/REST
┌──────▼──────┐
│   Backend   │  FastAPI (Port 8000)
│  (FastAPI)  │  - Flow Management
└──────┬──────┘  - User Auth
       │
┌──────▼──────┐
│  PostgreSQL │  (Port 5432)
│  (Database) │  - Flows, Users, Versions
└─────────────┘

       │
┌──────▼──────┐
│   Engine    │  FastAPI (Port 8081)
│  (FastAPI)  │  - Flow Execution
└──────┬──────┘  - LLM Integration
       │
┌──────▼──────┐
│    Redis    │  (Port 6379)
│   (Cache)   │  - Session Storage
└─────────────┘
```

## Support

Having issues? Check:

- ✅ Docker and Docker Compose are installed and running
- ✅ All required ports are available
- ✅ Environment variables are set correctly
- ✅ You have sufficient disk space and RAM

For more help, consult the main `README.md` or check the logs:

```bash
docker-compose -f docker-compose.dev.yml logs
```
