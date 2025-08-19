#!/usr/bin/env bash
set -euo pipefail

# Activate venv (Windows Git Bash vs POSIX)
if [ -f ".aiagent/Scripts/activate" ]; then
  # shellcheck disable=SC1091
  source .aiagent/Scripts/activate
elif [ -f ".aiagent/bin/activate" ]; then
  # shellcheck disable=SC1091
  source .aiagent/bin/activate
else
  echo "Virtual environment not found. Run scripts/setup_aiagent.sh first." >&2
  exit 1
fi

exec python -m uvicorn backend.main:app --reload --port 8000

