#!/usr/bin/env bash
# Builds and starts the container locally, then waits until the health endpoint answers.
set -euo pipefail

HEALTH_URL="http://localhost:3000/api/health"
MAXIMUM_ATTEMPTS=30

mkdir -p data
docker compose up --detach --build

for attempt in $(seq 1 "$MAXIMUM_ATTEMPTS"); do
  if curl --silent --fail "$HEALTH_URL" > /dev/null; then
    echo "Deployed and healthy: http://localhost:3000"
    exit 0
  fi
  sleep 2
done

echo "Health check failed after $MAXIMUM_ATTEMPTS attempts. Recent logs:" >&2
docker compose logs --tail 50 >&2
exit 1
