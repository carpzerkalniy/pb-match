#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/check_swipe_browser.cjs "${1:-cloud-current}" "${2:-}"
