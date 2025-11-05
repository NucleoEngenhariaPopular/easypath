# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EasyPath is a chatbot conversation flow platform designed to streamline and automate messaging interactions (primarily WhatsApp). It follows a microservices architecture with distinct components for flow management and execution.

**Conceptually similar to bland.ai, but focused on text messages rather than voice calls.**

## Architecture

The project consists of four main components:

### 1. Platform Frontend (`apps/platform/frontend`)
- **Tech:** React + Vite + TypeScript + Material UI + @xyflow/react
- **Port:** 5173
- Visual flow builder using `@xyflow/react` for drag-and-drop conversation design
- Dashboard for managing "paths" with folder-based organization
- Supabase authentication integration
- i18n support (English/Portuguese via i18next)
- Theme context for light/dark mode (persisted in localStorage)

**Key components:**
- `CanvasPage`: Visual flow builder with nodes (Start, Normal, End, Request)
- `DashboardPage`: Flow management interface
- `EasyPathAppBar`: Top navigation
- `NodeModal`: Node configuration interface
- `GlobalConfigSidebar`: Path-wide settings

### 2. Platform Backend (`apps/platform/backend`)
- **Tech:** Python FastAPI + PostgreSQL + SQLAlchemy
- **Port:** 8000
- Handles user-facing API requests and authentication (Supabase JWT)
- CRUD operations for flow definitions
- Persists flows to PostgreSQL database

**Database models:**
- `User`: User accounts with email/password
- `Flow`: Flow definitions with JSON data, name, description, owner relationship

### 3. Engine (`apps/engine`)
- **Tech:** Python FastAPI + Redis + LLM providers
- **Port:** 8081
- **Dedicated service for executing active conversation flows in real-time**
- Processes incoming messages via `/chat/message` endpoint
- Manages conversation state in Redis (optional, falls back to stateless)
- LLM orchestration for intelligent responses (DeepSeek or Google Gemini)

**Core workflow:**
1. Receives message via `POST /chat/message` (session_id, flow_path, user_message)
2. Loads/creates session from Redis and reads flow JSON
3. `variable_extractor`: Extracts variables from user messages if configured
4. **Automatic extraction loop**: If required variables missing, stays on current node
5. `loop_evaluator`: Evaluates explicit loop conditions (if `loop_enabled` is true)
6. **Explicit condition loop**: If loop condition met, stays on current node
7. `pathway_selector`: Chooses next node via LLM + fuzzy matching (if not looping)
8. `flow_executor`: Generates assistant response via LLM
9. Updates and persists session, returns response
10. **Emits real-time WebSocket events** for flow visualization (optional)

**Key modules:**
- `app/core/orchestrator.py`: Coordinates conversation steps
- `app/core/pathway_selector.py`: Decides next node using LLM
- `app/core/flow_executor.py`: Generates responses
- `app/core/variable_extractor.py`: Extracts variables from messages
- `app/core/loop_evaluator.py`: Evaluates explicit loop conditions using LLM
- `app/llm/`: LLM client implementations (DeepSeek, Gemini)
- `app/storage/`: Redis session store and flow repository
- `app/models/flow.py`: Flow schema (Prompt, Node, Connection, Flow, VariableExtraction)

### 4. Messaging Gateway (`apps/messaging-gateway`)
- **Tech:** Python FastAPI + PostgreSQL + Telegram Bot API + WebSockets
- **Port:** 8082
- **Bridges messaging platforms (Telegram, WhatsApp) to EasyPath flows**
- Receives webhooks from messaging platforms
- Maps platform users to engine sessions
- Forwards messages to engine for processing
- Returns responses back to messaging platforms via WebSocket streaming

**Core workflow:**
1. Receives webhook from Telegram/WhatsApp (e.g., user sends message)
2. **Returns 200 OK immediately** (prevents platform retries, processes in background)
3. Maps `platform_user_id` → `easypath_session_id` (creates if new user)
4. Fetches flow definition from platform database
5. **Establishes WebSocket connection** to engine for real-time message streaming
6. Triggers engine execution via `POST /chat/message-with-flow`
7. **Streams assistant messages** as they're generated (with typing indicators)
8. Sends each reply to user via platform API (separate messages, not concatenated)
9. Stores conversation history in database
10. **Falls back to HTTP-only mode** if WebSocket fails

**Key features:**
- **Real-time streaming:** Messages delivered as they're generated via WebSocket
- **Typing indicators:** Shows "typing..." while LLM generates responses (auto-stops when done)
- **Background processing:** Webhooks return 200 OK immediately to prevent retries (even on errors)
- **Smart message deduplication:** Time-window based (2 seconds) - allows legitimate repeated messages
- **Old message filtering:** Ignores messages sent before container startup (helpful for testing)
- **Session management:** Reset, close, and delete sessions via REST API
- **Automatic fallback:** Switches to HTTP-only if WebSocket connection fails
- **Batch database commits:** Collects all messages and commits once (better performance)
- **Timeout management:** Resets timeout when messages arrive (no more 90s limit for long conversations)

**Key components:**
- `app/services/telegram.py`: Telegram webhook handler, streaming, and typing indicators
- `app/services/engine_ws_client.py`: WebSocket client for real-time engine communication
- `app/services/engine_client.py`: HTTP client for engine communication (fallback)
- `app/api/webhooks.py`: Webhook endpoints with background processing
- `app/api/bots.py`: REST API for bot management (CRUD operations)
- `app/api/sessions.py`: REST API for session management (reset, close, delete)
- `app/models/bot_config.py`: Database models (BotConfig, PlatformConversation, ConversationMessage)

**Database tables:**
- `bot_configs`: Bot configurations (platform, token, flow_id, owner_id)
- `platform_conversations`: Maps platform users to engine sessions (maintains session_id) - allows multiple conversations per user
- `conversation_messages`: Complete message history for debugging/analytics

**Recent fixes (2025-01-12):**
- ✅ Removed UNIQUE constraint on conversations (session reset now works)
- ✅ Fixed message deduplication (time-based instead of exact match)
- ✅ Fixed streaming timeout (resets on activity)
- ✅ Batch commits for better performance
- ✅ Webhook always returns 200 OK (prevents Telegram retries)

**Session management:**
- **Reset:** Generates new session ID, clears messages, clears engine Redis
- **Close:** Marks session as closed, prevents further message processing
- **Delete:** Permanently removes session and all messages (cascade delete)

**Supported platforms:**
- ✅ **Telegram** (fully implemented with webhooks, streaming, typing indicators)
- 🔄 **WhatsApp** (coming soon via Twilio/Meta Cloud API)
- 🔄 **SMS** (future)

**Security features:**
- Encrypted bot tokens (Fernet encryption)
- HTTPS webhooks (required by Telegram)
- Per-bot webhook secrets (future)

## Running the Project

### Full Development Environment (Recommended)
```bash
# All services: frontend + backend + engine + messaging-gateway + ngrok + postgres + redis

# Linux/macOS
./scripts/dev/start-dev.sh

# Windows PowerShell
.\scripts\dev\start-dev.ps1

# Or manually
docker compose -f docker/docker-compose.dev.yml up --build

# Get ngrok public URL for webhook configuration
./scripts/get-ngrok-url.sh  # Linux/macOS
.\scripts\get-ngrok-url.ps1  # Windows PowerShell
```

**Services:**
- Frontend: http://localhost:5173
- Platform Backend: http://localhost:8000
- Engine: http://localhost:8081
- Messaging Gateway: http://localhost:8082
- PostgreSQL: port 5432
- Redis: port 6379
- ngrok Web Interface: http://localhost:4040

### Individual Services (Docker Compose)
```bash
# Platform only (frontend + backend + postgres)
docker compose -f docker/docker-compose.yml up --build

# Engine only (separate compose file)
docker compose -f docker/docker-compose.engine.yml up --build

# Messaging Gateway only (includes postgres + engine + redis)
docker compose -f docker/docker-compose.messaging.yml up --build
```

### Frontend Development
```bash
cd apps/platform/frontend
npm run dev      # Start dev server (Vite)
npm run build    # TypeScript compile + build
npm run lint     # ESLint
npm run preview  # Preview production build
```

### Platform Backend Development
```bash
cd apps/platform/backend
docker compose -f docker/docker-compose.yml up --build backend
# Backend runs via Docker, check README.md for local setup
```

### Engine Development
```bash
cd apps/engine

# Setup virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For testing

# Setup .env from .env.example
# Configure LLM provider (deepseek or gemini)
$env:LLM_PROVIDER = "deepseek"
$env:DEEPSEEK_API_KEY = "your-key"
$env:LOG_LEVEL = "INFO"
$env:REDIS_URL = "redis://localhost:6379/0"

# Run local Redis (optional, for session persistence)
docker run --name easypath-redis -p 6379:6379 -d redis:7-alpine

# Start engine
uvicorn app.main:app --reload --port 8081
```

### Running Engine Tests
```bash
cd apps/engine

# Run all tests
pytest -q

# Unit tests only (fast, no external deps)
pytest -q tests/unit

# Integration tests (requires Redis)
pytest -q tests/integration

# Filter specific tests
pytest -q -k "test_name"
```

**Test categories:**
- **Unit tests:** Isolated domain logic, LLM calls mocked, fast and deterministic
- **Integration tests:** HTTP API via TestClient, requires Redis, validates component integration

### Messaging Gateway Development
```bash
cd apps/messaging-gateway

# Setup virtual environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Setup .env from .env.example
# Generate encryption key:
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Set environment variables
$env:SECRET_KEY = "your-fernet-key-from-above"
$env:DATABASE_URL = "postgresql://user:password@localhost:5432/easypath"
$env:ENGINE_API_URL = "http://localhost:8081"
$env:WEBHOOK_BASE_URL = "https://your-ngrok-url.ngrok-free.app"

# Run database migrations (first time only)
docker exec -i easypath_postgres psql -U user -d easypath < migrations/001_create_bot_tables.sql
docker exec -i easypath_postgres psql -U user -d easypath < migrations/002_add_status_column.sql
docker exec -i easypath_postgres psql -U user -d easypath < migrations/003_remove_unique_constraint.sql

# Start messaging gateway
uvicorn app.main:app --reload --port 8082
```

**Quick Telegram Setup (5 minutes):**
1. Copy `apps/messaging-gateway/.env.example` to `apps/messaging-gateway/.env`
2. Get bot token from [@BotFather](https://t.me/BotFather) and add to `.env`
3. Start dev environment: `docker compose -f docker/docker-compose.dev.yml up`
4. Register bot: `./scripts/register-telegram-bot.sh` (or `.ps1` on Windows)
5. Send message to your bot on Telegram - flow executes automatically!

**Alternative (command-line):**
```bash
./scripts/register-telegram-bot.sh YOUR_BOT_TOKEN 1 user-123 "My Bot"
```

See `TELEGRAM_QUICKSTART.md` for detailed setup guide.

## Flow Definition Format

Flows are defined as JSON files following the schema in `apps/engine/app/models/flow.py`:

**Key entities:**
- `Flow`: Contains nodes, connections, global config (objective, tone, language, behaviour, values)
- `Node`: Has id, type, prompt (context/objective/notes/examples), LLM settings, variable extraction config
- `Connection`: Links nodes with label/description (used by pathway selector)
- `VariableExtraction`: Defines variables to extract from user messages (name, description, required flag)
- `Prompt`: Context, objective, notes, examples for LLM generation

**Important node properties:**
- `extract_vars`: List of variables to extract from user input
- `loop_enabled`: Enable explicit loop condition evaluation (default false)
- `loop_condition`: Natural language description of when to loop (requires `loop_enabled: true`)
- `temperature`: LLM creativity control (default 0.2)
- `use_llm`: Whether to use LLM for response generation
- `skip_user_response`: Auto-advance without user input
- `overrides_global_pathway`: Whether node-level pathway selection overrides global config

See `apps/engine/tests/fixtures/sample_flow.json` and `apps/engine/tests/fixtures/math_quiz_flow.json` for reference.

## Environment Variables

### Root .env (Global Configuration)
Copy `.env.example` to `.env` and configure:

```bash
# Engine LLM Providers
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=your-deepseek-api-key
GOOGLE_API_KEY=your-google-api-key

# Platform Backend
SUPABASE_URL=your-supabase-project-url
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

### Engine (apps/engine/.env)
- `LOG_LEVEL`: Logging level (default: INFO)
- `REDIS_URL`: Redis connection (e.g., redis://localhost:6379/0) - optional, runs stateless if not set
- `LLM_PROVIDER`: deepseek or gemini (default: deepseek)
- `DEEPSEEK_API_KEY`: DeepSeek API key
- `GOOGLE_API_KEY`: Google Gemini API key (when using api mode)
- `GEMINI_PROVIDER_MODE`: api or vertex (default: api)
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_GEMINI_MODEL`: For Vertex AI mode

### Messaging Gateway (apps/messaging-gateway/.env)
Copy `apps/messaging-gateway/.env.example` to `apps/messaging-gateway/.env` and configure:

- `SECRET_KEY`: Fernet key for bot token encryption (generate with: `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`)
- `WEBHOOK_BASE_URL`: Public HTTPS URL for webhooks (your ngrok URL in dev, or production domain)
- `NGROK_AUTHTOKEN`: ngrok authentication token from https://dashboard.ngrok.com (free account works for development)
- `DATABASE_URL`: PostgreSQL connection string (default: postgresql://user:password@localhost:5432/easypath)
- `ENGINE_API_URL`: Engine service URL (default: http://localhost:8081)
- `TELEGRAM_BOT_TOKEN`: Bot token from @BotFather (for use with register script)
- `FLOW_ID`: Flow ID to connect to bot (default: 1)
- `OWNER_ID`: Owner ID for bot (default: user-123)
- `BOT_NAME`: Display name for bot

**Note:** When using docker-compose.dev.yml, the ngrok and messaging-gateway services automatically load from this `.env` file.

### Platform Backend (docker-compose.yml)
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_JWT_SECRET`: Supabase JWT validation secret

## Loop Functionality

The engine supports **two complementary types of loops** that allow nodes to repeat until certain conditions are met:

### 1. Automatic Variable Extraction Loop
- **Trigger:** Node has `extract_vars` with `required: true` variables
- **Behavior:** Stays on current node until all required variables are extracted
- **Cost:** Free (no additional LLM calls)
- **Use Case:** Collecting user information (name, email, age, etc.)

**Example:**
```json
{
  "id": "collect-name",
  "extract_vars": [
    {
      "name": "user_name",
      "description": "User's full name",
      "required": true
    }
  ]
}
```

### 2. Explicit Loop Condition (LLM-Based)
- **Trigger:** Node has `loop_enabled: true` and `loop_condition` set
- **Behavior:** LLM evaluates natural language condition, returns "LOOP" or "PROCEED"
- **Cost:** ~$0.00001-0.0001 per evaluation (~40-100 tokens)
- **Use Case:** Answer validation, quiz questions, conditional logic

**Example:**
```json
{
  "id": "quiz-question",
  "loop_enabled": true,
  "loop_condition": "Continue asking until user answers '10' or 'dez'. Give hints if wrong.",
  "prompt": {
    "objective": "Ask 'What is 5 + 5?' and validate the answer"
  }
}
```

### Execution Order

When both loop types are configured on the same node:

1. **Variable Extraction Loop** (checked first)
   - If required variables missing → loop (stay on node)
   - If all required variables present → continue to step 2

2. **Explicit Loop Condition** (checked second)
   - Only evaluated if all required variables are present
   - LLM evaluates `loop_condition` against conversation history
   - If condition returns "LOOP" → loop (stay on node)
   - If condition returns "PROCEED" → continue to step 3

3. **Pathway Selection** (only if not looping)
   - Choose next node based on connections

### Safety Features

- **Safe Fallback:** LLM errors or unclear responses default to "PROCEED" (prevents infinite loops)
- **Empty Condition Ignored:** If `loop_condition` is empty string, loop is skipped
- **Disabled by Default:** `loop_enabled` defaults to `false`
- **Comprehensive Logging:** All loop evaluations logged with reasoning

### Performance Metrics

Loop evaluation metrics are tracked in response timing data:
- `loop_evaluation_tokens`: Input/output/total tokens used
- `loop_evaluation_time`: Execution time in seconds
- `loop_evaluation_model`: Model used for evaluation (e.g., "deepseek-chat")
- `loop_evaluation_cost_usd`: Estimated cost

Frontend displays loop evaluation stats in Test Mode when tokens > 0.

### Example Use Cases

**Quiz/Test Questions:**
```json
{
  "id": "math-question",
  "loop_enabled": true,
  "loop_condition": "Repeat until answer is 'Paris'",
  "prompt": {
    "objective": "Ask: What is the capital of France?"
  }
}
```

**Age Validation:**
```json
{
  "id": "verify-age",
  "loop_enabled": true,
  "loop_condition": "Continue until user_age >= 18",
  "extract_vars": [{"name": "user_age", "required": true}]
}
```

**See `apps/engine/tests/fixtures/math_quiz_flow.json` for a complete example with 3 progressive questions.**

## Key Design Patterns

1. **Separation of Concerns:** Platform backend handles CRUD/auth, Engine handles real-time execution with LLM
2. **Flow as Data:** Conversation flows are declarative JSON (import/export friendly, version-controllable)
3. **Stateless by Default:** Engine can run without Redis, loads session data on-demand
4. **Variable Extraction:** Nodes can define variables to extract from user messages, with required/optional flags
5. **Loop Control:** Two complementary loop mechanisms (automatic extraction + explicit conditions)
6. **Pathway Selection:** Uses LLM to understand user intent and choose next conversation node, with fuzzy matching validation
7. **Global vs Node Config:** Global flow settings (objective, tone) can be overridden at node level

## Real-Time Flow Visualization (WebSocket)

The engine supports **real-time WebSocket connections** for live flow visualization in the frontend. When a client connects, the engine streams events as the conversation executes.

### WebSocket Endpoint
- **URL:** `ws://localhost:8081/ws/session/{session_id}?flow_id={flow_id}`
- **Protocol:** WebSocket
- **Authentication:** None (add as needed)

### Event Types
The engine emits the following event types during flow execution:

| Event Type | Description | Key Fields |
|------------|-------------|------------|
| `session_started` | Session initialized | `flow_id`, `flow_name` |
| `user_message` | User sent a message | `message`, `current_node_id` |
| `node_entered` | Flow enters a node | `node_id`, `node_type`, `node_name` |
| `node_exited` | Flow exits a node | `node_id`, `node_type` |
| `pathway_selected` | Next node chosen | `from_node_id`, `to_node_id`, `connection_label` |
| `variable_extracted` | Variable extracted from user input | `variable_name`, `variable_value`, `all_variables` |
| `response_generated` | LLM generated response | `response_text`, `tokens_used` |
| `assistant_message` | Assistant sends message | `message`, `node_id` |
| `error` | Error occurred | `error_message`, `error_type` |

### Frontend Integration
**Hook:** `useFlowWebSocket` (`apps/platform/frontend/src/hooks/useFlowWebSocket.ts`)

```typescript
const { isConnected, lastEvent, executionState } = useFlowWebSocket({
  sessionId: 'abc123',
  flowId: 'flow-1',
  onEvent: (event) => console.log(event.event_type, event),
  enabled: true
});
```

### Backend Components

- `app/models/ws_events.py`: Event schema definitions (Pydantic models)
- `app/ws/manager.py`: WebSocket connection manager (handles multiple clients per session)
- `app/ws/emitter.py`: Event emitter utility (used by orchestrator) - uses asyncio.create_task for safe emission
- `app/api/routes/ws.py`: WebSocket endpoint handler with ping/pong heartbeat (30s interval)

**Recent improvements (2025-01-12):**

- ✅ Fixed async event emission (removed dangerous asyncio.run calls)
- ✅ Added ping/pong heartbeat for connection health monitoring
- ✅ Proper cleanup with try/finally blocks
- ✅ Better timeout handling and error logging

### How It Works
1. Frontend connects to `/ws/session/{session_id}`
2. Backend sends current `FlowExecutionState` on connection
3. As conversation executes, orchestrator emits events via `EventEmitter`
4. `ConnectionManager` broadcasts events to all connected clients for that session
5. Frontend receives events and updates UI (highlights nodes, shows transitions, displays variables)

### Use Cases
- **Test/Preview Mode:** Visualize flow execution in real-time during testing
- **Debugging:** Watch flow progression, variable extraction, and LLM responses
- **Live Monitoring:** Observe active conversations in production
- **Training:** Demonstrate how flows work to team members

## Development Notes

- Frontend uses Vite proxy to route `/api/*` requests to backend (port 8000)
- Engine is designed for independent scaling (can use GPU hardware for LLM inference)
- Tests mock LLM calls for reproducibility
- Flow definitions include connection descriptions to help LLM pathway selection
- **Two loop types:**
  - Automatic variable extraction loops (free, instant)
  - Explicit condition loops (LLM-based, flexible)
- Loop conditions are written in natural language and evaluated by LLM
- Loops stay on the same node (no visual loop-back connections needed)
- Token usage and timing information tracked for cost estimation (including loop evaluation)
- **WebSocket events are optional** - engine works normally without active WebSocket connections

## Troubleshooting

### Telegram Bot Not Responding

1. **Check bot is registered:**

   ```bash
   # Query the database
   docker exec -it easypath_postgres psql -U user -d easypath -c "SELECT id, platform, bot_name, is_active FROM bot_configs;"
   ```

2. **Check webhook is set:**

   ```bash
   # Get webhook info
   curl -X GET "http://localhost:8082/api/bots/{bot_id}/webhook-info"
   ```

3. **Check logs:**

   ```bash
   # Messaging gateway logs
   docker logs -f easypath_messaging_gateway

   # Engine logs
   docker logs -f easypath_engine
   ```

4. **Verify ngrok is running:**

   ```bash
   # Check ngrok status
   curl http://localhost:4040/api/tunnels
   ```

### Database Migration Issues

**Problem:** "relation already exists" or "constraint already exists"

**Solution:** Check which migrations have been applied:

```bash
# Check if tables exist
docker exec -it easypath_postgres psql -U user -d easypath -c "\dt"

# Check indexes
docker exec -it easypath_postgres psql -U user -d easypath -c "\di"

# If unique constraint exists, run migration 003
docker exec -i easypath_postgres psql -U user -d easypath < apps/messaging-gateway/migrations/003_remove_unique_constraint.sql
```

### Session Reset Not Working

**Problem:** "IntegrityError: duplicate key value violates unique constraint"

**Solution:** This was fixed in migration 003. Run the migration:

```bash
docker exec -i easypath_postgres psql -U user -d easypath < apps/messaging-gateway/migrations/003_remove_unique_constraint.sql
```

### WebSocket Connection Issues

**Problem:** WebSocket events not appearing, connection drops

**Solution:**

1. Check engine logs for "WebSocket connected" messages
2. Verify ping/pong heartbeat every 30 seconds
3. Check browser console for WebSocket errors
4. Ensure no firewall blocking WebSocket connections

### Long Conversations Timing Out

**Problem:** Bot stops responding after 90 seconds

**Solution:** This was fixed on 2025-01-12. The timeout now resets when messages arrive. Update to latest code:

```bash
git pull
docker compose -f docker/docker-compose.dev.yml up --build
```

### Duplicate Messages

**Problem:** Same message sent multiple times by bot

**Solution:** This was fixed with time-window deduplication (2 seconds). Update to latest code.

### Engine Not Connecting to LLM

**Problem:** "API key not found" or LLM errors

**Solution:**

1. Check `.env` file in `apps/engine/`:

   ```bash
   cat apps/engine/.env
   ```

2. Verify API key is set:
   - For DeepSeek: `DEEPSEEK_API_KEY=sk-...`
   - For Gemini: `GOOGLE_API_KEY=...`

3. Restart engine:

   ```bash
   docker compose -f docker/docker-compose.dev.yml restart engine
   ```

### Performance Issues

**Problem:** Slow message processing, high database load

**Solutions:**

- ✅ Batch commits enabled (2025-01-12 fix)
- Check database connection pool settings
- Monitor Redis memory usage
- Check LLM API latency

### Viewing Logs in Real-Time

```bash
# All services
docker compose -f docker/docker-compose.dev.yml logs -f

# Specific service
docker logs -f easypath_messaging_gateway
docker logs -f easypath_engine
docker logs -f easypath_backend

# Filter for errors only
docker logs easypath_messaging_gateway 2>&1 | grep -i error
```

### Resetting Everything

**Complete reset (WARNING: deletes all data):**

```bash
# Stop all containers
docker compose -f docker/docker-compose.dev.yml down

# Remove volumes (deletes database and redis data)
docker volume rm easypath-dev_postgres_data easypath-dev_redis_data

# Rebuild and start fresh
docker compose -f docker/docker-compose.dev.yml up --build
```

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| "Bot not found or inactive" | Bot not registered or is_active=false | Register bot or update is_active in database |
| "Flow configuration not found" | flow_id doesn't exist | Create flow in platform or update bot's flow_id |
| "Could not emit WebSocket event" | No WebSocket clients connected | Normal - WebSocket is optional |
| "WebSocket timeout" | No activity for 40+ seconds | Normal - connection will retry or timeout gracefully |
| "Failed to commit messages" | Database connection issue | Check PostgreSQL is running and accessible |
| "Engine request timed out" | LLM taking too long | Check LLM API status, increase timeout if needed |
