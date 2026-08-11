/**
 * Small helper to sanity-check the Vercel handler locally, without needing the `vercel` CLI.
 * Spins up a plain Node.js `http` server that delegates to the exact same handler function
 * Vercel invokes in production, since `VercelRequest`/`VercelResponse` are just `http`'s
 * `IncomingMessage`/`ServerResponse` under the hood.
 *
 * Usage:
 *   pnpm run invoke:local
 */
import "reflect-metadata";
import http from "node:http";
import handler from "../api/[...path]";

const server = http.createServer((req, res) => {
    // Cast is safe: VercelRequest/VercelResponse are structurally IncomingMessage/ServerResponse
    // decorated with a few extra properties/methods that our handler doesn't require for this test.
    handler(req as any, res as any).catch(error => {
        console.error("Unhandled error in handler:", error);
        if (!res.headersSent) {
            res.writeHead(500, {"Content-Type": "application/json"});
        }
        res.end(JSON.stringify({error: "Internal Server Error"}));
    });
});

async function main() {
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
}

main()
    .catch(error => {
        console.error("Local invocation failed:", error);
        process.exitCode = 1;
    })
    .finally(() => {
        // NodeBoot's lifecycle bridge keeps scheduling internal events slightly after the
        // request completes, which keeps this one-off script's event loop alive indefinitely.
        // That's fine when running as a real Vercel Function (the platform recycles the instance
        // for you), but here we force an exit once we're done so the script actually terminates.
        // Prefer `pnpm run dev` (vercel dev) for more realistic end-to-end testing.
        server.close();
        process.exit();
    });
