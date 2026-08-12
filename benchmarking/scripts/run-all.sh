#!/usr/bin/env bash
# Builds every app, then benchmarks each one (GET /hello, GET /todos, GET /todos/1, POST /todos)
# one at a time so they never compete for CPU/ports, writing results/<app>__<endpoint>.json.
# Finishes by generating results/REPORT.md via tools/report/aggregate.mjs.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DURATION="${BENCH_DURATION:-10}"
CONNECTIONS="${BENCH_CONNECTIONS:-50}"

# Each app owns a fixed port (baked into its own source/app-config.yaml), so every app can run
# standalone for local development without colliding, and the runner here always knows where to
# point without needing an env-var override plumbed through Node-Boot's config loader.
port_for_app() {
    case "$1" in
        raw-http) echo 4001 ;;
        raw-express) echo 4002 ;;
        raw-fastify) echo 4003 ;;
        raw-koa) echo 4004 ;;
        nodeboot-http) echo 4011 ;;
        nodeboot-express) echo 4012 ;;
        nodeboot-fastify) echo 4013 ;;
        nodeboot-koa) echo 4014 ;;
        *) echo "" ;;
    esac
}

# Each app owns a fixed Postgres database (see docker/init-databases.sh), so every app is fully
# isolated even though they all talk to the same benchmarking Postgres instance/port.
db_for_app() {
    case "$1" in
        raw-http) echo raw_http ;;
        raw-express) echo raw_express ;;
        raw-fastify) echo raw_fastify ;;
        raw-koa) echo raw_koa ;;
        nodeboot-http) echo nodeboot_http ;;
        nodeboot-express) echo nodeboot_express ;;
        nodeboot-fastify) echo nodeboot_fastify ;;
        nodeboot-koa) echo nodeboot_koa ;;
        *) echo "" ;;
    esac
}

APPS=(
    "raw-http"
    "raw-express"
    "raw-fastify"
    "raw-koa"
    "nodeboot-http"
    "nodeboot-express"
    "nodeboot-fastify"
    "nodeboot-koa"
)

echo "==> Installing dependencies"
pnpm install

echo "==> Building all apps"
pnpm run build

echo "==> Resetting benchmark Postgres (docker compose)"
docker compose down -v
docker compose up -d --wait

rm -rf results/*.json
mkdir -p results

for app in "${APPS[@]}"; do
    PORT="$(port_for_app "$app")"
    DB="$(db_for_app "$app")"
    echo ""
    echo "==> Starting $app on port $PORT (database: $DB)"
    # Truncate leftover rows from a previous run so every app always starts from the same known
    # 1,000-row seed state (mirrors the old `rm -f *.sqlite*` full-reset behaviour).
    docker compose exec -T postgres psql -U postgres -d "$DB" -c 'TRUNCATE TABLE "todo" RESTART IDENTITY' > /dev/null 2>&1 || true
    (cd "apps/$app" && exec node dist/server.js) &
    APP_PID=$!

    # Wait for the app to accept connections before benchmarking.
    for i in $(seq 1 30); do
        if curl -sf "http://localhost:$PORT/hello" > /dev/null 2>&1; then
            break
        fi
        sleep 0.5
    done

    node tools/runner/bench.mjs --url "http://localhost:$PORT/hello" --app "$app" --endpoint hello \
        --duration "$DURATION" --connections "$CONNECTIONS"

    node tools/runner/bench.mjs --url "http://localhost:$PORT/todos" --app "$app" --endpoint todos-list \
        --duration "$DURATION" --connections "$CONNECTIONS"

    node tools/runner/bench.mjs --url "http://localhost:$PORT/todos/1" --app "$app" --endpoint todos-get \
        --duration "$DURATION" --connections "$CONNECTIONS"

    node tools/runner/bench.mjs --url "http://localhost:$PORT/todos" --app "$app" --endpoint todos-create \
        --method POST --body '{"title":"Load test todo"}' \
        --duration "$DURATION" --connections "$CONNECTIONS"

    echo "==> Stopping $app"
    kill "$APP_PID" 2>/dev/null || true
    wait "$APP_PID" 2>/dev/null || true
    sleep 1
done

echo ""
echo "==> Generating report"
node tools/report/aggregate.mjs

echo ""
echo "Done. See results/REPORT.md"
