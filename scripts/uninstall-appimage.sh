#!/bin/bash
set -euo pipefail

APP_NAME="pomidori-clock"

echo "Uninstalling ${APP_NAME} AppImage..."

# Find and remove AppImage files
FOUND=0
for f in "${HOME}/Downloads/${APP_NAME}"*.AppImage "${HOME}/Desktop/${APP_NAME}"*.AppImage /opt/"${APP_NAME}"*.AppImage; do
  if [ -f "$f" ]; then
    echo "Removing ${f}"
    rm -f "$f"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 0 ]; then
  echo "No AppImage files found. If you moved it, delete it manually."
fi

# Remove desktop entry and icon if created by AppImageLauncher
DESKTOP_FILE="${HOME}/.local/share/applications/${APP_NAME}.desktop"
if [ -f "$DESKTOP_FILE" ]; then
  echo "Removing ${DESKTOP_FILE}"
  rm -f "$DESKTOP_FILE"
fi

ICON="${HOME}/.local/share/icons/hicolor/256x256/apps/${APP_NAME}.png"
if [ -f "$ICON" ]; then
  echo "Removing ${ICON}"
  rm -f "$ICON"
fi

echo "Done. ${APP_NAME} has been uninstalled."
