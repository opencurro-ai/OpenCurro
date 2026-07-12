# Production Dockerfile for React + Python fullstack (shadcn variant)
# Uses prebuilt base image for faster builds

# Build stage for frontend - uses base image with node_modules pre-installed
ARG BASE_IMAGE=node:20-slim
FROM ${BASE_IMAGE} AS frontend-builder

WORKDIR /app/frontend

# Copy frontend package files
COPY frontend/package*.json ./

# Install/update dependencies
# If base image has node_modules, npm install only adds new packages (fast)
# If no node_modules, does full install (slower but still works)
RUN npm install

# Copy frontend source code
COPY frontend/ ./

# Build the Vite frontend
ENV NODE_ENV=production
RUN npm run build

# Production image - Python backend serving static frontend
FROM python:3.11-slim AS runner

WORKDIR /app

# Install Python dependencies
COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/src ./src

# Copy built frontend to serve as static files
COPY --from=frontend-builder /app/frontend/dist ./static

# Create non-root user for security
RUN addgroup --system --gid 1001 appgroup && \
    adduser --system --uid 1001 appuser && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000
ENV PORT=8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
