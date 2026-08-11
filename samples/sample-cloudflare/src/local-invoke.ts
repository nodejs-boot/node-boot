/**
 * Small helper to sanity-check the Worker fetch handler locally, without needing
 * `wrangler dev`. Useful for quick smoke tests directly against the compiled Node-Boot
 * application, using the standard Fetch API `Request`/`Response` objects.
 *
 * Usage:
 *   pnpm run invoke:local
 */
import "reflect-metadata";
import {ExecutionContext} from "@nodeboot/cloudflare-server";
import worker from "./worker";

const env = {};
const ctx: ExecutionContext = {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
};

async function main() {
    const helloResponse = await worker.fetch(new Request("https://worker.local/api/hello"), env, ctx);
    console.log("GET /api/hello ->", helloResponse.status, await helloResponse.text());

    const createUserResponse = await worker.fetch(
        new Request("https://worker.local/api/users", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: "Bearer local-test-token",
            },
            body: JSON.stringify({name: "Ada Lovelace", email: "ada@example.com"}),
        }),
        env,
        ctx,
    );
    console.log("POST /api/users ->", createUserResponse.status, await createUserResponse.text());
}

main()
    .catch(error => {
        console.error("Local invocation failed:", error);
        process.exitCode = 1;
    })
    .finally(() => {
        // NodeBoot's lifecycle bridge keeps scheduling internal events slightly after the
        // request completes, which keeps this one-off script's event loop alive
        // indefinitely. That's fine when running inside the Workers runtime (Cloudflare
        // recycles the isolate for you), but here we force an exit once we're done so the
        // script actually terminates. Prefer `pnpm run dev` (wrangler dev) for more
        // realistic end-to-end testing against the actual Workers runtime.
        process.exit();
    });
