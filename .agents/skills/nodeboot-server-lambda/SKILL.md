---
name: nodeboot-server-lambda
description: Use when the user wants to run a Node-Boot application on AWS Lambda behind API Gateway or a Lambda Function URL, and needs the AWS-specific handler pattern built around `LambdaServer.getHandler()` with the warm-container caching shown in `samples/sample-lambda/src/handler.ts`.
---

# Node-Boot on AWS Lambda

Use `@nodeboot/lambda-server` when one Lambda should front the whole Node-Boot router.

## Fresh start or existing app?

Read [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) first, then apply it here:

-   **Fresh start:** `npx degit nodejs-boot/node-boot/samples/sample-lambda my-app`.
-   **Existing app:** look for a `handler.ts` exporting `handler` alongside `@nodeboot/lambda-server` in `package.json` to confirm this adapter is (or isn't) already wired.

## Minimal handler

Grounded in [`samples/sample-lambda/src/handler.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-lambda/src/handler.ts):

```ts
import {APIGatewayProxyEvent, APIGatewayProxyResult, Context} from "aws-lambda";
import {LambdaHandler, LambdaServer} from "@nodeboot/lambda-server";
import {LambdaSampleApp} from "./app";

let lambdaHandler: LambdaHandler | null = null;

export const handler = async (event: APIGatewayProxyEvent, context: Context): Promise<APIGatewayProxyResult> => {
    context.callbackWaitsForEmptyEventLoop = false;

    if (!lambdaHandler) {
        const app = await new LambdaSampleApp().start();
        const lambdaServer = app.server as LambdaServer;
        lambdaHandler = lambdaServer.getHandler();
    }

    return lambdaHandler(event, context);
};
```

## Notes that matter

-   Build the app and capture `lambdaServer.getHandler()` once at module scope so warm invocations reuse the same initialized Node-Boot app.
-   The sample app itself runs `NodeBoot.run(LambdaServer)` in [`samples/sample-lambda/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-lambda/src/app.ts).
-   Configure AWS to send every route to this function (`ANY /{proxy+}` Lambda proxy integration). The sample's comments also call out Lambda Function URLs as an option.
-   Set the Lambda handler to `handler.handler` (or `dist/handler.handler` after compilation), exactly as the sample documents.

## Source of truth

-   Package README: [`serverless/lambda-server/README.md`](https://github.com/nodejs-boot/node-boot/blob/main/serverless/lambda-server/README.md)
-   Sample app: [`samples/sample-lambda/src/app.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-lambda/src/app.ts)
-   Sample handler: [`samples/sample-lambda/src/handler.ts`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-lambda/src/handler.ts)

## Validate

From [`samples/sample-lambda/package.json`](https://github.com/nodejs-boot/node-boot/blob/main/samples/sample-lambda/package.json): run `cd samples/sample-lambda && pnpm dev` to start local emulation with `serverless offline --reloadHandler`.
