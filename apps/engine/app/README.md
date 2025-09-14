# EasyPath Engine

FastAPI service that executes conversational flows defined in JSON, choosing the next pathway using an LLM and returning message responses. Designed to run statelessly with Redis as an optional session state cache.

## Run locally

1. Create `.env` from `.env.example` and set your API key.
2. Install deps:
   ```bash
   pip install -r ../requirements.txt
   ```
3. Run:
   ```bash
   uvicorn app.main:app --reload --port 8081
   ```

## Endpoints

- `GET /health/` → health status
- `GET /health/ping` → pong


