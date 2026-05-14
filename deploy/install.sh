#!/usr/bin/env bash
# HR67 server installer for Ubuntu/Debian.
# Run as root from anywhere — script auto-detects repo path.
#
#   sudo bash deploy/install.sh
#
# What it does:
#   1. Installs nginx, git, python3-venv, Go 1.22, Node 20
#   2. Builds Python venv, Go binary, frontend dist
#   3. Installs systemd units (hr67-agent, hr67-backend)
#   4. Installs nginx site config and reloads nginx
#   5. Opens port 80 in ufw (if active)
#   6. Starts services

set -euo pipefail

if [[ $EUID -ne 0 ]]; then
    echo "Run as root: sudo bash deploy/install.sh" >&2
    exit 1
fi

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "==> Repo path: $REPO"

# ---------- 1. apt deps ----------
echo "==> Installing apt packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y nginx git curl ca-certificates python3 python3-venv python3-pip ufw

# ---------- Go 1.22 ----------
if ! command -v go >/dev/null 2>&1 || ! go version | grep -q "go1.2"; then
    echo "==> Installing Go 1.22..."
    GO_TGZ=/tmp/go1.22.5.linux-amd64.tar.gz
    curl -fsSL -o "$GO_TGZ" https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
    rm -rf /usr/local/go
    tar -C /usr/local -xzf "$GO_TGZ"
    rm -f "$GO_TGZ"
    echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
fi
export PATH=$PATH:/usr/local/go/bin

# ---------- Node 20 ----------
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -qE "^v(2[0-9]|[3-9][0-9])"; then
    echo "==> Installing Node 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# ---------- 2a. Python agent ----------
echo "==> Building Python agent venv..."
AGENT_DIR="$REPO/python_agent/hr_agent"
python3 -m venv "$AGENT_DIR/.venv"
"$AGENT_DIR/.venv/bin/pip" install --upgrade pip
"$AGENT_DIR/.venv/bin/pip" install -r "$AGENT_DIR/requirements.txt"

if [[ ! -f "$AGENT_DIR/.env" ]]; then
    echo "USE_MOCK=true" > "$AGENT_DIR/.env"
fi

# ---------- 2b. Go backend ----------
echo "==> Building Go backend..."
cd "$REPO/backend"
/usr/local/go/bin/go mod download
/usr/local/go/bin/go build -o /usr/local/bin/hr67-backend .

# ---------- 2c. Frontend ----------
echo "==> Building frontend..."
cd "$REPO/frontend"
echo "VITE_API_BASE_URL=/api" > .env.production
npm ci --no-audit --no-fund
npm run build

# ---------- 3. systemd units ----------
echo "==> Installing systemd units..."
chown -R www-data:www-data "$REPO"

sed "s|__REPO__|$REPO|g" "$REPO/deploy/hr67-agent.service"   > /etc/systemd/system/hr67-agent.service
sed "s|__REPO__|$REPO|g" "$REPO/deploy/hr67-backend.service" > /etc/systemd/system/hr67-backend.service

systemctl daemon-reload
systemctl enable hr67-agent hr67-backend
systemctl restart hr67-agent
sleep 2
systemctl restart hr67-backend

# ---------- 4. nginx ----------
echo "==> Configuring nginx..."
sed "s|__REPO__|$REPO|g" "$REPO/deploy/hr67.nginx.conf" > /etc/nginx/sites-available/hr67
ln -sf /etc/nginx/sites-available/hr67 /etc/nginx/sites-enabled/hr67
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# ---------- 5. firewall ----------
if ufw status | grep -q "Status: active"; then
    echo "==> Opening port 80 in ufw..."
    ufw allow 80/tcp || true
fi

# ---------- 6. report ----------
IP="$(curl -fsS https://api.ipify.org || hostname -I | awk '{print $1}')"
echo
echo "============================================="
echo " HR67 deployed."
echo " Open: http://$IP/"
echo "       http://$IP/apply"
echo
echo " Logs:"
echo "   journalctl -u hr67-agent -f"
echo "   journalctl -u hr67-backend -f"
echo "   tail -f /var/log/nginx/error.log"
echo "============================================="
