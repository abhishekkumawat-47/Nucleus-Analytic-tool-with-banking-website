FROM python:3.11-slim

# Install system dependencies required for standard python networking/kafka libraries
RUN apt-get update && apt-get install -y \
    gcc \
    librdkafka-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy requirements and install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# The actual command is overridden in docker-compose for each specific service
