#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Install a macOS LaunchAgent that runs `npm run sync` every 6 hours, so the
# dashboard picks up fresh Discover/USAA data without you doing anything.
# Run once:  npm run schedule
# Stop:      npm run unschedule
# ---------------------------------------------------------------------------
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LABEL="com.summerbudget.sync"
PLIST="$HOME/Library/LaunchAgents/${LABEL}.plist"
NPM_BIN="$(command -v npm)"
NODE_BIN="$(command -v node)"

if [ -z "$NPM_BIN" ] || [ -z "$NODE_BIN" ]; then
  echo "Could not find npm or node on PATH. Install Node first." >&2
  exit 1
fi

mkdir -p "$HOME/Library/LaunchAgents"

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>-lc</string>
    <string>cd "${PROJECT_DIR}" && "${NPM_BIN}" run sync</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key><string>$(dirname "$NODE_BIN"):$(dirname "$NPM_BIN"):/usr/local/bin:/usr/bin:/bin</string>
  </dict>
  <key>StartInterval</key><integer>21600</integer>
  <key>RunAtLoad</key><true/>
  <key>StandardOutPath</key><string>${PROJECT_DIR}/.sync.log</string>
  <key>StandardErrorPath</key><string>${PROJECT_DIR}/.sync.log</string>
</dict>
</plist>
EOF

launchctl unload "$PLIST" 2>/dev/null || true
launchctl load "$PLIST"

echo ""
echo "✓ Auto-sync scheduled — runs every 6 hours, starting now."
echo "  Logs:        ${PROJECT_DIR}/.sync.log"
echo "  Stop:        npm run unschedule"
echo "  Run on demand at any time: npm run sync"
