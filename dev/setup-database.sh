#!/usr/bin/env bash

#
# Database Setup Script
# Sets up PostgreSQL development and test databases using Docker Compose
#

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------

readonly DB_NAME="qafiyah"
readonly DB_USER="qafiyah"
readonly DB_PASSWORD="postgres"
readonly DB_HOST="127.0.0.1"

readonly DEV_DB_PORT="5433"
readonly TEST_DB_PORT="5434"

readonly DUMP_DIR="data/datasets"
readonly REDUCE_SCRIPT="dev/sql/reduce-to-micro.sql"

readonly DEV_ENV_FILE="apps/api/.dev.vars"
readonly TEST_ENV_FILE="apps/api/.dev.vars.test"
readonly WEB_ENV_FILE="apps/web/.env"
readonly COMPOSE_FILE="docker-compose.yml"

readonly MAX_WAIT_SECONDS=30

# Docker service names
readonly DEV_SERVICE="db-dev"
readonly TEST_SERVICE="db-test"

# -----------------------------------------------------------------------------
# Logging Functions
# -----------------------------------------------------------------------------

log_info() {
    echo "[INFO] $*"
}

log_warn() {
    echo "[WARN] $*"
}

log_error() {
    echo "[ERROR] $*" >&2
}

log_success() {
    echo "[OK] $*"
}

# -----------------------------------------------------------------------------
# Validation Functions
# -----------------------------------------------------------------------------

check_docker_compose() {
    if docker compose version &>/dev/null; then
        echo "docker compose"
    elif command -v docker-compose &>/dev/null; then
        echo "docker-compose"
    else
        log_error "Docker Compose not found. Install Docker Desktop:"
        log_info "https://www.docker.com/products/docker-desktop"
        exit 1
    fi
}

validate_prerequisites() {
    log_info "Validating prerequisites..."

    if [[ ! -f "$COMPOSE_FILE" ]]; then
        log_error "Docker Compose file not found: $COMPOSE_FILE"
        exit 1
    fi

    if [[ ! -d "$DUMP_DIR" ]]; then
        log_error "Dump directory not found: $DUMP_DIR"
        exit 1
    fi

    log_success "Prerequisites validated"
}

find_latest_dump() {
    local dump_file

    dump_file=$(find "$DUMP_DIR" -name "*.dump" -type f 2>/dev/null | sort -r | head -1)

    if [[ -z "$dump_file" ]]; then
        log_error "No database dump files found in: $DUMP_DIR"
        exit 1
    fi

    echo "$dump_file"
}

# -----------------------------------------------------------------------------
# Docker Functions
# -----------------------------------------------------------------------------

start_containers() {
    local compose_cmd=$1

    log_info "Starting PostgreSQL containers..."

    # Handle potential version upgrade issues
    if $compose_cmd ps "$DEV_SERVICE" 2>/dev/null | grep -q "qafiyah-db"; then
        if $compose_cmd ps "$DEV_SERVICE" 2>/dev/null | grep -q "Up"; then
            if ! $compose_cmd exec -T "$DEV_SERVICE" pg_isready -U postgres &>/dev/null; then
                log_warn "PostgreSQL not responding (possible version upgrade)"
                log_info "Removing old volumes and starting fresh..."
                $compose_cmd down -v
            fi
        fi
    fi

    $compose_cmd up -d "$DEV_SERVICE" "$TEST_SERVICE"
}

wait_for_database() {
    local compose_cmd=$1
    local service=$2
    local wait_count=0

    log_info "Waiting for $service to be ready..."

    while ! $compose_cmd exec -T "$service" pg_isready -U postgres &>/dev/null; do
        if ((wait_count >= MAX_WAIT_SECONDS)); then
            log_error "$service did not become ready in ${MAX_WAIT_SECONDS}s"
            log_info "Check logs: $compose_cmd logs $service"
            exit 1
        fi
        sleep 1
        ((wait_count++))
    done

    log_success "$service is ready"
}

# -----------------------------------------------------------------------------
# Database Functions
# -----------------------------------------------------------------------------

create_database_user() {
    local compose_cmd=$1
    local service=$2

    if $compose_cmd exec -T "$service" psql -U postgres -tAc \
        "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
        log_warn "User '$DB_USER' already exists on $service"
    else
        $compose_cmd exec -T "$service" psql -U postgres -c \
            "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD' CREATEDB;"
        log_success "User '$DB_USER' created on $service"
    fi
}

setup_database() {
    local compose_cmd=$1
    local service=$2
    local dump_file=$3
    local dump_basename

    dump_basename=$(basename "$dump_file")

    log_info "Setting up database on $service..."

    # Drop existing database if present
    if $compose_cmd exec -T "$service" psql -U postgres -tAc \
        "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
        log_warn "Database '$DB_NAME' exists on $service - recreating..."
        $compose_cmd exec -T "$service" psql -U postgres -c \
            "DROP DATABASE IF EXISTS $DB_NAME;" || {
            log_error "Failed to drop database on $service (may be in use)"
            exit 1
        }
    fi

    # Create database
    log_info "Creating database '$DB_NAME' on $service..."
    $compose_cmd exec -T "$service" psql -U postgres -c \
        "CREATE DATABASE $DB_NAME OWNER $DB_USER;"

    # Drop public schema for clean restore
    log_info "Preparing schema on $service..."
    $compose_cmd exec -T "$service" psql -U postgres -d "$DB_NAME" -c \
        "DROP SCHEMA public CASCADE;"

    # Copy and restore dump
    log_info "Copying dump to $service..."
    $compose_cmd cp "$dump_file" "$service:/tmp/$dump_basename"

    log_info "Restoring database on $service (this may take a while)..."
    if ! $compose_cmd exec -T "$service" pg_restore \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -F c \
        --no-owner \
        --no-acl \
        --verbose \
        "/tmp/$dump_basename"; then
        log_error "Database restore failed on $service"
        $compose_cmd exec -T "$service" rm -f "/tmp/$dump_basename" 2>/dev/null || true
        exit 1
    fi

    # Cleanup
    $compose_cmd exec -T "$service" rm -f "/tmp/$dump_basename"
    log_success "Database restored on $service"
}

reduce_test_database() {
    local compose_cmd=$1

    log_info "Reducing test database size..."

    if [[ ! -f "$REDUCE_SCRIPT" ]]; then
        log_error "Reduction script not found: $REDUCE_SCRIPT"
        exit 1
    fi

    if ! $compose_cmd exec -T "$TEST_SERVICE" psql -U "$DB_USER" -d "$DB_NAME" -q \
        < "$REDUCE_SCRIPT"; then
        log_error "Failed to reduce test database"
        exit 1
    fi

    log_success "Test database reduced"
}

# -----------------------------------------------------------------------------
# Environment Configuration
# -----------------------------------------------------------------------------

update_environment_files() {
    local dev_db_url="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DEV_DB_PORT/$DB_NAME"
    local test_db_url="postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$TEST_DB_PORT/$DB_NAME"

    log_info "Updating environment files..."

    # Development environment
    cat > "$DEV_ENV_FILE" <<EOF
# Development - Full database (port $DEV_DB_PORT)
DATABASE_URL=$dev_db_url
EOF

    # Test environment
    cat > "$TEST_ENV_FILE" <<EOF
# Test - Micro database (port $TEST_DB_PORT)
DATABASE_URL=$test_db_url
EOF

    # Web app (Astro reads from apps/web/.env, not Wrangler's .dev.vars)
    cat > "$WEB_ENV_FILE" <<EOF
# Local development DB (mirrors apps/api/.dev.vars)
DATABASE_URL=$dev_db_url
EOF

    log_success "Environment files updated"
}

# -----------------------------------------------------------------------------
# Main Script
# -----------------------------------------------------------------------------

main() {
    local compose_cmd
    local dump_file

    # Validate environment
    compose_cmd=$(check_docker_compose)
    log_success "Docker Compose available: $compose_cmd"
    validate_prerequisites

    # Find database dump
    dump_file=$(find_latest_dump)
    log_success "Latest dump: $dump_file"

    # Start containers
    start_containers "$compose_cmd"
    wait_for_database "$compose_cmd" "$DEV_SERVICE"
    wait_for_database "$compose_cmd" "$TEST_SERVICE"

    # Create users
    log_info "Creating database users..."
    for service in "$DEV_SERVICE" "$TEST_SERVICE"; do
        create_database_user "$compose_cmd" "$service"
    done

    # Setup databases
    for service in "$DEV_SERVICE" "$TEST_SERVICE"; do
        setup_database "$compose_cmd" "$service" "$dump_file"
    done

    # Reduce test database size
    reduce_test_database "$compose_cmd"

    # Update configuration
    update_environment_files

    # Display summary
    log_success "Database setup complete!"
    echo ""
    echo "  Development: postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DEV_DB_PORT/$DB_NAME"
    echo "  Test:        postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$TEST_DB_PORT/$DB_NAME"
    echo ""
    echo "  pnpm dev      → Development (full database)"
    echo "  pnpm dev:test → Test (micro database)"
}

main "$@"