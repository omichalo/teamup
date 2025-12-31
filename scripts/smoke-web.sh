#!/bin/bash
# Smoke test pour l'application web Next.js
# Build + start + vérification de la route /api/health + stop

set -e

echo "🔨 Building Next.js application..."
npm run build

echo "🚀 Starting Next.js server..."
npm start &
SERVER_PID=$!

# Attendre que le serveur démarre (max 30 secondes)
echo "⏳ Waiting for server to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Server is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Server failed to start within 30 seconds"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo "🔍 Testing /api/health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health)
if [ $? -eq 0 ]; then
  echo "✅ Health check passed: $HEALTH_RESPONSE"
else
  echo "❌ Health check failed"
  kill $SERVER_PID 2>/dev/null || true
  exit 1
fi

echo "🛑 Stopping server..."
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true

echo "✅ Smoke test completed successfully"

