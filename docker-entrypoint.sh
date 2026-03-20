#!/bin/sh
# Auto-seed admin user if ADMIN_PASSWORD is set
if [ -n "$ADMIN_PASSWORD" ]; then
  node src/scripts/seed-admin.js
fi

exec node src/server.js
