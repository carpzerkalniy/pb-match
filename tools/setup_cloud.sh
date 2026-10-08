#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Development dependencies only; no Telegram, CRM or production credentials.
npm ci --ignore-scripts --no-audit --no-fund
npx --no-install playwright install --with-deps chromium
python -m unittest discover -s tests -v
npm run check:demo
npm run check:scenarios
