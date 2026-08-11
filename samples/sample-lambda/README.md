# Node-Boot Lambda Sample

A sample project that shows how to build and deploy a [Node-Boot](https://github.com/nodejs-boot/node-boot)
application as an **AWS Lambda** function, using the [`@nodeboot/lambda-server`](../../serverless/lambda-server)
package.

It demonstrates:

-   Dependency Injection (`@EnableDI`)
-   AOT Component Scanning for fast cold starts (`@EnableComponentScan`)
-   Request validation with `class-validator` (`@EnableValidations`)
-   Authorization (`@EnableAuthorization`, `@Authorized()`)
-   Controllers, services, middleware and a custom error handler
-   Local end-to-end testing with **LocalStack** (real Lambda + API Gateway emulation)
-   Infrastructure-as-code deployment with **Terraform** (works against LocalStack or real AWS)
-   Packaging and deploying the function with the Serverless Framework, a plain zip
    upload, or as a container image

## Project layout

```
src/
├── app.ts                 # NodeBootApplication bootstrapped on LambdaServer
├── handler.ts              # AWS Lambda entry point (exported `handler`)
├── local-invoke.ts         # Script to smoke-test the handler locally
├── controllers/            # HTTP controllers
├── services/                # Business logic (in-memory user store)
├── models/                  # DTOs / validation models
├── middlewares/              # Logging middleware + custom error handler
└── auth/                    # Authorization/CurrentUser resolvers
terraform/                  # Terraform module (Lambda + API Gateway), works with LocalStack or AWS
docker-compose.localstack.yml # LocalStack container definition
scripts/
├── build-zip.sh             # Packages dist/ + node_modules into lambda.zip
└── deploy-localstack.sh      # Builds, packages and deploys straight to LocalStack via AWS CLI
```

## How it works

Unlike the Express/Koa/Fastify samples, this application never "listens" on a port.
`NodeBoot.run(LambdaServer)` bootstraps the DI container, controllers, middleware and
routes exactly once, and `LambdaServer#getHandler()` returns a function of shape
`(event, context) => Promise<APIGatewayProxyResult>` that is invoked by AWS Lambda for
every incoming request:

```typescript
// src/handler.ts
let lambdaHandler: LambdaHandler | null = null;

export const handler = async (event: APIGatewayProxyEvent, context: Context) => {
    if (!lambdaHandler) {
        const app = await new LambdaSampleApp().start();
        lambdaHandler = (app.server as LambdaServer).getHandler();
    }
    return lambdaHandler(event, context);
};
```

The `lambdaHandler` is cached at module scope so the DI container, controllers and
routes are only rebuilt on a cold start; warm invocations reuse the same instance,
which keeps latency low.

## Prerequisites

-   Node.js 20+ and pnpm (this is a workspace package)
-   [Docker](https://docs.docker.com/get-docker/) — for LocalStack and/or the container image build
-   [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html) — for LocalStack deployment and plain zip uploads
-   [Terraform](https://developer.hashicorp.com/terraform/install) >= 1.5 — for the `terraform/` module
-   Real AWS credentials — only needed if you deploy against actual AWS

## Running locally

Install dependencies from the repository root (this is a pnpm workspace):

```bash
pnpm install
```

### Option A — quick smoke test (no emulator)

```bash
cd samples/sample-lambda
pnpm run build
pnpm run invoke:local
```

This directly calls the exported `handler` with synthetic `APIGatewayProxyEvent`
objects — useful for a fast sanity check. Since this bypasses AWS Lambda's runtime
entirely, NodeBoot's internal lifecycle events keep the Node.js process alive for a
moment after the response is returned, so the script forces `process.exit()` once
it's done; prefer option B or C below for a more realistic end-to-end test.

### Option B — local API Gateway emulation (serverless-offline)

```bash
cd samples/sample-lambda
pnpm run dev
```

This builds the app and starts [`serverless-offline`](https://github.com/dherault/serverless-offline),
emulating API Gateway on `http://localhost:3000`. Try it out:

```bash
curl http://localhost:3000/api/hello
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

### Option C — LocalStack (recommended: real Lambda + API Gateway emulation)

[LocalStack](https://www.localstack.cloud/) runs an actual Lambda runtime and API
Gateway locally in Docker, so this is the closest you can get to production behavior
without touching a real AWS account. Requires Docker and the AWS CLI.

```bash
cd samples/sample-lambda

# 1. Start LocalStack (docker-compose.localstack.yml)
pnpm run localstack:up

# 2. Build, package and deploy the function + REST API to LocalStack
pnpm run deploy:localstack
```

The script prints the invoke URL when done, e.g.:

```bash
curl "http://localhost:4566/restapis/<api-id>/local/_user_request_/api/hello"
curl -X POST "http://localhost:4566/restapis/<api-id>/local/_user_request_/api/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"name":"Ada Lovelace","email":"ada@example.com"}'
```

Tear it down with:

```bash
pnpm run localstack:down
```

> **Note**: Running a Lambda inside LocalStack requires LocalStack to spin up its own
> Docker container to execute your function code, so Docker needs a few GBs of free
> memory available. If `deploy:localstack` fails with connection errors after the
> Lambda creation step, check `docker logs nodeboot-lambda-localstack` — this is
> almost always a memory-constrained Docker daemon (bump Docker Desktop's memory
> limit) rather than a configuration issue.

## Building

```bash
pnpm run build
```

This compiles TypeScript to `dist/` and runs `@nodeboot/aot`'s `node-boot-aot` script
(`postbuild`), which pre-scans your compiled components (`@Controller`, `@Service`,
`@Middleware`, etc.) into `dist/node-boot-beans.json`. `@EnableComponentScan` reads this
manifest at startup instead of walking the filesystem, which meaningfully reduces
Lambda cold-start time.

## Deploying to AWS Lambda

Four ways to ship this function, pick whichever fits your workflow:

### 1. Terraform (recommended for infrastructure-as-code)

The included [`terraform/`](./terraform) module provisions everything needed to run
this sample: an IAM execution role, a CloudWatch log group, the Lambda function itself,
and a REST API Gateway with a Lambda proxy integration on `ANY /` and `ANY /{proxy+}`
(so NodeBoot's own router handles every method/path). The **same module** can target
either LocalStack or real AWS — only the `use_localstack`/`localstack_endpoint`
variables change (see [`terraform/providers.tf`](./terraform/providers.tf)).

**Against LocalStack** (requires `pnpm run localstack:up` first):

```bash
pnpm run build && pnpm run package    # produces ./lambda.zip, read by terraform/lambda.tf
pnpm run terraform:init
pnpm run terraform:plan               # terraform plan -var-file=localstack.tfvars
pnpm run terraform:apply              # terraform apply -var-file=localstack.tfvars
```

Terraform prints a `localstack_invoke_url` output you can `curl` directly:

```bash
curl "$(terraform -chdir=terraform output -raw localstack_invoke_url)/api/hello"
```

Tear down with `pnpm run terraform:destroy`.

**Against real AWS:**

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # edit as needed
pnpm run build && pnpm run package
pnpm run terraform:init
pnpm run terraform:apply:aws                    # terraform apply (no -var-file)
```

This prints an `invoke_url` output pointing at the real API Gateway stage. Tear down
with `pnpm run terraform:destroy:aws`.

### 2. Serverless Framework

The included [`serverless.yml`](./serverless.yml) provisions the Lambda function, an
HTTP API (API Gateway v2) with a catch-all `ANY /{proxy+}` route (so NodeBoot's own
router handles every method/path), and IAM permissions.

```bash
# Configure AWS credentials first (aws configure / env vars / SSO, etc.)
pnpm run deploy:serverless           # builds and runs `serverless deploy`
pnpm run remove:serverless           # tears the stack down
```

### 3. Plain zip upload (AWS CLI / Console / SAM / CDK)

```bash
pnpm run build
pnpm run package     # produces ./lambda.zip (dist/ + node_modules/)
```

Then, for example, with the AWS CLI:

```bash
aws lambda create-function \
  --function-name nodeboot-lambda-sample \
  --runtime nodejs20.x \
  --handler handler.handler \
  --role arn:aws:iam::<account-id>:role/<lambda-execution-role> \
  --zip-file fileb://lambda.zip

# subsequent deploys
aws lambda update-function-code \
  --function-name nodeboot-lambda-sample \
  --zip-file fileb://lambda.zip
```

`lambda.zip` (and its `dist`/`node_modules` contents) can equally be referenced from a
SAM `template.yaml` or an AWS CDK `lambda.Function`/`lambda.Code.fromAsset` construct.

### 4. Container image

For larger dependency trees or when you prefer container-based deployment:

```bash
docker build -t nodeboot-lambda-sample .
docker tag nodeboot-lambda-sample:latest <account-id>.dkr.ecr.<region>.amazonaws.com/nodeboot-lambda-sample:latest
docker push <account-id>.dkr.ecr.<region>.amazonaws.com/nodeboot-lambda-sample:latest

aws lambda create-function \
  --function-name nodeboot-lambda-sample \
  --package-type Image \
  --code ImageUri=<account-id>.dkr.ecr.<region>.amazonaws.com/nodeboot-lambda-sample:latest \
  --role arn:aws:iam::<account-id>:role/<lambda-execution-role>
```

## API Gateway configuration

Whichever deployment method you choose, configure API Gateway (REST or HTTP API) with:

-   **Integration type**: Lambda proxy integration
-   **Route/Resource**: `{proxy+}`
-   **Method**: `ANY`

This lets NodeBoot's internal `find-my-way` router handle every HTTP method and path,
exactly as it would with a traditional HTTP server.

## Known limitations of the Lambda runtime

-   **No listening server**: `LambdaServer#getHttpServer()` and `#getFramework()`
    return `undefined` — there's no underlying HTTP server/framework instance, since
    AWS Lambda invokes the handler function directly.
-   **Custom error handlers can't build the response body**: in Express/Koa/Fastify, a
    `@ErrorHandler()` writes directly to the mutable `response` object. In Lambda,
    `action.response` is the AWS `Context`, which has no such methods — the actual
    `APIGatewayProxyResult` is always assembled by NodeBoot's built-in
    `GlobalErrorHandler`. Custom error handlers are still invoked and are the right
    place for side effects (logging, alerting, metrics), but cannot override the
    response status/body. See [`ErrorMiddleware.ts`](./src/middlewares/ErrorMiddleware.ts).
-   **Stateless containers**: don't rely on in-memory state surviving between cold
    starts (the sample's `UserService` is in-memory purely for simplicity — replace it
    with DynamoDB, Aurora Serverless, RDS, etc. in a real application).

## License

This project is licensed under the MIT License.
