FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (build-essential, git, git-lfs for ML weights, libpq for PostgreSQL)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    git-lfs \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure LFS files are pulled if checked out as pointers
RUN git lfs install && (git lfs pull || true)

EXPOSE 8000

ENV HOST=0.0.0.0
ENV PORT=8000

CMD ["sh", "-c", "uvicorn backend.app:app --host 0.0.0.0 --port ${PORT:-8000}"]
