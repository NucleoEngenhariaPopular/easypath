# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EasyPath is a chatbot conversation flow platform designed to streamline and automate messaging interactions (primarily WhatsApp). It follows a microservices architecture with distinct components for flow management and execution.

**Conceptually similar to bland.ai, but focused on text messages rather than voice calls.**

## Architecture

The project consists of three main components:

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
3. `pathway_selector`: Chooses next node via LLM + fuzzy matching
4. `variable_extractor`: Extracts variables from user messages if configured
5. `flow_executor`: Generates assistant response via LLM
6. Updates and persists session, returns response
7. **Emits real-time WebSocket events** for flow visualization (optional)

**Key modules:**
- `app/core/orchestrator.py`: Coordinates conversation steps
- `app/core/pathway_selector.py`: Decides next node using LLM
- `app/core/flow_executor.py`: Generates responses
- `app/core/variable_extractor.py`: Extracts variables from messages
- `app/llm/`: LLM client implementations (DeepSeek, Gemini)
- `app/storage/`: Redis session store and flow repository
- `app/models/flow.py`: Flow schema (Prompt, Node, Connection, Flow, VariableExtraction)

## Running the Project

### Full Stack (Docker Compose)
```bash
# Platform (frontend + backend + postgres)
docker-compose up --build

# Engine (separate compose file)
docker-compose -f docker-compose.engine.yml up --build
```

**Services:**
- Frontend: http://localhost:5173
- Platform Backend: http://localhost:8000
- Engine: http://localhost:8081
- PostgreSQL: port 5432
- Redis: port 6379

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
docker-compose up --build backend
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
- `temperature`: LLM creativity control (default 0.2)
- `use_llm`: Whether to use LLM for response generation
- `skip_user_response`: Auto-advance without user input
- `overrides_global_pathway`: Whether node-level pathway selection overrides global config

See `apps/engine/tests/fixtures/sample_flow.json` for reference.

## Environment Variables

### Engine (.env)
- `LOG_LEVEL`: Logging level (default: INFO)
- `REDIS_URL`: Redis connection (e.g., redis://localhost:6379/0) - optional, runs stateless if not set
- `LLM_PROVIDER`: deepseek or gemini (default: deepseek)
- `DEEPSEEK_API_KEY`: DeepSeek API key
- `GOOGLE_API_KEY`: Google Gemini API key (when using api mode)
- `GEMINI_PROVIDER_MODE`: api or vertex (default: api)
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `GOOGLE_GEMINI_MODEL`: For Vertex AI mode

### Platform Backend (docker-compose.yml)
- `DATABASE_URL`: PostgreSQL connection string
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_JWT_SECRET`: Supabase JWT validation secret

## Key Design Patterns

1. **Separation of Concerns:** Platform backend handles CRUD/auth, Engine handles real-time execution with LLM
2. **Flow as Data:** Conversation flows are declarative JSON (import/export friendly, version-controllable)
3. **Stateless by Default:** Engine can run without Redis, loads session data on-demand
4. **Variable Extraction:** Nodes can define variables to extract from user messages, with required/optional flags
5. **Pathway Selection:** Uses LLM to understand user intent and choose next conversation node, with fuzzy matching validation
6. **Global vs Node Config:** Global flow settings (objective, tone) can be overridden at node level

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
- Variable extraction loops on same node until all required variables are collected
- Token usage and timing information tracked for cost estimation
- **WebSocket events are optional** - engine works normally without active WebSocket connections
