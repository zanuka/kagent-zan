# Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY python/orchestrator .

# Create directory for storing artifacts
RUN mkdir -p /app/workspace

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV WORKSPACE_DIR=/app/workspace

# Default command
ENTRYPOINT ["python", "orchestrator.py"]
