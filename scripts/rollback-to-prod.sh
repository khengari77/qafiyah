#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEV_VARS_FILE="apps/serverless-api/.dev.vars"

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

if [ ! -f "$DEV_VARS_FILE" ]; then
    print_error ".dev.vars file not found at $DEV_VARS_FILE"
    exit 1
fi

if ! grep -q "^DEV_DATABASE_URL=" "$DEV_VARS_FILE"; then
    print_warn "DEV_DATABASE_URL not found in .dev.vars"
    print_info "API is already using DATABASE_URL (production)."
    exit 0
fi

CURRENT_DEV_DB_URL=$(grep "^DEV_DATABASE_URL=" "$DEV_VARS_FILE" | cut -d'=' -f2- || echo "not found")
print_info "Current DEV_DATABASE_URL: ${CURRENT_DEV_DB_URL:0:50}..."

PROD_DB_URL=$(grep "^DATABASE_URL=" "$DEV_VARS_FILE" | cut -d'=' -f2- || echo "not found")
if [ "$PROD_DB_URL" != "not found" ]; then
    print_info "Production DATABASE_URL: ${PROD_DB_URL:0:50}..."
else
    print_warn "DATABASE_URL not found - make sure it's set for production"
fi

echo ""
print_warn "This will remove DEV_DATABASE_URL, causing the API to use DATABASE_URL (production)."
read -p "Continue with rollback? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Rollback cancelled"
    exit 0
fi

print_info "Removing DEV_DATABASE_URL from .dev.vars..."
TEMP_FILE=$(mktemp)
grep -v "^DEV_DATABASE_URL=" "$DEV_VARS_FILE" > "$TEMP_FILE" || true
sed '/^# Local development database URL/d' "$TEMP_FILE" > "${TEMP_FILE}.tmp" && mv "${TEMP_FILE}.tmp" "$TEMP_FILE"
mv "$TEMP_FILE" "$DEV_VARS_FILE"

print_success "Removed DEV_DATABASE_URL from .dev.vars"

echo ""
print_success "Rollback to production database complete!"
echo ""
print_info "API will now use DATABASE_URL (production)."
print_info "To switch back to local database, run: ./scripts/setup-local-db.sh"
