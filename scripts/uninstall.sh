#!/bin/bash
set -euo pipefail

APP_NAME="pomidori-clock"
BUNDLE_ID="com.pomidori-clock.dev"

echo "Uninstalling ${APP_NAME}..."

# Kill if running
if pgrep -x "$APP_NAME" > /dev/null 2>&1; then
  echo "Stopping ${APP_NAME}..."
  pkill -x "$APP_NAME" || true
  sleep 1
fi

# Remove app bundle
APP_PATH="/Applications/${APP_NAME}.app"
if [ -d "$APP_PATH" ]; then
  echo "Removing ${APP_PATH}"
  rm -rf "$APP_PATH"
fi

# Remove user data
DIRS=(
  "${HOME}/Library/Application Support/${BUNDLE_ID}"
  "${HOME}/Library/Caches/${BUNDLE_ID}"
  "${HOME}/Library/Saved Application State/${BUNDLE_ID}.savedState"
)
PLIST="${HOME}/Library/Preferences/${BUNDLE_ID}.plist"

for dir in "${DIRS[@]}"; do
  if [ -d "$dir" ]; then
    echo "Removing ${dir}"
    rm -rf "$dir"
  fi
done

if [ -f "$PLIST" ]; then
  echo "Removing ${PLIST}"
  rm -f "$PLIST"
done

echo "Done. ${APP_NAME} has been uninstalled."
