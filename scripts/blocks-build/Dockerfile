# Hatch · Gutenberg blocks build image
#
# `@wordpress/scripts@28` (which pulls a webpack/schema-utils stack written
# against Node 18) crashes on Node 22 with `ajv-keywords` / `schema-utils`
# version drift. Pinning the host's Node down to 18 just for the plugin
# build is a bad ergonomic. We isolate the compile inside this image
# instead — the host can be on any Node, this image always sees Node 18.
#
# Build:
#   docker build -t hatch-blocks:18 scripts/blocks-build/
#
# Run from the repo root:
#   docker run --rm -v "$PWD/wp-plugin:/app" hatch-blocks:18
#
# Or use the wrapper at scripts/blocks-build/build.sh.

FROM node:18.20-bookworm-slim

# Bare-minimum tools (no build-essential — wp-scripts ships its own toolchain).
RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Allow npm to keep its cache between runs if the host mounts one.
ENV NPM_CONFIG_CACHE=/root/.npm
ENV NODE_ENV=production

# The repo's `wp-plugin/` gets mounted at /app. We install then build.
CMD ["sh", "-c", "set -e; \
    echo '→ npm install (Node 18.x)'; \
    npm install --prefer-offline --no-fund --no-audit; \
    echo '→ npm run build:all'; \
    npm run build:all; \
    echo '✓ build/ ready in $(pwd)/build'"]
