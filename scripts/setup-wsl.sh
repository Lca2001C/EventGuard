#!/usr/bin/env bash
set -euo pipefail

echo "EventGuard WSL/Linux setup"

if command -v node >/dev/null 2>&1; then
  NODE_PATH="$(command -v node)"
else
  NODE_PATH=""
fi

if [[ -z "$NODE_PATH" || "$NODE_PATH" == /mnt/c/* ]]; then
  cat <<'EOF'
Node.js for Linux/WSL was not found.

You are probably using the Windows Node.js from /mnt/c/Program Files/nodejs.
Install Node.js inside WSL, then run this script again.

Recommended with nvm:

  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc
  nvm install 22
  nvm use 22

Then:

  bash scripts/setup-wsl.sh

EOF
  exit 1
fi

if ! command -v corepack >/dev/null 2>&1; then
  echo "Corepack was not found. Install Node.js 22 LTS inside WSL and run this script again."
  exit 1
fi

COREPACK_PATH="$(command -v corepack)"
if [[ "$COREPACK_PATH" == /mnt/c/* ]]; then
  cat <<'EOF'
The corepack command is coming from Windows, not WSL.

Install Node.js inside WSL with nvm:

  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.bashrc
  nvm install 22
  nvm use 22

Then run:

  bash scripts/setup-wsl.sh

EOF
  exit 1
fi

echo "Enabling Corepack..."
corepack enable

echo "Activating pnpm 11.7.0..."
corepack prepare pnpm@11.7.0 --activate

echo "Installing dependencies..."
corepack pnpm install

echo "Approving dependency build scripts..."
corepack pnpm approve-builds --all

echo "Generating Prisma Client..."
corepack pnpm db:generate

echo "Setup complete."
echo "Next steps:"
echo "  docker compose up -d postgres redis"
echo "  corepack pnpm db:migrate"
echo "  corepack pnpm db:seed"
echo "  corepack pnpm dev"
