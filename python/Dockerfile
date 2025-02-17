FROM ghcr.io/astral-sh/uv:debian-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install system dependencies
RUN  apt-get update && apt-get install -y --no-install-recommends \
    --reinstall ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Install binary dependencies
RUN curl -LO https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl
RUN chmod +x ./kubectl
RUN mv ./kubectl /usr/local/bin

# Set working directory
WORKDIR /app

# Copy project files
COPY pyproject.toml .
COPY .python-version .
COPY uv.lock .
COPY src src
COPY README.md .

# Install dependencies using uv
RUN uv sync --all-extras

# Default command
CMD ["uv", "run", "autogenstudio", "ui"]