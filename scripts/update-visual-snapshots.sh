#!/usr/bin/env bash
#
# Regenerate Playwright visual-regression baselines for Storybook stories.
#
# Baselines in e2e/visual-regression.spec.ts-snapshots/ are platform-suffixed
# (-linux.png) and must be produced on Linux so they match CI (ubuntu-latest).
#
# Usage:
#   pnpm test:visual:update                  # native run (devcontainer / Linux)
#   pnpm test:visual:update -- --docker      # run inside the Playwright image
#
# --docker mounts the repo read-only at /src, copies it into the container
# (excluding node_modules and build output), runs pnpm install + build +
# update there, and writes regenerated baselines back through a bind mount of
# the snapshots directory. Host node_modules are left untouched, so this is
# safe on macOS/Windows hosts.
#
# Environment overrides:
#   PLAYWRIGHT_IMAGE   image for --docker (default: mcr.microsoft.com/playwright
#                      tag matching the installed @playwright/test version)
#   STORYBOOK_PORT     port for the static Storybook server (default: 6099)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

SNAPSHOT_DIR="e2e/visual-regression.spec.ts-snapshots"
PORT="${STORYBOOK_PORT:-6099}"
BASE="http://localhost:${PORT}"

if [ "${1:-}" = "--docker" ]; then
  if ! command -v docker >/dev/null; then
    echo "error: --docker requires docker on PATH" >&2
    exit 1
  fi
  PW_VERSION="$(node -p "require('@playwright/test/package.json').version")"
  IMAGE="${PLAYWRIGHT_IMAGE:-mcr.microsoft.com/playwright:v${PW_VERSION}-noble}"
  mkdir -p "$SNAPSHOT_DIR"
  echo "==> Running baseline update inside $IMAGE"
  exec docker run --rm --ipc=host \
    -v "$REPO_ROOT:/src:ro" \
    -v "$REPO_ROOT/$SNAPSHOT_DIR:/work/$SNAPSHOT_DIR" \
    "$IMAGE" bash -c '
      set -euo pipefail
      mkdir -p /work
      # The snapshots dir is bind-mounted at /work — exclude it from the copy.
      tar cf - -C /src \
        --exclude=node_modules --exclude=.next --exclude=storybook-static \
        --exclude=.git --exclude=.pnpm-store --exclude=test-results \
        --exclude=playwright-report \
        --exclude=e2e/visual-regression.spec.ts-snapshots \
        . | tar xf - -C /work
      cd /work
      corepack enable
      pnpm install --frozen-lockfile
      bash scripts/update-visual-snapshots.sh
    '
fi

if [ "${1:-}" != "" ]; then
  echo "error: unknown argument: $1 (expected --docker or no arguments)" >&2
  exit 2
fi

if [ "$(uname -s)" != "Linux" ]; then
  echo "error: baselines must be regenerated on Linux so they match CI" >&2
  echo "       (snapshots are platform-suffixed -linux.png). Re-run inside the" >&2
  echo "       devcontainer, or pass --docker to use the Playwright container." >&2
  exit 1
fi

echo "==> Ensuring Playwright browsers are installed"
# No-op inside the Playwright image (browsers are preinstalled) or when the
# local cache is already populated. Distros/architectures Playwright does not
# ship browsers for can use --docker instead.
if ! pnpm exec playwright install chromium; then
  echo "error: could not install Playwright browsers on this host." >&2
  echo "       Re-run with --docker to use the Playwright container instead." >&2
  exit 1
fi

echo "==> Building Storybook"
pnpm build-storybook

echo "==> Serving storybook-static on :${PORT}"
SERVER_LOG="/tmp/storybook-static-server.$$.log"
npx --yes http-server storybook-static --port "$PORT" --silent >"$SERVER_LOG" 2>&1 &
SERVER_PID=$!
cleanup() {
  kill "$SERVER_PID" 2>/dev/null || true
  rm -f "$SERVER_LOG"
}
trap cleanup EXIT

npx --yes wait-on "${BASE}/index.json" --timeout 60000

echo "==> Updating baselines in $SNAPSHOT_DIR"
# BASE_URL disables playwright.config.ts webServer so it does not spawn pnpm dev.
STORYBOOK_URL="$BASE" BASE_URL="$BASE" \
  pnpm exec playwright test --project=visual-regression --update-snapshots=all

echo "==> Done. Review changes with: git status $SNAPSHOT_DIR"
