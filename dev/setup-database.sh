#!/usr/bin/env bash
#
# Set up the local Postgres database from the newest dump in data/datasets/.
# Idempotent: re-running drops and recreates the database from scratch.
#
# The container (see docker-compose.yml) bootstraps the `qafiyah` user and
# database on first boot, so this script only needs to restore the dump.
#

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

readonly DB_NAME="qafiyah"
readonly DB_USER="qafiyah"
readonly DB_PASSWORD="qafiyah"
readonly DB_HOST="127.0.0.1"
readonly DB_PORT="5433"

readonly SERVICE="db"
readonly DUMP_DIR="data/datasets"
readonly COMPOSE_FILE="docker-compose.yml"

readonly API_ENV_FILE="apps/api/.dev.vars"
readonly WEB_ENV_FILE="apps/web/.env"

readonly MAX_WAIT_SECONDS=30

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------

log_info()    { echo "[INFO] $*"; }
log_error()   { echo "[ERROR] $*" >&2; }
log_success() { echo "[OK] $*"; }

# -----------------------------------------------------------------------------
# Helpers
# -----------------------------------------------------------------------------

detect_compose() {
    if docker compose version &>/dev/null; then
        echo "docker compose"
    elif command -v docker-compose &>/dev/null; then
        echo "docker-compose"
    else
        log_error "Docker Compose not found. Install Docker Desktop:"
        log_info "  https://www.docker.com/products/docker-desktop"
        exit 1
    fi
}

find_latest_dump() {
    local dump
    dump=$(find "$DUMP_DIR" -name "*.dump" -type f 2>/dev/null | sort -r | head -1)

    if [[ -z "$dump" ]]; then
        log_error "No .dump files found in: $DUMP_DIR"
        exit 1
    fi

    echo "$dump"
}

wait_for_db() {
    local compose=$1
    local waited=0

    log_info "Waiting for Postgres to be ready..."
    # Probe TCP (not the unix socket) — Postgres' Docker entrypoint runs a
    # socket-only init phase before the real network listener is up.
    while ! $compose exec -T "$SERVICE" pg_isready -h localhost -U "$DB_USER" -d "$DB_NAME" &>/dev/null; do
        if ((waited >= MAX_WAIT_SECONDS)); then
            log_error "Postgres did not become ready in ${MAX_WAIT_SECONDS}s"
            log_info "Check logs: $compose logs $SERVICE"
            exit 1
        fi
        sleep 1
        waited=$((waited + 1))
    done

    log_success "Postgres is ready"
}

restore_database() {
    local compose=$1
    local dump=$2
    local name
    name=$(basename "$dump")

    log_info "Recreating database '$DB_NAME'..."
    # Connect to the default `postgres` database to drop+recreate `qafiyah`.
    # FORCE (Postgres 13+) terminates any open connections to the target DB.
    $compose exec -T "$SERVICE" psql -U "$DB_USER" -d postgres -c \
        "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);"
    $compose exec -T "$SERVICE" psql -U "$DB_USER" -d postgres -c \
        "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    # The dump recreates `public`, so drop the default one Postgres adds.
    $compose exec -T "$SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -c \
        "DROP SCHEMA public CASCADE;"

    log_info "Copying dump into container..."
    $compose cp "$dump" "$SERVICE:/tmp/$name"

    log_info "Restoring (this may take a while)..."
    if ! $compose exec -T "$SERVICE" pg_restore \
        -U "$DB_USER" -d "$DB_NAME" \
        -F c --no-owner --no-acl \
        "/tmp/$name"; then
        $compose exec -T "$SERVICE" rm -f "/tmp/$name" 2>/dev/null || true
        log_error "Restore failed"
        exit 1
    fi

    $compose exec -T "$SERVICE" rm -f "/tmp/$name"
    log_success "Database restored"
}

write_env_files() {
    local url="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

    cat > "$API_ENV_FILE" <<EOF
# Local Postgres (docker-compose, port $DB_PORT)
DATABASE_URL=$url
EOF

    # Astro reads from apps/web/.env (not Wrangler's .dev.vars).
    # The browser bundle only needs the API URL; the API holds the DB credentials.
    cat > "$WEB_ENV_FILE" <<EOF
# Point dev search/random at the local API (queries local DB, no CORS)
PUBLIC_API_URL=http://localhost:8787
EOF

    log_success "Env files written: $API_ENV_FILE, $WEB_ENV_FILE"
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------

main() {
    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    if [[ ! -d "$DUMP_DIR" ]]; then
        log_error "Dump directory not found: $DUMP_DIR"
        exit 1
    fi

    local compose
    compose=$(detect_compose)
    log_info "Using: $compose"

    local dump
    dump=$(find_latest_dump)
    log_info "Latest dump: $dump"

    log_info "Starting Postgres container..."
    $compose up -d "$SERVICE"
    wait_for_db "$compose"

    restore_database "$compose" "$dump"
    write_env_files

    echo ""
    log_success "Setup complete"
    echo "  Database: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"
    echo ""
    echo "  pnpm dev   → start the API + web dev servers"
}

main "$@"
