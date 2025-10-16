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
- **Tech:** Python FastAPI + PostgreSQL + Telegram Bot API
- **Port:** 8082
- **Bridges messaging platforms (Telegram, WhatsApp) to EasyPath flows**
- Receives webhooks from messaging platforms
- Maps platform users to engine sessions
- Forwards messages to engine for processing
- Returns responses back to messaging platforms

**Core workflow:**
1. Receives webhook from Telegram/WhatsApp (e.g., user sends message)
2. Maps `platform_user_id` → `easypath_session_id` (creates if new user)
3. Fetches flow definition from platform database
4. Forwards message to engine via `POST /chat/message-with-flow`
5. Receives engine response (assistant reply)
6. Sends reply back to user via platform API
7. Stores conversation history in database

**Key components:**
- `app/services/telegram.py`: Telegram webhook handler and message forwarding
- `app/services/engine_client.py`: Client for communicating with engine
- `app/api/webhooks.py`: Webhook endpoints for each platform
- `app/api/bots.py`: REST API for bot management (CRUD operations)
- `app/models/bot_config.py`: Database models (BotConfig, PlatformConversation, ConversationMessage)

**Database tables:**
- `bot_configs`: Bot configurations (platform, token, flow_id, owner_id)
- `platform_conversations`: Maps platform users to engine sessions
- `conversation_messages`: Complete message history for debugging/analytics

**Supported platforms:**
- ✅ **Telegram** (fully implemented with webhooks)
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
docker compose -f docker/docker-compose.dev.yml up --build

# Get ngrok public URL for webhook configuration
./scripts/get-ngrok-url.sh  # Linux/macOS
# or
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

# Run database migration (first time only)
docker exec -i easypath_postgres psql -U user -d easypath < migrations/001_create_bot_tables.sql

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
- `app/ws/emitter.py`: Event emitter utility (used by orchestrator)
- `app/api/routes/ws.py`: WebSocket endpoint handler

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
