FROM node:20-bookworm-slim

# Install Python and dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies
COPY backend/package*.json ./
RUN npm install --omit=dev

# Install Python ML dependencies
RUN pip3 install --no-cache-dir --break-system-packages flask scikit-learn pandas numpy joblib

# Copy backend source code and trained ML model
COPY backend/ .

EXPOSE 5000 8000

CMD sh -c "python3 server.py & npm start"
