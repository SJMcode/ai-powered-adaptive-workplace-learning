#!/usr/bin/env bash
set -euo pipefail

# Create venv
if command -v python3 >/dev/null 2>&1; then
  python3 -m venv .aiagent
else
  python -m venv .aiagent
fi

# Activate venv (Windows Git Bash vs POSIX)
if [ -f ".aiagent/Scripts/activate" ]; then
  # Windows
  # shellcheck disable=SC1091
  source .aiagent/Scripts/activate
else
  # POSIX
  # shellcheck disable=SC1091
  source .aiagent/bin/activate
fi

python -m pip install --upgrade pip

# Install backend dependencies

pip install -r backend/requirements.txt

# Install CrewAI
pip install crewai

echo "Virtual env ready at .aiagent"

