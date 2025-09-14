# EasyPath

EasyPath is a comprehensive project focused on creating and managing chatbot conversation flows, designed to streamline and automate interactions, particularly those originating from platforms like WhatsApp.

## Overview

EasyPath is a web platform to design, run, and manage chatbot conversation flows over text messages. It aims to make it easy to create complex, branching conversational journeys without writing code, then execute those flows reliably in production.

This project is conceptually similar to `bland.ai` but focused exclusively on text (messages) rather than voice calls. See `https://www.bland.ai/` for reference.

## Architecture (current, evolving)

- `apps/platform/`: The platform where users visually design and manage flows.
  - Frontend: React (Vite) UI for building flows and managing projects.
  - Backend: Python FastAPI (planned/under development) to handle CRUD for flows, auth integration, and orchestration APIs.
- `apps/engine/`: The engine that executes flows.
  - Runtime service: Python FastAPI that evaluates the next step in a flow and generates responses.
  - State: Flows are defined as JSON. We are considering Redis as a caching/state layer to track live flow sessions efficiently.

Notes:
- The flow format is defined via a JSON file (import/export friendly), enabling portability and versioning of conversational designs.
- The project is in early development and actively evolving.

## Tech Stack (planned/initial)

- Frontend: React + Vite + TypeScript + MUI + i18n
- Platform Backend: Python FastAPI
- Engine: Python FastAPI
- State/Caching (planned): Redis (for managing running flow session state)

## Como Executar o Projeto Completo

Para executar o projeto completo (frontend, backend e banco de dados), você precisa ter o Docker e o Docker Compose instalados. A partir da raiz do projeto, execute o seguinte comando:

```bash
docker-compose up --build
```

Isso irá construir e iniciar todos os serviços definidos no arquivo `docker-compose.yml`.

- O **Frontend** estará disponível em `http://localhost:5173`.
- O **Backend** estará disponível em `http://localhost:8000`.
- O **PostgreSQL** estará disponível na porta `5432`.