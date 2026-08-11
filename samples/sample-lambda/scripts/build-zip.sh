#!/usr/bin/env bash
#
# Packages the compiled Node-Boot Lambda application into a deployable
# lambda.zip artifact, ready to be uploaded via `aws lambda update-function-code`
# or referenced directly by CloudFormation/SAM/Serverless Framework.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [ ! -d "dist" ]; then
  echo "❌ 'dist' folder not found. Run 'pnpm run build' before packaging." >&2
  exit 1
fi

echo "📦 Packaging Lambda artifact..."
rm -f lambda.zip

# Compiled application code
(cd dist && zip -rq ../lambda.zip . -x "*.map")

# Only ship production dependencies to keep the bundle small
if [ -d "node_modules" ]; then
  (cd node_modules && zip -rq ../lambda.zip . -x ".bin/*")
fi

echo "✅ Created $(pwd)/lambda.zip"
