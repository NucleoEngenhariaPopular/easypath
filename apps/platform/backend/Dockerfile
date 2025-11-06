# Multi-stage build for Platform Backend
# Stage 1: Build dependencies
FROM python:3.9-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy shared package first (needed for editable install)
COPY packages/shared /app/packages/shared

# Copy and install Python dependencies
COPY apps/platform/backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.9-slim

WORKDIR /app

# Copy installed dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy shared package (needed for editable install at runtime)
COPY packages/shared /app/packages/shared

# Add .local/bin to PATH
ENV PATH=/root/.local/bin:$PATH

# Copy application code
COPY apps/platform/backend/main.py apps/platform/backend/database.py apps/platform/backend/models.py apps/platform/backend/schemas.py ./
COPY apps/platform/backend/app/ ./app/

# Command is overridden in docker-compose.dev.yml for hot-reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
