/**
 * Small helper to sanity-check the Cloud Function handler locally, without needing the
 * `functions-framework` CLI. Uses `@google-cloud/functions-framework/testing`'s `getTestServer`
 * to spin up the exact same Express server the functions-framework builds in production around
 * our registered `api` function (see `src/index.ts`), complete with body-parsing middleware.
 *
 * Usage:
 *   pnpm run invoke:local
 */
import "reflect-metadata";
import "./index"; // registers the `api` function with the functions-framework via `functions.http`
import {getTestServer} from "@google-cloud/functions-framework/testing";

async function main() {
    const server = getTestServer("api");

    await new Promise<void>(resolve => server.listen(0, resolve));
    const port = (server.address() as any).port;
    const base = `http://localhost:${port}`;

    const helloResponse = await fetch(`${base}/api/hello`);
    console.log("GET /api/hello ->", helloResponse.status, await helloResponse.text());

    const createUserResponse = await fetch(`${base}/api/users`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer local-test-token",
        },
        body: JSON.stringify({name: "Ada Lovelace", email: "ada@example.com"}),
    });
    console.log("POST /api/users ->", createUserResponse.status, await createUserResponse.text());

    const getUsersResponse = await fetch(`${base}/api/users`);
    console.log("GET /api/users ->", getUsersResponse.status, await getUsersResponse.text());

    server.close();
}

main()
    .catch(error => {
        console.error("Local invocation failed:", error);
        process.exitCode = 1;
    })
    .finally(() => {
        // NodeBoot's lifecycle bridge keeps scheduling internal events slightly after the
        // request completes, which keeps this one-off script's event loop alive indefinitely.
        // That's fine when running as a real Cloud Function (the platform recycles the instance
        // for you), but here we force an exit once we're done so the script actually terminates.
        // Prefer `pnpm run dev` (functions-framework CLI) for more realistic end-to-end testing.
        process.exit();
    });
