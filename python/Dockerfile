FROM ghcr.io/astral-sh/uv:debian-slim AS final

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_SYSTEM_PYTHON=1 \
    PATH="/usr/local/bin:/usr/local/sbin:/usr/bin:/usr/sbin:/sbin:/bin:/root/.cargo/bin"

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    build-essential \
    curl \
    ca-certificates \
    nginx \
    supervisor \
    gnupg \
    python3 \
    python3-pip \
    python3-venv \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y nodejs \
    && update-ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3 /usr/bin/python

RUN curl -LsSf https://astral.sh/uv/install.sh | sh && \
    uv --version

# Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && chmod +x kubectl \
    && mv kubectl /usr/local/bin/

# Install Istio
RUN curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.25.0 TARGET_ARCH=x86_64 sh - \
    && mv istio-1.25.0/bin/istioctl /usr/local/bin/istioctl \
    && rm -rf istio-1.25.0

# Install Helm
RUN curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 \
    && chmod 700 get_helm.sh \
    && ./get_helm.sh \
    && rm get_helm.sh

# Create groups and users
RUN groupadd -g 1002 pythongroup \
    && useradd -u 1002 -g pythongroup -s /bin/bash -m python \
    && mkdir -p /app/python /app/ui /run/nginx \
    && chown -R python:pythongroup /app/python

# Set up Python backend
WORKDIR /app/python
COPY pyproject.toml .
COPY .python-version .
COPY uv.lock .
COPY src src
COPY README.md .
RUN uv sync --all-extras && \
    chown -R python:pythongroup /app/python

# Generate tools and agents
RUN mkdir -p /root/.autogenstudio/configs
RUN uv run tool_gen -o /root/.autogenstudio/configs
COPY agents/*.json /root/.autogenstudio/configs

# Ensure correct permissions
RUN chown -R python:pythongroup /app/python && \
    chmod -R 755 /app

RUN mkdir -p /app/python/.cache/uv && \
    chown -R python:pythongroup /app/python/.cache

EXPOSE 80

LABEL org.opencontainers.image.source=https://github.com/kagent-dev/kagent
LABEL org.opencontainers.image.description="Kagent app is the UI and apiserver for running agents."

CMD ["uv", "run", "autogenstudio", "ui", "--host", "0.0.0.0", "--port", "8081"]