#!/usr/bin/env bash
# Wipe CN Chat data on the production server for a fresh start (e.g. before a presentation).
# Everything is backed up first and the script prints the restore command.
#
#   sudo bash reset-data.sh                   wipe accounts, groups, channels, DMs, messages and files
#   sudo bash reset-data.sh --keep-accounts   keep accounts/profiles; wipe everything else and log everyone out
set -euo pipefail
DATA_DIR=/var/lib/cn-chat
DATA_FILE="$DATA_DIR/chat-data.json"
NODE=/opt/node/current/bin/node
[ "$(id -u)" = 0 ] || { echo "Run with sudo: sudo bash $0 $*"; exit 1; }
MODE=all; [ "${1:-}" = "--keep-accounts" ] && MODE=keep-accounts

if [ "$MODE" = keep-accounts ]; then
  echo "This deletes ALL groups, channels, DMs, messages and files. Accounts and profiles stay; everyone must log in again."
else
  echo "This deletes EVERYTHING: accounts, groups, channels, DMs, messages and files."
fi
read -r -p "Type RESET to continue: " answer
[ "$answer" = RESET ] || { echo "Cancelled. Nothing was changed."; exit 1; }

TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="/var/lib/cn-chat-reset-backup-$TS"
OWNER="$(stat -c %U:%G "$DATA_DIR")"

systemctl stop cn-chat            # the server flushes pending saves on SIGTERM
cp -a "$DATA_DIR" "$BACKUP"
echo "Backup: $BACKUP ($(du -sh "$BACKUP" | cut -f1))"

rm -rf "$DATA_DIR/uploads"
if [ "$MODE" = keep-accounts ] && [ -f "$BACKUP/chat-data.json" ]; then
  "$NODE" -e '
    const fs = require("fs");
    const [src, dst] = process.argv.slice(1);
    const data = JSON.parse(fs.readFileSync(src, "utf8"));
    const accounts = data.accounts.map(account => ({ ...account, unread: {}, clearedAt: {} }));
    fs.writeFileSync(dst, JSON.stringify({ accounts, sessions: [], groups: [], channels: [], histories: [],
      directRooms: [], files: [], readState: [] }), { mode: 0o600 });
  ' "$BACKUP/chat-data.json" "$DATA_FILE.tmp"
  chown "$OWNER" "$DATA_FILE.tmp"
  mv "$DATA_FILE.tmp" "$DATA_FILE"
else
  rm -f "$DATA_FILE"              # a missing data file starts the server empty
fi

systemctl start cn-chat
sleep 2
if systemctl is-active --quiet cn-chat; then
  echo "OK: cn-chat restarted with clean data ($MODE)."
else
  echo "WARNING: cn-chat did not start. Check: journalctl -u cn-chat -n 30"
fi
echo "To undo this reset:"
echo "  sudo systemctl stop cn-chat && sudo rm -rf $DATA_DIR && sudo cp -a $BACKUP $DATA_DIR && sudo systemctl start cn-chat"
