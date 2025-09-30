# EasyPath Engine

FastAPI service that executes conversational flows defined in JSON, choosing the next pathway using an LLM and returning message responses. Designed to run statelessly with Redis as an optional session state cache.

## Quick Start with Docker (Recommended for Development)

From the project root, use the dedicated Engine compose file:

```bash
docker-compose -f docker-compose.engine.yml up --build
```

This will start:
- **Engine**: `http://localhost:8081` with auto-reload on code changes
- **Redis**: `localhost:6379` for session state

## Run locally (Manual Setup)

1. Create `.env` from `.env.example` and set your API key.
2. Install deps (and optional dev deps for tests):
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt  # for running tests
   ```
3. Start Redis (optional but recommended):
   ```bash
   docker run --name easypath-redis -p 6379:6379 -d redis:7-alpine
   ```
4. Run:
   ```bash
   uvicorn app.main:app --reload --port 8081
   ```

## Endpoints

- `GET /health/` → health status
- `GET /health/ping` → pong
- `POST /chat/message` → process user message through flow
- `GET /flow/load?file_path=...` → load and return flow JSON

## Testing with Postman

### Chat Message Examples:

**Basic greeting flow:**
```http
POST http://localhost:8081/chat/message
Content-Type: application/json

{
  "session_id": "test-session-123",
  "flow_path": "/app/fixtures/greeting_flow.json",
  "user_message": "Hello!"
}
```

**Variable extraction flow (recommended for testing):**
```http
POST http://localhost:8081/chat/message
Content-Type: application/json

{
  "session_id": "extraction-test-001",
  "flow_path": "/app/fixtures/simple_extraction_flow.json",
  "user_message": "Olá!"
}
```

Expected flow: Welcome → Ask Name → Extract Name → Ask Location → Extract Location → Recommendations → Farewell

### FlowPath Format:
- **In Docker**: Use container paths like `/app/fixtures/greeting_flow.json`
- **Local**: Use absolute paths like `C:\path\to\your\flow.json`

Available test flows:
- `/app/fixtures/greeting_flow.json` - Simple greeting and name collection
- `/app/fixtures/sample_flow.json` - More complex example
- `/app/fixtures/simple_extraction_flow.json` - **RECOMMENDED** - Simple variable extraction flow collecting user name and location
- `/app/fixtures/address_extraction_flow.json` - Advanced flow with detailed address extraction and recommendations

## Run tests

From `apps/engine` directory:

```bash
pytest -q
```

This will run unit tests under `tests/unit` and integration tests under `tests/integration`.

## Environment Variables

Key variables for `.env`:
- `LLM_PROVIDER` - `deepseek` or `gemini`
- `DEEPSEEK_API_KEY` - Your DeepSeek API key
- `GOOGLE_API_KEY` - Your Google API key (for Gemini)
- `REDIS_URL` - Redis connection string (default: `redis://localhost:6379/0`)
- `LOG_LEVEL` - Logging level (default: `INFO`)



