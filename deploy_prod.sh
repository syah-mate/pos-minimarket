#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DIST_DIR="$ROOT_DIR/dist"
STANDALONE_SRC="$ROOT_DIR/.next/standalone"
STANDALONE_OUT="$DIST_DIR/standalone"
VERSION="$(node -p "require('./package.json').version" 2>/dev/null || echo "0.0.0")"
PORT="${PORT:-7888}"
ENV_FILE="${ENV_FILE:-.env.production}"

detect_package_manager() {
  if [[ -f "$ROOT_DIR/bun.lock" || -f "$ROOT_DIR/bun.lockb" ]]; then
    echo "bun"
    return
  fi

  if [[ -f "$ROOT_DIR/package-lock.json" ]]; then
    echo "npm"
    return
  fi

  if [[ -f "$ROOT_DIR/pnpm-lock.yaml" ]]; then
    echo "pnpm"
    return
  fi

  if [[ -f "$ROOT_DIR/yarn.lock" ]]; then
    echo "yarn"
    return
  fi

  echo "npm"
}

install_dependencies() {
  case "$1" in
    bun)
      bun install --frozen-lockfile
      ;;
    npm)
      npm ci
      ;;
    pnpm)
      pnpm install --frozen-lockfile
      ;;
    yarn)
      yarn install --frozen-lockfile
      ;;
    *)
      echo "ERROR: unsupported package manager: $1" >&2
      exit 1
      ;;
  esac
}

install_production_dependencies() {
  case "$1" in
    bun)
      [[ -f "$ROOT_DIR/bun.lock" ]] && cp "$ROOT_DIR/bun.lock" "$STANDALONE_OUT/bun.lock"
      [[ -f "$ROOT_DIR/bun.lockb" ]] && cp "$ROOT_DIR/bun.lockb" "$STANDALONE_OUT/bun.lockb"
      (cd "$STANDALONE_OUT" && bun install --production --frozen-lockfile)
      ;;
    npm)
      cp "$ROOT_DIR/package-lock.json" "$STANDALONE_OUT/package-lock.json"
      (cd "$STANDALONE_OUT" && npm ci --omit=dev)
      ;;
    pnpm)
      cp "$ROOT_DIR/pnpm-lock.yaml" "$STANDALONE_OUT/pnpm-lock.yaml"
      (cd "$STANDALONE_OUT" && pnpm install --prod --frozen-lockfile)
      ;;
    yarn)
      cp "$ROOT_DIR/yarn.lock" "$STANDALONE_OUT/yarn.lock"
      (cd "$STANDALONE_OUT" && yarn install --frozen-lockfile --production=true)
      ;;
    *)
      echo "ERROR: unsupported package manager: $1" >&2
      exit 1
      ;;
  esac
}

PACKAGE_MANAGER="${PACKAGE_MANAGER:-$(detect_package_manager)}"

echo "==> Deploying pos-minimarket v${VERSION} (standalone)"
echo "==> Using package manager: ${PACKAGE_MANAGER}"

if [[ ! -f "$ROOT_DIR/$ENV_FILE" ]]; then
  echo "==> WARN: $ENV_FILE not found -- build/runtime use defaults"
fi

echo "==> Installing dependencies"
install_dependencies "$PACKAGE_MANAGER"

if [[ "${SKIP_BUILD:-0}" != "1" ]]; then
  echo "==> Building (next build, output: standalone)"
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" npx next build
else
  echo "==> SKIP_BUILD=1 -- reusing existing .next"
fi

if [[ ! -d "$STANDALONE_SRC" ]]; then
  echo "ERROR: $STANDALONE_SRC not found. Is output:'standalone' set in next.config.ts?" >&2
  exit 1
fi

echo "==> Assembling standalone bundle into $STANDALONE_OUT"
rm -rf "$STANDALONE_OUT"
mkdir -p "$STANDALONE_OUT"

cp -r "$STANDALONE_SRC/." "$STANDALONE_OUT/"
mkdir -p "$STANDALONE_OUT/.next"
cp -r "$ROOT_DIR/.next/static" "$STANDALONE_OUT/.next/static"
[[ -d "$ROOT_DIR/public" ]] && cp -r "$ROOT_DIR/public" "$STANDALONE_OUT/public"

if [[ -f "$ROOT_DIR/$ENV_FILE" ]]; then
  echo "==> Bundling $ENV_FILE into bundle"
  cp "$ROOT_DIR/$ENV_FILE" "$STANDALONE_OUT/.env.production"
fi

if [[ "${PRUNE_PROD:-0}" == "1" ]]; then
  echo "==> Installing production dependencies inside bundle (PRUNE_PROD=1)"
  cp "$ROOT_DIR/package.json" "$STANDALONE_OUT/package.json"
  install_production_dependencies "$PACKAGE_MANAGER"
fi

cat > "$STANDALONE_OUT/run.sh" <<EOF
#!/usr/bin/env bash
set -e
export NODE_ENV=production
export PORT=\${PORT:-$PORT}
export HOSTNAME=\${HOSTNAME:-0.0.0.0}
exec node server.js
EOF
chmod +x "$STANDALONE_OUT/run.sh"

mkdir -p "$DIST_DIR"
TARBALL="$DIST_DIR/pos-minimarket-standalone-${VERSION}.tar.gz"
echo "==> Packaging $TARBALL"
tar -czf "$TARBALL" -C "$DIST_DIR" standalone

echo ""
echo "==> Done."
echo "    Bundle:  $STANDALONE_OUT"
echo "    Tarball: $TARBALL"
echo "    Upload:  scp dist/pos-minimarket-standalone-${VERSION}.tar.gz user@host:/tmp/"
echo "    Extract: tar -xzf pos-minimarket-standalone-${VERSION}.tar.gz --strip-components=1"
echo "    Run:     cd $STANDALONE_OUT && PORT=$PORT ./run.sh"
