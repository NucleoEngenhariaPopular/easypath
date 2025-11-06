# Multi-stage build for Messaging Gateway
# Stage 1: Build dependencies
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy shared package first (needed for editable install)
COPY packages/shared /app/packages/shared

# Copy and install Python dependencies
COPY apps/messaging-gateway/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Install only runtime dependencies (postgresql-client for migrations)
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy installed dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy shared package (needed for editable install at runtime)
COPY packages/shared /app/packages/shared

# Add .local/bin to PATH
ENV PATH=/root/.local/bin:$PATH

# Copy only application code
COPY apps/messaging-gateway/app/ ./app/

# Copy migration files (needed for database setup)
COPY apps/messaging-gateway/migrations/ ./migrations/

# Expose port
EXPOSE 8082

# Command is overridden in docker-compose.dev.yml for hot-reload
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8082"]
