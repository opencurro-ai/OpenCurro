#!/usr/bin/env bash
set -e

BACKEND_DIR="$(dirname "$0")/backend"
FRONTEND_DIR="$(dirname "$0")/frontend"

cleanup() {
  echo ""
  echo "Shutting down..."
  kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  wait "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null
  echo "Done."
}
trap cleanup SIGINT SIGTERM

echo "Starting backend…"
cd "$BACKEND_DIR"
pip install -q -r requirements.txt
uvicorn src.main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

echo "Starting frontend…"
cd "$FRONTEND_DIR"
npm install --silent
npm run dev &
FRONTEND_PID=$!

echo ""
echo "Backend  → http://localhost:8000"
echo "Frontend → http://localhost:5173"
echo "Press Ctrl+C to stop both."
echo ""

wait "$BACKEND_PID" "$FRONTEND_PID"
