#!/usr/bin/env bash
# Atlas Boards — double-click this file in Finder to launch
# Your boards, tasks, calendar, and habits are saved in this browser at http://localhost:5173

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Atlas Boards — local planner & mind map"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Data is stored in your browser (IndexedDB)."
echo "  Use the same URL each time so nothing is lost."
echo ""

if [ ! -d "node_modules" ]; then
  echo "First run — installing dependencies (one time)…"
  npm install
  echo ""
fi

echo "Starting Atlas Boards at http://localhost:5173"
echo "Press Ctrl+C in this window to stop the server."
echo ""

(sleep 2.5 && open "http://localhost:5173/#/dashboard") &

npm run dev
