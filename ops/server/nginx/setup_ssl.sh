#!/usr/bin/env bash
set -euo pipefail

# SSL setup helper
# Usage: ./setup_ssl.sh your-domain.com email@example.com

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [ -z "$DOMAIN" ] || [ -z "$EMAIL" ]; then
  echo "Usage: $0 domain email"
  exit 1
fi

if ! command -v certbot >/dev/null 2>&1; then
  echo "Installing certbot..."
  sudo apt-get update
  sudo apt-get install -y certbot python3-certbot-nginx
fi

sudo certbot --nginx -d "$DOMAIN" --email "$EMAIL" --agree-tos --non-interactive

sudo systemctl reload nginx

echo "SSL setup completed for $DOMAIN"
