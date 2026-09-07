import http from "node:http";

/**
 * A tiny plain Node HTTP server standing in for a downstream service.
 *
 * `@nodeboot/node-test` has no dedicated "mock outbound HTTP response" hook - `useHttp()` /
 * `HttpClientHook` only drive the app's own *inbound* endpoints, and `useMock()`/`MockHook` cannot
 * reach this workspace's real running app (see the note in `http-client-enabled.it.test.ts`). A
 * real local server is the most direct way to prove an `@HttpClient`-registered axios instance
 * actually performs a request/response round trip.
 */
export function startDownstreamServer(port: number): http.Server {
    const server = http.createServer((req, res) => {
        if (req.url === "/users/1") {
            res.writeHead(200, {"content-type": "application/json"});
            res.end(JSON.stringify({id: 1, name: "Jane"}));
        } else if (req.url === "/boom") {
            res.writeHead(500, {"content-type": "application/json"});
            res.end(JSON.stringify({message: "downstream exploded"}));
        } else {
            res.writeHead(404, {"content-type": "application/json"});
            res.end(JSON.stringify({message: "not found"}));
        }
    });
    server.listen(port, "127.0.0.1");
    return server;
}
