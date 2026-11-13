#!/usr/bin/env bash
# Start BUDDY herbal on macOS / Linux.  Usage:  bash start.sh
set -e
cd "$(dirname "$0")"

if [ ! -x ".venv/bin/python" ]; then
  echo ""
  echo " First run - creating the Python environment, this takes a minute..."
  echo ""
  python3 -m venv .venv
  .venv/bin/python -m pip install --upgrade pip
  .venv/bin/python -m pip install -r requirements.txt
fi

echo ""
echo " Starting BUDDY herbal ... press Ctrl+C to stop."
echo ""
exec .venv/bin/python run.py --open
