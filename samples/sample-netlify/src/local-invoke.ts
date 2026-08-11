/**
 * Small helper to sanity-check the Netlify handler locally, without needing the `netlify` CLI.
 * Directly invokes the same handler function Netlify calls in production, building
 * `HandlerEvent`/`HandlerContext` objects by hand.
 *
 * Usage:
 *   pnpm run invoke:local
 */
import "reflect-metadata";
import {HandlerContext, HandlerEvent} from "@nodeboot/netlify-server";
import {handler} from "../netlify/functions/api";

function buildEvent(overrides: Partial<HandlerEvent>): HandlerEvent {
    return {
        rawUrl: "http://localhost",
        rawQuery: "",
        path: "/",
        httpMethod: "GET",
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        body: null,
        isBase64Encoded: false,
        ...overrides,
    };
}

const context = {} as HandlerContext;

async function main() {
    const helloResponse = await handler(buildEvent({path: "/api/hello", httpMethod: "GET"}), context, undefined as any);
    console.log("GET /api/hello ->", helloResponse?.statusCode, helloResponse?.body);

    const createUserResponse = await handler(
        buildEvent({
            path: "/api/users",
            httpMethod: "POST",
            headers: {"content-type": "application/json", authorization: "Bearer local-test-token"},
            body: JSON.stringify({name: "Ada Lovelace", email: "ada@example.com"}),
        }),
        context,
        undefined as any,
    );
    console.log("POST /api/users ->", createUserResponse?.statusCode, createUserResponse?.body);

    const getUsersResponse = await handler(
        buildEvent({path: "/api/users", httpMethod: "GET"}),
        context,
        undefined as any,
    );
    console.log("GET /api/users ->", getUsersResponse?.statusCode, getUsersResponse?.body);
}

main()
    .catch(error => {
        console.error("Local invocation failed:", error);
        process.exitCode = 1;
    })
    .finally(() => {
        // NodeBoot's lifecycle bridge keeps scheduling internal events slightly after the
        // request completes, which keeps this one-off script's event loop alive indefinitely.
        // That's fine when running as a real Netlify Function (the platform recycles the instance
        // for you), but here we force an exit once we're done so the script actually terminates.
        // Prefer `pnpm run dev` (netlify dev) for more realistic end-to-end testing.
        process.exit();
    });
