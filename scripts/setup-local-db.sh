#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DB_NAME="qafiyah"
DB_USER="postgres"
DB_PASSWORD="postgres"
DB_HOST="127.0.0.1"
DB_PORT="5433"
DUMP_DIR=".db_dumps"
DEV_VARS_FILE="apps/api/.dev.vars"
BACKUP_DIR=".db_setup_backups"
DOCKER_COMPOSE_FILE="docker-compose.yml"

print_info() {
    echo -e "${GREEN}ℹ${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
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
        # Check if it's a version incompatibility issue
        CONTAINER_LOGS=$($DOCKER_COMPOSE_CMD logs postgres 2>&1 | tail -5)
        if echo "$CONTAINER_LOGS" | grep -q "database files are incompatible"; then
            print_error "PostgreSQL version incompatibility detected!"
            print_warn "The Docker volume contains data from an older PostgreSQL version."
            echo ""
            print_info "To fix this, run:"
            echo "  docker-compose down -v"
            echo "  docker-compose up -d postgres"
            echo "  ./scripts/setup-local-db.sh"
            echo ""
            print_info "This will remove the old volume and start fresh."
            exit 1
        fi
        print_error "PostgreSQL container did not become ready in time"
        print_info "Check container logs: $DOCKER_COMPOSE_CMD logs postgres"
        exit 1
    fi
    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))
done

print_success "PostgreSQL container is ready"

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

if [ -f "$DEV_VARS_FILE" ]; then
    print_info "Backing up current .dev.vars..."
    mkdir -p "$BACKUP_DIR"
    BACKUP_FILE="$BACKUP_DIR/.dev.vars.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$DEV_VARS_FILE" "$BACKUP_FILE"
    print_success "Backed up to: $BACKUP_FILE"
else
    print_warn ".dev.vars not found, will create a new one"
fi

print_info "Setting up local database '$DB_NAME'..."

if $DOCKER_COMPOSE_CMD exec -T postgres psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    print_warn "Database '$DB_NAME' already exists"
    read -p "Drop and recreate it? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Dropping existing database..."
        $DOCKER_COMPOSE_CMD exec -T postgres psql -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME;" || {
            print_error "Failed to drop database. It may be in use."
            exit 1
        }
        print_success "Database dropped"
    else
        print_info "Keeping existing database. Restoring into it..."
    fi
fi

if ! $DOCKER_COMPOSE_CMD exec -T postgres psql -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then
    print_info "Creating database '$DB_NAME'..."
    $DOCKER_COMPOSE_CMD exec -T postgres psql -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME;"
    print_success "Database created"
fi

print_info "Restoring database dump (this may take a while)..."

DUMP_BASENAME=$(basename "$LATEST_DUMP")
$DOCKER_COMPOSE_CMD cp "$LATEST_DUMP" "postgres:/tmp/$DUMP_BASENAME"

print_info "Running pg_restore (this may show warnings, but will continue)..."
RESTORE_OUTPUT=$($DOCKER_COMPOSE_CMD exec -T postgres pg_restore \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    -F c \
    --no-owner \
    --no-acl \
    --verbose \
    "/tmp/$DUMP_BASENAME" 2>&1 || true)

echo "$RESTORE_OUTPUT" | grep -v "schema \"public\" already exists" | grep -v "unsupported version" | grep -v "^WARN" || true

if echo "$RESTORE_OUTPUT" | grep -q "FATAL\|ERROR" && ! echo "$RESTORE_OUTPUT" | grep -q "unsupported version"; then
    print_warn "Restore completed with some errors. Checking if database is usable..."
else
    print_success "Database restored (version warnings are usually harmless)"
fi

$DOCKER_COMPOSE_CMD exec -T postgres rm -f "/tmp/$DUMP_BASENAME"

print_info "Verifying database objects..."
if $DOCKER_COMPOSE_CMD exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'get_poem_with_related'" | grep -q "1"; then
    print_success "Database functions verified"
else
    print_warn "Warning: Some database functions may be missing. The dump may need to be recreated with a compatible pg_dump version."
fi

print_info "Updating .dev.vars with DEV_DATABASE_URL (preserving DATABASE_URL for production)..."

LOCAL_DB_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

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

print_info "Verifying database connection..."

if $DOCKER_COMPOSE_CMD exec -T postgres psql -U "$DB_USER" -d "$DB_NAME" -c '\q' &> /dev/null; then
    print_success "Database connection verified"
else
    print_warn "Could not verify database connection, but setup completed"
fi

echo ""
print_success "Local database setup complete!"
echo ""
echo "Container: qafiyah-postgres"
echo "Database: $DB_NAME"
echo "Connection: $LOCAL_DB_URL"
echo ""
print_info "DEV_DATABASE_URL has been set in .dev.vars"
print_info "API will use DEV_DATABASE_URL (local) instead of DATABASE_URL (production)"
echo ""
print_info "Useful commands:"
echo "  Stop container:  $DOCKER_COMPOSE_CMD down"
echo "  Start container: $DOCKER_COMPOSE_CMD up -d postgres"
echo "  View logs:       $DOCKER_COMPOSE_CMD logs postgres"
echo "  Access shell:    $DOCKER_COMPOSE_CMD exec postgres psql -U postgres -d qafiyah"
echo ""
print_info "You can now start your development server with: pnpm dev"
print_info "To rollback to production, run: ./scripts/rollback-to-prod.sh"
