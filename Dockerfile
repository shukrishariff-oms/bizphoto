# Stage 1: Build the React Frontend
FROM node:18-alpine as build-frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm install
COPY frontend ./
RUN npm run build

# Stage 2: Setup the Python Backend
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies if needed (e.g. for reportlab or other libs)
RUN apt-get update && apt-get install -y libpq-dev gcc && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend ./backend
COPY scripts ./scripts

# Copy built frontend assets from Stage 1
COPY --from=build-frontend /app/frontend/dist ./frontend/dist

# Expose port (only one port needed now, as backend serves frontend)
EXPOSE 8000

# Set environment variables
ENV PYTHONUNBUFFERED=1

# Run DB migration and start server
CMD ["sh", "-c", "python scripts/deploy_db.py && uvicorn backend.main:app --host 0.0.0.0 --port 8000"]
