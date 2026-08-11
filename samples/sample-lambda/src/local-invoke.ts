/**
 * Small helper to sanity-check the Lambda handler locally, without deploying
 * and without needing `serverless-offline`. Useful for quick smoke tests.
 *
 * Usage:
 *   pnpm run invoke:local
 */
import "reflect-metadata";
import {APIGatewayProxyEvent, Context} from "aws-lambda";
import {handler} from "./handler";

function buildEvent(overrides: Partial<APIGatewayProxyEvent> = {}): APIGatewayProxyEvent {
    return {
        httpMethod: "GET",
        path: "/api/hello",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {
            identity: {sourceIp: "127.0.0.1"},
        } as any,
        resource: "",
        body: null,
        isBase64Encoded: false,
        ...overrides,
    } as APIGatewayProxyEvent;
}

const context = {} as Context;

async function main() {
    const helloResult = await handler(buildEvent(), context);
    console.log("GET /api/hello ->", helloResult);

    const createUserResult = await handler(
        buildEvent({
            httpMethod: "POST",
            path: "/api/users",
            headers: {Authorization: "Bearer local-test-token"},
            body: JSON.stringify({name: "Ada Lovelace", email: "ada@example.com"}),
        }),
        context,
    );
    console.log("POST /api/users ->", createUserResult);
}

main()
    .catch(error => {
        console.error("Local invocation failed:", error);
        process.exitCode = 1;
    })
    .finally(() => {
        // NodeBoot's lifecycle bridge keeps scheduling internal events (e.g. persistence
        // lifecycle hooks) slightly after the request completes, which keeps this
        // one-off script's event loop alive indefinitely. That's fine on a real Lambda
        // (the runtime freezes/recycles the process for you), but here we force an
        // exit once we're done so the script actually terminates.
        // Prefer `pnpm run dev` (serverless-offline) or the LocalStack setup below for
        // more realistic end-to-end testing.
        process.exit();
    });
