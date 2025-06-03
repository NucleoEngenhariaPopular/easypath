# Stage 1: Build the React Frontend
FROM node:20-alpine as frontend-builder

WORKDIR /app/frontend

# Copy only package files first for better caching
COPY ./frontend/package.json ./frontend/package-lock.json ./

# Install dependencies, including dev dependencies, using npm ci
# npm ci is better for CI/CD as it uses package-lock.json
RUN npm ci

# --- TEMPORARY DEBUGGING STEP (KEEP FOR NOW IF YOU WANT TO VERIFY) ---
RUN ls -l /app/frontend/node_modules/.bin/
# --- END TEMPORARY DEBUGGING STEP ---

# Copy the rest of the frontend source code
COPY ./frontend/ .

# Ensure node_modules/.bin is in PATH for npm scripts
ENV PATH="/app/frontend/node_modules/.bin:$PATH"

# Build the React app
RUN npm run build

# Stage 2: Build the FastAPI Backend and serve the frontend
FROM python:3.10-slim as backend-server

WORKDIR /app

# Install backend dependencies
COPY ./backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY ./backend/ .

# Copy built frontend static files from previous stage
COPY --from=frontend-builder /app/frontend/dist ./dist

# Expose the port
ENV PORT=8080
EXPOSE 8080

# Run the FastAPI app
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
