#!/bin/bash
# Smoke test pour les Firebase emulators
# Start emulators + vérification minimale + stop

set -e

echo "🔨 Building Firebase functions..."
cd functions && npm run build && cd ..

echo "🚀 Starting Firebase emulators..."
firebase emulators:start --only functions,firestore &
EMULATORS_PID=$!

# Attendre que les emulators démarrent (max 30 secondes)
echo "⏳ Waiting for emulators to start..."
for i in {1..30}; do
  if curl -s http://localhost:4000 > /dev/null 2>&1; then
    echo "✅ Emulators are ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "❌ Emulators failed to start within 30 seconds"
    kill $EMULATORS_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

echo "🔍 Testing emulators status..."
EMULATOR_STATUS=$(curl -s http://localhost:4000 | head -n 1)
if [ $? -eq 0 ]; then
  echo "✅ Emulators are responding"
else
  echo "❌ Emulators status check failed"
  kill $EMULATORS_PID 2>/dev/null || true
  exit 1
fi

echo "🛑 Stopping emulators..."
kill $EMULATORS_PID 2>/dev/null || true
wait $EMULATORS_PID 2>/dev/null || true

echo "✅ Emulators smoke test completed successfully"

