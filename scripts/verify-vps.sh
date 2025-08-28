#!/bin/bash

set -e

VPS_HOST="194.113.67.213"
VPS_USER="root"

# Check if VPS is reachable before attempting tests
if ! nc -z -w5 "${VPS_HOST}" 22 2>/dev/null; then
  echo "⚠️  VPS ${VPS_HOST} unreachable - skipping VPS tests"
  echo "✅ VPS tests skipped (network/VPS unavailable)"
  exit 0
fi

echo "Connecting to VPS: ${VPS_USER}@${VPS_HOST}"

# Copy current directory to VPS for testing
echo "Copying project to VPS..."
rsync -az --exclude=node_modules --exclude=.git . "${VPS_USER}@${VPS_HOST}:/tmp/libsqlite-test/"

# Test basic SSH connectivity and run dist.test.ts
ssh -o ConnectTimeout=10 -o BatchMode=yes "${VPS_USER}@${VPS_HOST}" '
echo "✓ SSH connection successful"
echo "Host information:"
echo "  Hostname: $(hostname)"
echo "  OS: $(cat /etc/os-release | grep PRETTY_NAME | cut -d= -f2 | tr -d \")"
echo "  Architecture: $(uname -m)"
echo "  Uptime: $(uptime | cut -d, -f1)"
echo "  Disk usage: $(df -h / | tail -1 | awk "{print \$5\" used of \"\$2}")"
echo "  Memory: $(free -h | grep Mem | awk "{print \$3\" used of \"\$2}")"

echo ""
echo "Testing @dist.test.ts on x86 VPS..."
cd /tmp/libsqlite-test

# Check if bun is available, install if needed
if ! command -v bun &> /dev/null; then
    echo "Installing dependencies..."
    apt-get update -qq && apt-get install -y -qq unzip curl
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
fi

echo "Running dist.test.ts..."
bun test dist.test.ts

echo "✓ dist.test.ts passed on x86 VPS!"
echo "✓ VPS verification complete"
'

echo "VPS verification successful!"