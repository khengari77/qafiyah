#!/usr/bin/env bash

set -euo pipefail

DB_HOST="127.0.0.1"
DEV_DB_PORT="5433"
TEST_DB_PORT="5434"
SETUP_SCRIPT="scripts/setup-database.sh"

log_info() {
  echo "[INFO] $*"
}

log_error() {
  echo "[ERROR] $*" >&2
}

port_is_open() {
  local host=$1
  local port=$2

  if command -v nc >/dev/null 2>&1; then
    nc -z "$host" "$port" >/dev/null 2>&1
  else
    bash -c ">/dev/tcp/$host/$port" >/dev/null 2>&1
  fi
}

main() {
  if [[ ! -x "$SETUP_SCRIPT" ]]; then
    log_error "Setup script not found or not executable: $SETUP_SCRIPT"
    log_error "Make sure you have run: chmod +x $SETUP_SCRIPT"
    exit 1
  fi

  if port_is_open "$DB_HOST" "$DEV_DB_PORT" && port_is_open "$DB_HOST" "$TEST_DB_PORT"; then
    log_info "Local PostgreSQL dev & test databases appear to be running."
    exit 0
  fi

  log_info "Local PostgreSQL databases are not ready. Running setup script..."
  "$SETUP_SCRIPT"
}

main "$@"

