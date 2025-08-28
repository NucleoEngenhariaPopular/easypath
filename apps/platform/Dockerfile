# Stage 1: Frontend build
# Use a non-Alpine Node.js image for better compatibility with TypeScript
FROM node:20 as frontend-builder

# Set working directory for the frontend application
WORKDIR /app/frontend

# Copy package.json and package-lock.json first to leverage Docker caching
COPY ./frontend/package.json ./frontend/package-lock.json ./

# Install frontend dependencies using npm ci for clean and consistent installs
RUN npm ci

# Copy the rest of the frontend source code
COPY ./frontend/ .

# Build the frontend application
RUN npm run build

# Stage 2: Backend and final application
# Use a slim Python image for the backend
FROM python:3.10-slim-buster as backend-and-runner

# Set working directory for the backend application
WORKDIR /app/backend

# Copy backend requirements
COPY ./backend/requirements.txt .

# Install backend dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY ./backend/ .

# Copy built frontend assets from the frontend-builder stage to the backend's dist directory
COPY --from=frontend-builder /app/frontend/dist ./dist

# Expose the port your FastAPI application listens on
EXPOSE 8080

# Command to run the application using uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
