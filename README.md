# EasyPath 🤖💬

> **Visual conversation flow builder for intelligent WhatsApp chatbots powered by AI**

EasyPath is a comprehensive platform for creating, testing, and deploying AI-powered chatbot conversation flows. Design complex conversational experiences visually, test them in real-time, and deploy them to WhatsApp and other messaging platforms.

**Conceptually similar to [bland.ai](https://www.bland.ai/) but focused on text messages rather than voice calls.**

![EasyPath Demo](https://via.placeholder.com/800x400?text=EasyPath+Flow+Builder)

## ✨ Key Features

### 🎨 Visual Flow Builder
- **Drag-and-drop interface** powered by ReactFlow
- **Multiple node types**: Start, Normal, End, Request, Extraction, Validation, and more
- **Real-time canvas** with auto-layout and minimap
- **Import/Export flows** as JSON for version control

### 🧪 Test Mode with Real-Time Visualization
- **Live flow execution** - watch your chatbot work in real-time
- **WebSocket-powered** node highlighting and transition animations
- **Chat interface** built-in for instant testing
- **Performance metrics** - track response time, tokens, and costs
- **Variable tracking** - see extracted data as conversations progress

### 🤖 AI-Powered Intelligence
- **LLM-driven pathway selection** - automatically chooses next conversation step based on user intent
- **Smart variable extraction** - pulls structured data from natural language
- **Dual loop system** - automatic extraction loops + explicit condition loops for validation
- **Multi-model support** - DeepSeek and Google Gemini
- **Configurable per-node** - different models for different steps

### 📊 Advanced Features
- **Automatic extraction loops** - stays on node until required variables are collected (free, instant)
- **Explicit condition loops** - LLM-based validation for quizzes, tests, and conditional logic
- **Global and node-level prompts** - fine-tune responses at every level
- **Session management** - Redis-backed state persistence
- **Multi-language support** - English and Portuguese (i18n ready)
- **Cost tracking** - monitor token usage and LLM costs in real-time (including loop evaluation)

## 🏗️ Architecture

EasyPath follows a **microservices architecture** with three main components:

```
┌─────────────────────────────────────────────────────────┐
│                  PLATFORM FRONTEND                      │
│                                                         │
│  React + Vite + TypeScript + MUI + ReactFlow          │
│  • Visual flow builder                                 │
│  • Dashboard & folder organization                     │
│  • Real-time test mode with WebSocket                 │
│  • Performance analytics                               │
│                                                         │
│  Port: 5173                                           │
└──────────────────┬──────────────────────────────────────┘
                   │
                   │ REST API
                   ▼
┌─────────────────────────────────────────────────────────┐
│                 PLATFORM BACKEND                        │
│                                                         │
│  Python FastAPI + PostgreSQL + SQLAlchemy              │
│  • User authentication (Supabase)                      │
│  • Flow CRUD operations                                │
│  • Flow persistence                                    │
│                                                         │
│  Port: 8000                                            │
└─────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────┐
│                     ENGINE                              │
│                                                         │
│  Python FastAPI + Redis + LLM Providers                │
│  • Real-time flow execution                            │
│  • LLM orchestration (pathway + response)              │
│  • Session state management                            │
│  • WebSocket event streaming                           │
│                                                         │
│  Port: 8081                                            │
└─────────────────────────────────────────────────────────┘
```

### Component Details

#### **1. Platform Frontend** (`apps/platform/frontend`)
- **Tech:** React, Vite, TypeScript, Material UI, ReactFlow
- **Purpose:** Visual flow builder and management dashboard
- **Features:**
  - Drag-and-drop flow canvas with auto-layout
  - Test mode with real-time visualization
  - Performance metrics dashboard
  - Multi-language support (i18n)
  - Dark/light theme

#### **2. Platform Backend** (`apps/platform/backend`)
- **Tech:** Python FastAPI, PostgreSQL, SQLAlchemy
- **Purpose:** API server for flow management and authentication
- **Features:**
  - Supabase authentication integration
  - Flow CRUD operations with folder organization
  - User management
  - Flow versioning support

#### **3. Engine** (`apps/engine`)
- **Tech:** Python FastAPI, Redis, LLM providers
- **Purpose:** Real-time flow execution engine
- **Features:**
  - LLM-powered pathway selection
  - Smart variable extraction with automatic loops
  - Explicit loop conditions for validation and quizzes
  - WebSocket event streaming
  - Multi-model support (DeepSeek, Gemini)
  - Cost and performance tracking (including loop evaluation)

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Python 3.11+ (for local development)
- Node.js 18+ (for frontend development)

### Run Everything with Docker

```bash
# 1. Clone the repository
git clone <repository-url>
cd easypath

# 2. Start Platform (Frontend + Backend + PostgreSQL)
docker-compose up --build

# 3. Start Engine (in a separate terminal)
docker-compose -f docker-compose.engine.yml up --build
```

**Services will be available at:**
- Frontend: http://localhost:5173
- Platform Backend: http://localhost:8000
- Engine: http://localhost:8081
- PostgreSQL: port 5432
- Redis: port 6379

### Environment Setup

#### Engine (.env)
Create `apps/engine/.env` from `.env.example`:

```bash
# LLM Provider
LLM_PROVIDER=gemini  # or deepseek
GOOGLE_API_KEY=your-api-key-here
# DEEPSEEK_API_KEY=your-api-key-here

# Optional Redis for session persistence
REDIS_URL=redis://localhost:6379/0

# Logging
LOG_LEVEL=INFO
```

#### Platform Backend
Environment variables are configured in `docker-compose.yml`:
- Database connection
- Supabase authentication settings

## 📚 Tutorials

### Creating Your First Flow

1. **Start the Platform**
   ```bash
   docker-compose up
   ```

2. **Access the Dashboard**
   - Open http://localhost:5173
   - Create a new flow or use a template

3. **Build Your Flow**
   - Drag nodes from the toolbar onto the canvas
   - Connect nodes by dragging from one node's handle to another
   - Configure each node by clicking on it
   - Set global flow settings in the left sidebar

4. **Test Your Flow**
   - Click the "Test" button in the toolbar
   - Chat with your bot in the test panel
   - Watch nodes light up as the flow executes
   - Monitor performance stats in real-time

5. **Save and Export**
   - Click "Save" to persist your flow
   - Use "Export" to download JSON for version control

### Using Test Mode

Test mode provides a **live chat interface** with **real-time visualization**:

1. **Start Test Mode**
   - Click the "Test" button on the canvas toolbar
   - A chat panel opens on the right side

2. **Interact with Your Bot**
   - Type messages in the input field
   - See your messages appear instantly
   - Watch the typing indicator while the bot thinks
   - Read bot responses as they stream in

3. **Real-Time Visualization**
   - **Active nodes** pulse with a green glow
   - **Transitions** animate along edges
   - **Variables** display in the panel as they're extracted
   - **Current node** highlighted on canvas

4. **Performance Metrics**
   - Expand "Performance Stats" to see:
   - Last message breakdown (pathway selection + response generation)
   - Token usage (input/output split)
   - Response times
   - LLM costs in real-time
   - Conversation totals

### Configuring Node Types

#### **Start Node**
- Entry point of your flow
- Only one per flow
- No configuration needed

#### **Normal Node**
- Standard conversational node
- Configure:
  - Prompt (what the bot should say/do)
  - LLM model and temperature
  - Whether to wait for user response
  - Loop conditions for validation (optional)

#### **Extraction Node**
- Extracts structured data from user messages
- Configure:
  - Variable name and description
  - Required vs optional
  - Automatic retry logic for missing variables
  - Additional validation loops (optional)

#### **End Node**
- Terminates the conversation
- Can have a final message

#### **Request Node**
- Asks user for specific information
- Validates responses

### Variable Extraction

Variables let you capture structured information from natural language:

```javascript
// Example: Extract address components
{
  "extract_vars": [
    {
      "name": "user_street",
      "description": "Street name and number",
      "required": true
    },
    {
      "name": "user_city",
      "description": "City name",
      "required": true
    },
    {
      "name": "user_zipcode",
      "description": "ZIP/postal code",
      "required": false
    }
  ]
}
```

The engine will:
1. Use LLM to extract variables from user message
2. Store in session state
3. **Automatic loop** if required variables are missing (stays on same node)
4. Continue flow once all required variables collected

### Loop Functionality

EasyPath supports **two types of loops** for powerful conversation control:

#### **1. Automatic Extraction Loops** (Free, Instant)
- Automatically stays on a node until all required variables are collected
- No additional LLM calls or cost
- Perfect for data collection

#### **2. Explicit Condition Loops** (LLM-Based, Flexible)
- Custom validation logic written in natural language
- LLM evaluates conditions and decides to loop or proceed
- Perfect for quizzes, answer validation, and conditional logic

**Example: Quiz Question with Loop**
```json
{
  "id": "quiz-question",
  "loop_enabled": true,
  "loop_condition": "Continue asking until user answers 'Paris'. Give hints if wrong.",
  "prompt": {
    "objective": "Ask: What is the capital of France?"
  }
}
```

**Flow:**
- User: "London" → Bot: "Not correct, try again!" (loops)
- User: "Berlin" → Bot: "Still wrong..." (loops)
- User: "Paris" → Bot: "Correct!" (proceeds to next node)

See `apps/engine/tests/fixtures/math_quiz_flow.json` for a complete example with 3 progressive math questions.

**See `apps/engine/README.md` for detailed loop documentation.**

## 🧪 Development

### Frontend Development

```bash
cd apps/platform/frontend
npm install
npm run dev  # Start dev server
npm run build  # Production build
npm run lint  # Run ESLint
```

### Backend Development

```bash
cd apps/platform/backend
# Use Docker Compose for easiest setup
docker-compose up --build backend
```

### Engine Development

```bash
cd apps/engine

# Create virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows
# source .venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For testing

# Run tests
pytest -v  # All tests
pytest tests/unit -v  # Unit tests only
pytest tests/integration -v  # Integration tests

# Start engine
uvicorn app.main:app --reload --port 8081
```

See `apps/engine/README.md` for detailed testing guide.

## 📦 Project Structure

```
easypath/
├── apps/
│   ├── platform/
│   │   ├── frontend/          # React + Vite UI
│   │   │   ├── src/
│   │   │   │   ├── components/canvas/  # Flow builder components
│   │   │   │   ├── hooks/     # useFlowWebSocket, etc
│   │   │   │   ├── pages/     # CanvasPage, DashboardPage
│   │   │   │   └── utils/     # Flow converters, helpers
│   │   │   └── public/locales/  # i18n translations
│   │   └── backend/           # FastAPI + PostgreSQL
│   │       ├── app/
│   │       │   ├── models/    # SQLAlchemy models
│   │       │   ├── routes/    # API endpoints
│   │       │   └── auth/      # Supabase integration
│   │       └── alembic/       # Database migrations
│   └── engine/               # Flow execution engine
│       ├── app/
│       │   ├── core/         # Orchestrator, pathway selector, executor
│       │   ├── llm/          # LLM providers (DeepSeek, Gemini)
│       │   ├── models/       # Flow schema, events
│       │   ├── ws/           # WebSocket manager & emitter
│       │   ├── storage/      # Redis session store
│       │   └── api/routes/   # REST + WebSocket endpoints
│       └── tests/
│           ├── unit/         # Fast, isolated tests
│           └── integration/  # E2E API tests
├── CLAUDE.md                 # AI assistant guidance
└── docker-compose.yml        # Full stack orchestration
```

## 🔧 API Reference

### Engine Endpoints

#### `POST /chat/message-with-flow`
Execute a conversation step with flow definition in request body.

```bash
curl -X POST http://localhost:8081/chat/message-with-flow \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "session-123",
    "user_message": "Hello!",
    "flow": { /* flow definition */ }
  }'
```

#### `WebSocket /ws/session/{session_id}`
Real-time flow execution events.

```javascript
const ws = new WebSocket('ws://localhost:8081/ws/session/session-123?flow_id=flow-1');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log(data.event_type, data);
};
```

**Event types:** `session_started`, `node_entered`, `node_exited`, `pathway_selected`, `variable_extracted`, `response_generated`, `assistant_message`, `error`

See [CLAUDE.md](CLAUDE.md) for detailed API documentation.

## 🛣️ Roadmap

### In Progress
- [ ] WhatsApp integration
- [ ] Conditional node type
- [ ] API integration nodes

### Planned
- [ ] Flow templates library
- [ ] Advanced debugging tools
- [ ] Multi-channel support (Telegram, Instagram)
- [ ] Analytics dashboard
- [ ] Team collaboration features
- [ ] Flow versioning and rollback

See issues for detailed roadmap.

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

[Add your license here]

## 🙏 Acknowledgments

- Built with [ReactFlow](https://reactflow.dev/) for the visual flow builder
- LLM providers: [DeepSeek](https://www.deepseek.com/) and [Google Gemini](https://deepmind.google/technologies/gemini/)
- Inspired by [bland.ai](https://www.bland.ai/)

---

Made with ❤️ by the EasyPath team
