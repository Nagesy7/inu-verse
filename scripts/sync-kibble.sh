#!/bin/sh
# Vendor the shared character profile schema + renderer from kibble-pay (single source of truth).
set -e; K=${KIBBLE:-/workspace/kibble-pay}
cp "$K/public/inu-avatar.js" src/vendor/inu-avatar.js; cp "$K/public/lib/profile-schema.js" src/vendor/profile-schema.js; echo synced
