# EasyPath Engine

FastAPI service that executes conversational flows defined in JSON, choosing the next pathway using an LLM and returning message responses. Designed to run statelessly with Redis as an optional session state cache.

## Run locally

1. Create `.env` from `.env.example` and set your API key.
2. Install deps (and optional dev deps for tests):
   ```bash
   pip install -r ../requirements.txt
   pip install -r ../requirements-dev.txt  # for running tests
   ```
3. Run:
   ```bash
   uvicorn app.main:app --reload --port 8081
   ```

## Endpoints

- `GET /health/` → health status
- `GET /health/ping` → pong

## Run tests

From `apps/engine` directory:

```bash
pytest -q
```

This will run unit tests under `tests/unit` and integration tests under `tests/integration`.



