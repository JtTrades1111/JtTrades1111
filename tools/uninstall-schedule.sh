#!/usr/bin/env bash
# Stop and remove the auto-sync LaunchAgent.
set -euo pipefail
LABEL="com.summerbudget.sync"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
if [ -f "$PLIST" ]; then
  launchctl unload "$PLIST" 2>/dev/null || true
  rm -f "$PLIST"
  echo "✓ Auto-sync stopped and uninstalled."
else
  echo "Nothing to uninstall — no LaunchAgent at ${PLIST}."
fi
