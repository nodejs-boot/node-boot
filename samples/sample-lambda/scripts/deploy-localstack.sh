#!/usr/bin/env bash
#
# Builds, packages and deploys this Node-Boot Lambda sample to a local LocalStack
# instance (REST API Gateway + Lambda), so you can exercise the full request/response
# path (API Gateway proxy integration -> Lambda -> NodeBoot router) without touching
# real AWS infrastructure or the Serverless Framework.
#
# Prerequisites:
#   - Docker running LocalStack: `pnpm run localstack:up`
#   - AWS CLI installed (any recent v2 works; no real AWS credentials required)
#
# Usage:
#   pnpm run deploy:localstack
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENDPOINT="${LOCALSTACK_ENDPOINT:-http://localhost:4566}"
FUNCTION_NAME="${FUNCTION_NAME:-nodeboot-lambda-sample}"
API_NAME="${API_NAME:-nodeboot-lambda-sample-api}"
REGION="${AWS_REGION:-us-east-1}"
ROLE_NAME="${ROLE_NAME:-nodeboot-lambda-sample-role}"

export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID:-test}"
export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-test}"
export AWS_DEFAULT_REGION="$REGION"

awslocal() {
    aws --endpoint-url="$ENDPOINT" --region "$REGION" "$@"
}

echo "⏳ Waiting for LocalStack to be ready at $ENDPOINT ..."
for _ in $(seq 1 30); do
    if curl -sf "$ENDPOINT/_localstack/health" > /dev/null; then
        break
    fi
    sleep 2
done

echo "📦 Building and packaging the Lambda artifact..."
pnpm run clean:build
pnpm run build
pnpm run package

echo "🔐 Ensuring IAM execution role exists..."
if ! awslocal iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
    awslocal iam create-role \
        --role-name "$ROLE_NAME" \
        --assume-role-policy-document '{
            "Version": "2012-10-17",
            "Statement": [{"Effect": "Allow", "Principal": {"Service": "lambda.amazonaws.com"}, "Action": "sts:AssumeRole"}]
        }' > /dev/null
fi
ROLE_ARN="arn:aws:iam::000000000000:role/${ROLE_NAME}"

echo "🚀 Creating/updating Lambda function '$FUNCTION_NAME'..."
if awslocal lambda get-function --function-name "$FUNCTION_NAME" > /dev/null 2>&1; then
    awslocal lambda update-function-code \
        --function-name "$FUNCTION_NAME" \
        --zip-file "fileb://lambda.zip" > /dev/null
    awslocal lambda wait function-updated --function-name "$FUNCTION_NAME"
else
    awslocal lambda create-function \
        --function-name "$FUNCTION_NAME" \
        --runtime nodejs20.x \
        --handler handler.handler \
        --role "$ROLE_ARN" \
        --zip-file "fileb://lambda.zip" \
        --timeout 15 \
        --memory-size 256 > /dev/null
    awslocal lambda wait function-active --function-name "$FUNCTION_NAME"
fi

echo "🌐 Setting up API Gateway (REST API) with a Lambda proxy integration..."
API_ID=$(awslocal apigateway get-rest-apis --query "items[?name=='${API_NAME}'].id | [0]" --output text)
if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
    API_ID=$(awslocal apigateway create-rest-api --name "$API_NAME" --query "id" --output text)
fi

ROOT_RESOURCE_ID=$(awslocal apigateway get-resources --rest-api-id "$API_ID" --query "items[?path=='/'].id | [0]" --output text)

# Create (or reuse) a catch-all {proxy+} resource under root
PROXY_RESOURCE_ID=$(awslocal apigateway get-resources --rest-api-id "$API_ID" --query "items[?pathPart=='{proxy+}'].id | [0]" --output text)
if [ "$PROXY_RESOURCE_ID" = "None" ] || [ -z "$PROXY_RESOURCE_ID" ]; then
    PROXY_RESOURCE_ID=$(awslocal apigateway create-resource \
        --rest-api-id "$API_ID" \
        --parent-id "$ROOT_RESOURCE_ID" \
        --path-part "{proxy+}" \
        --query "id" --output text)
fi

LAMBDA_ARN="arn:aws:lambda:${REGION}:000000000000:function:${FUNCTION_NAME}"
UPSTREAM_URI="arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations"

for RESOURCE_ID in "$ROOT_RESOURCE_ID" "$PROXY_RESOURCE_ID"; do
    awslocal apigateway put-method \
        --rest-api-id "$API_ID" \
        --resource-id "$RESOURCE_ID" \
        --http-method ANY \
        --authorization-type NONE > /dev/null 2>&1 || true

    awslocal apigateway put-integration \
        --rest-api-id "$API_ID" \
        --resource-id "$RESOURCE_ID" \
        --http-method ANY \
        --type AWS_PROXY \
        --integration-http-method POST \
        --uri "$UPSTREAM_URI" > /dev/null
done

echo "🔑 Granting API Gateway permission to invoke the Lambda function..."
awslocal lambda add-permission \
    --function-name "$FUNCTION_NAME" \
    --statement-id "apigateway-invoke" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:000000000000:${API_ID}/*/*" > /dev/null 2>&1 || true

echo "🚢 Deploying API stage 'local'..."
awslocal apigateway create-deployment --rest-api-id "$API_ID" --stage-name local > /dev/null

INVOKE_URL="${ENDPOINT}/restapis/${API_ID}/local/_user_request_"

echo ""
echo "✅ Deployed to LocalStack!"
echo "   Function:   $FUNCTION_NAME"
echo "   API ID:     $API_ID"
echo "   Invoke URL: $INVOKE_URL/api/hello"
echo ""
echo "Try it out:"
echo "   curl ${INVOKE_URL}/api/hello"
echo "   curl -X POST ${INVOKE_URL}/api/users -H 'Content-Type: application/json' -H 'Authorization: Bearer test' -d '{\"name\":\"Ada Lovelace\",\"email\":\"ada@example.com\"}'"
