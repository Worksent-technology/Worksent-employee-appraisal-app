#!/usr/bin/env bash
# One-time provisioning for a fresh Ubuntu 22.04/24.04 EC2 instance:
# Docker + Compose, a native PostgreSQL server reachable from containers,
# swap (small instances OOM during `next build` otherwise), and a locked-down
# firewall. Writes best-employee-app/.env for docker-compose to consume.
#
# Usage (from the repo root, as the ubuntu user with sudo):
#   ./scripts/setup-ec2.sh
#
# Override generated values if you want specific ones:
#   POSTGRES_PASSWORD=... AUTH_SECRET=... ./scripts/setup-ec2.sh
#
# Re-running is safe: every step checks current state before changing it.

set -euo pipefail

if [[ "$(id -u)" -eq 0 ]]; then
  echo "Run this as your normal login user (e.g. ubuntu), not root/sudo directly." >&2
  echo "The script calls sudo itself for the commands that need it." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$APP_DIR/.env"

POSTGRES_USER="${POSTGRES_USER:-app}"
POSTGRES_DB="${POSTGRES_DB:-best_employee_app}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-$(openssl rand -hex 16)}"
AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 32)}"

echo "==> Updating apt and installing base packages"
sudo apt-get update -y
sudo apt-get upgrade -y
sudo apt-get install -y ca-certificates curl gnupg git ufw

echo "==> Installing Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  # shellcheck disable=SC1091
  UBUNTU_CODENAME="$(. /etc/os-release && echo "$VERSION_CODENAME")"
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $UBUNTU_CODENAME stable" |
    sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  echo "    docker already installed, skipping"
fi
sudo systemctl enable --now docker

if ! groups "$USER" | grep -qw docker; then
  sudo usermod -aG docker "$USER"
  echo "    Added $USER to the docker group — log out/in (or run 'newgrp docker') before using docker without sudo."
fi

echo "==> Installing PostgreSQL"
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

PG_CONF="$(sudo -u postgres psql -tAc 'SHOW config_file;')"
PG_HBA="$(sudo -u postgres psql -tAc 'SHOW hba_file;')"

echo "==> Configuring PostgreSQL to accept connections from Docker containers"
if ! sudo grep -qE "^\s*listen_addresses\s*=\s*'\*'" "$PG_CONF"; then
  sudo sed -i -E "s/^\s*#?\s*listen_addresses\s*=.*/listen_addresses = '*'/" "$PG_CONF"
fi

# The compose app container reaches the host via host.docker.internal, which
# resolves to the docker bridge gateway — always inside 172.16.0.0/12 for
# Docker's default address pools. Security groups / ufw still block this
# range from the public internet; this only opens it to containers on this host.
DOCKER_HBA_RULE="host    ${POSTGRES_DB}    ${POSTGRES_USER}    172.16.0.0/12    md5"
if ! sudo grep -qF "$DOCKER_HBA_RULE" "$PG_HBA"; then
  echo "$DOCKER_HBA_RULE" | sudo tee -a "$PG_HBA" >/dev/null
fi

sudo systemctl restart postgresql

echo "==> Creating database role and database"
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${POSTGRES_USER}') THEN
    CREATE ROLE "${POSTGRES_USER}" LOGIN PASSWORD '${POSTGRES_PASSWORD}';
  ELSE
    ALTER ROLE "${POSTGRES_USER}" WITH PASSWORD '${POSTGRES_PASSWORD}';
  END IF;
END
\$\$;

SELECT 'CREATE DATABASE "${POSTGRES_DB}" OWNER "${POSTGRES_USER}"'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${POSTGRES_DB}')
\gexec
SQL

echo "==> Configuring firewall (ufw)"
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw --force enable
# Port 5432 is deliberately NOT opened: ufw's default-deny blocks it from the
# internet, while pg_hba.conf above still allows the docker bridge through.

echo "==> Ensuring swap (small instances OOM during 'npm run build' otherwise)"
if ! sudo swapon --show | grep -q .; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
else
  echo "    swap already active, skipping"
fi

echo "==> Writing $ENV_FILE for docker-compose"
if [[ -f "$ENV_FILE" ]]; then
  echo "    $ENV_FILE already exists — leaving it untouched."
  echo "    (Delete it and re-run this script if you want it regenerated.)"
else
  cat >"$ENV_FILE" <<EOF
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=${POSTGRES_DB}
AUTH_SECRET=${AUTH_SECRET}
EOF
  chmod 600 "$ENV_FILE"
  echo "    Wrote generated credentials to $ENV_FILE (mode 600)."
fi

cat <<EOF

==> Done.

Postgres:  running natively on this host, database "${POSTGRES_DB}" / role "${POSTGRES_USER}"
Env file:  ${ENV_FILE}
Firewall:  only 22 (SSH) and 80 (app) are open — make sure the EC2 security
           group also only allows those two ports inbound.

If this is your first time in this shell session, log out and back in (or
run 'newgrp docker') so your docker group membership takes effect, then:

  cd ${APP_DIR}
  docker compose up -d --build
EOF
