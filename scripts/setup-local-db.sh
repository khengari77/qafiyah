#!/bin/bash

set -e

DB_NAME="qafiyah"
DB_USER="qafiyah"
DB_PASSWORD="postgres"
DB_HOST="127.0.0.1"
DB_PORT="5433"
DUMP_DIR="public/datasets"
DEV_VARS_FILE="apps/api/.dev.vars"
DOCKER_COMPOSE_FILE="docker-compose.yml"

print_info() {
    echo "[INFO] $1"
}

print_warn() {
    echo "[WARN] $1"
}

print_error() {
    echo "[ERROR] $1"
}

print_success() {
    echo "[OK] $1"
}

print_info "Validating prerequisites..."

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose is not installed. Please install Docker Desktop."
    echo ""
    print_info "Install from: https://www.docker.com/products/docker-desktop"
    exit 1
fi

if docker compose version &> /dev/null; then
    DOCKER_COMPOSE_CMD="docker compose"
else
    DOCKER_COMPOSE_CMD="docker-compose"
fi

if [ ! -f "$DOCKER_COMPOSE_FILE" ]; then
    print_error "docker-compose.yml not found in project root"
    exit 1
fi

print_success "Docker Compose is available"

print_info "Starting PostgreSQL container..."

if $DOCKER_COMPOSE_CMD ps postgres 2>/dev/null | grep -q "qafiyah-postgres"; then
    if $DOCKER_COMPOSE_CMD ps postgres 2>/dev/null | grep -q "Up"; then
        if ! $DOCKER_COMPOSE_CMD exec -T postgres pg_isready -U postgres &> /dev/null 2>&1; then
            print_warn "Container exists but PostgreSQL is not responding"
            print_info "This might be due to a PostgreSQL version upgrade. Removing old volume..."
            $DOCKER_COMPOSE_CMD down -v
            print_info "Starting fresh container..."
        fi
    fi
fi

$DOCKER_COMPOSE_CMD up -d postgres

print_info "Waiting for PostgreSQL to be ready..."
MAX_WAIT=30
WAIT_COUNT=0
while ! $DOCKER_COMPOSE_CMD exec -T postgres pg_isready -U postgres &> /dev/null; do
    if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
        print_error "PostgreSQL container did not become ready in time"
        print_info "Check container logs: $DOCKER_COMPOSE_CMD logs postgres"
        exit 1
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

print_success "PostgreSQL container is ready"

print_info "Creating database user '$DB_USER' if it doesn't exist..."

if $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    print_warn "User '$DB_USER' already exists"
else
    $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' CREATEDB;"
    print_success "User '$DB_USER' created"
fi

print_info "Finding the latest database dump..."

if [ ! -d "$DUMP_DIR" ]; then
    print_error "Dump directory '$DUMP_DIR' not found"
    exit 1
fi

LATEST_DUMP=$(find "$DUMP_DIR" -name "*.dump" -type f | sort -r | head -1)

if [ -z "$LATEST_DUMP" ]; then
    print_error "No database dump files found in '$DUMP_DIR'"
    exit 1
fi

print_success "Found latest dump: $LATEST_DUMP"

print_info "Setting up local database '$DB_NAME'..."

if $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    print_warn "Database '$DB_NAME' already exists - dropping and recreating it"
    $DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || {
        print_error "Failed to drop database. It may be in use."
        exit 1
    }
fi

print_info "Creating database '$DB_NAME' owned by '$DB_USER'..."
$DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
print_success "Database is ready"

print_info "Dropping default public schema so pg_restore can recreate it..."
$DOCKER_COMPOSE_CMD exec -T postgres psql -U postgres -d "$DB_NAME" -c "DROP SCHEMA public CASCADE;"

print_info "Restoring database dump (this may take a while)..."

DUMP_BASENAME=$(basename "$LATEST_DUMP")
$DOCKER_COMPOSE_CMD cp "$LATEST_DUMP" "postgres:/tmp/$DUMP_BASENAME"

print_info "Running pg_restore..."
if ! $DOCKER_COMPOSE_CMD exec -T postgres pg_restore \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    --no-owner \
    --no-acl \
    --verbose \
    "/tmp/$DUMP_BASENAME"; then
    print_error "pg_restore failed"
    $DOCKER_COMPOSE_CMD exec -T postgres rm -f "/tmp/$DUMP_BASENAME" || true
    exit 1
fi

$DOCKER_COMPOSE_CMD exec -T postgres rm -f "/tmp/$DUMP_BASENAME"
print_success "Database restored"

print_info "Updating .dev.vars with DEV_DATABASE_URL (preserving DATABASE_URL for production)..."

LOCAL_DB_URL="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME"

if [ -f "$DEV_VARS_FILE" ]; then
    TEMP_FILE=$(mktemp)
    if grep -q "^DEV_DATABASE_URL=" "$DEV_VARS_FILE"; then
        sed "s|^DEV_DATABASE_URL=.*|DEV_DATABASE_URL=$LOCAL_DB_URL|" "$DEV_VARS_FILE" > "$TEMP_FILE"
    else
        cp "$DEV_VARS_FILE" "$TEMP_FILE"
        if [ -s "$TEMP_FILE" ] && [ "$(tail -c 1 "$TEMP_FILE")" != "" ]; then
            echo "" >> "$TEMP_FILE"
        fi
        echo "DEV_DATABASE_URL=$LOCAL_DB_URL" >> "$TEMP_FILE"
    fi
    mv "$TEMP_FILE" "$DEV_VARS_FILE"
else
    echo "# Production database URL (set this to your production database)" > "$DEV_VARS_FILE"
    echo "# DATABASE_URL=postgresql://..." >> "$DEV_VARS_FILE"
    echo "" >> "$DEV_VARS_FILE"
    echo "# Local development database URL (managed by setup-local-db.sh)" >> "$DEV_VARS_FILE"
    echo "DEV_DATABASE_URL=$LOCAL_DB_URL" >> "$DEV_VARS_FILE"
fi

print_success "Updated .dev.vars with DEV_DATABASE_URL"
print_success "Local database setup complete!"
print_info "Connection string: $LOCAL_DB_URL"