#!/usr/bin/env bash
# Quick redeploy after code changes (no apt installs, no nginx changes).
#   sudo bash deploy/update.sh

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Run as root: sudo bash deploy/update.sh" >&2
    exit 1
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export PATH=$PATH:/usr/local/go/bin

echo "==> Rebuilding Go backend..."
cd "$REPO/backend"
go mod download
go build -o /usr/local/bin/hr67-backend .

echo "==> Rebuilding frontend..."
cd "$REPO/frontend"
npm ci --no-audit --no-fund
npm run build

echo "==> Reinstalling Python deps (in case requirements.txt changed)..."
"$REPO/python_agent/hr_agent/.venv/bin/pip" install -r "$REPO/python_agent/hr_agent/requirements.txt"

chown -R www-data:www-data "$REPO"

echo "==> Restarting services..."
systemctl restart hr67-agent
sleep 2
systemctl restart hr67-backend
systemctl reload nginx

echo "Done."
