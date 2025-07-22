# Gemini Project: EasyPath

This document provides context for the Gemini AI assistant to understand and effectively assist with the EasyPath project.

## 1. Project Overview

EasyPath is a comprehensive platform for designing, managing, and deploying chatbot conversation flows. It is specifically architected to handle interactions from messaging services like WhatsApp, enabling users to visually construct and automate complex conversational experiences.

## 2. Architecture

The project follows a microservices-based architecture, separating the web-facing application from the resource-intensive conversation processing engine.

### 2.1. Backend

The backend is composed of two distinct Python-based services:

#### a. Flow Management Service (`apps/platform/backend`)

-   **Framework:** FastAPI
-   **Responsibilities:**
    -   Handles all user-facing API requests.
    -   Manages user authentication and authorization.
    -   Provides CRUD (Create, Read, Update, Delete) operations for conversation flow definitions.
    -   Persists flow data to a primary database.
-   **Purpose:** This service is optimized for standard web traffic and database interactions, ensuring the core platform remains responsive and scalable.

#### b. LLM Orchestration Service (`apps/engine`)

-   **Framework:** Python (specific framework not detailed, but likely a lightweight one).
-   **Responsibilities:**
    -   Executes "active" conversation flows in real-time.
    -   Processes incoming messages from end-users (e.g., via a WhatsApp webhook).
    -   Manages the state of ongoing conversations, using a Redis database for high-speed, low-latency access.
    -   Interfaces with Large Language Models (LLMs) to generate intelligent and dynamic responses.
-   **Purpose:** This service is designed to be a dedicated, computationally-focused component. Its separation allows for independent scaling and resource allocation (e.g., using GPU-enabled hardware) to handle the demands of LLM inference without impacting the core management platform.

### 2.2. Frontend (`apps/platform/frontend`)

The frontend is a modern, single-page application (SPA) designed for a rich user experience.

-   **Framework:** React
-   **Build Tool:** Vite
-   **UI Library:** Material UI (MUI)
-   **Key Features:**
    -   **Visual Flow Builder:** An interactive canvas built with `@xyflow/react` allows users to visually construct chatbot flows. Users can drag, drop, connect, and configure different types of nodes (e.g., "Start", "Normal", "End", "Request") to define the conversation logic.
    -   **Dashboard:** A central hub for users to create, organize, and manage their conversation "paths," with support for folder-based organization.
    -   **Authentication:** A mock login page provides the entry point for users.
    -   **User Experience:** The interface includes a responsive top app bar and a light/dark theme toggle for user comfort.

## 3. Key Technologies

-   **Backend:** Python, FastAPI, Redis
-   **Frontend:** TypeScript, React, Vite, Material UI, `@xyflow/react`
-   **Containerization:** Docker (as indicated by `docker-compose.yml` and `Dockerfile`s)

## 4. Project Structure

-   `apps/platform/backend`: The Flow Management web service.
-   `apps/platform/frontend`: The React-based user interface.
-   `apps/engine`: The LLM Orchestration and conversation execution service.
-   `docker-compose.yml`: Defines how the services are orchestrated for local development.
-   `package.json`: Manages top-level project scripts and dependencies.
