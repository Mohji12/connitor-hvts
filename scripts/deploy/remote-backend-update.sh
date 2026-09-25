#!/usr/bin/env bash
# Run ON the EC2 host (invoked by deploy-backend.ps1).
set -euo pipefail

REMOTE_DIR="${1:-.}"
SYSTEMD_SERVICE="${2:-conni}"
USE_DOCKER="${3:-0}"
MIGRATE_SCRIPTS="${4:-}"
VENV_DIR="${5:-conni}"

cd "$REMOTE_DIR"

if [[ -d python_backend ]]; then
  APP_DIR="python_backend"
else
  APP_DIR="."
fi

cd "$APP_DIR"

if [[ ! -f main.py ]]; then
  echo "ERROR: main.py not found under $PWD" >&2
  exit 1
fi

echo "==> Installing Python deps (venv=$VENV_DIR)"
if [[ -d "$VENV_DIR" ]]; then
  # shellcheck disable=SC1090
  source "$VENV_DIR/bin/activate"
elif [[ -d .venv ]]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
else
  python3 -m venv "$VENV_DIR"
  # shellcheck disable=SC1090
  source "$VENV_DIR/bin/activate"
fi
pip install -q --upgrade pip
pip install -q -r requirements.txt

if [[ -n "$MIGRATE_SCRIPTS" ]]; then
  export PYTHONPATH="${PWD}${PYTHONPATH:+:$PYTHONPATH}"
  IFS=',' read -ra SCRIPTS <<< "$MIGRATE_SCRIPTS"
  for s in "${SCRIPTS[@]}"; do
    s="$(echo "$s" | xargs)"
    [[ -z "$s" ]] && continue
    echo "==> Migration: $s"
    if [[ -f "scripts/$s" ]]; then
      python "scripts/$s" --yes || python "scripts/$s" || true
    else
      echo "WARN: scripts/$s not found, skipping"
    fi
  done
fi

echo "==> Restarting API ($SYSTEMD_SERVICE)"
if [[ "$USE_DOCKER" == "1" ]]; then
  if [[ -f docker-compose.yml ]]; then
    docker compose up -d --build
  elif [[ -f ../docker-compose.yml ]]; then
    (cd .. && docker compose up -d --build)
  else
    echo "ERROR: docker compose file not found" >&2
    exit 1
  fi
else
  if systemctl cat "${SYSTEMD_SERVICE}.service" >/dev/null 2>&1; then
    sudo systemctl restart "$SYSTEMD_SERVICE"
    sleep 2
    sudo systemctl --no-pager --full status "$SYSTEMD_SERVICE" | head -n 25 || true
  elif command -v pm2 >/dev/null 2>&1; then
    pm2 restart connitor-api || pm2 restart all
  else
    echo "WARN: No systemd unit '${SYSTEMD_SERVICE}.service'. Restart gunicorn manually."
  fi
fi

echo "==> remote-backend-update done"
