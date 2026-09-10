import http, {IncomingMessage, ServerResponse} from "node:http";

export interface FirebaseMockState {
    users: Map<string, {uid: string; email: string; displayName?: string}>;
    storageFiles: Map<string, {content: Buffer; contentType: string}>;
}

export interface FirebaseMockServerHandle {
    server: http.Server;
    port: number;
    state: FirebaseMockState;
    close: () => Promise<void>;
}

/**
 * Creates an in-process mock server simulating Firebase Auth and Cloud Storage emulator endpoints.
 * This enables integration tests using standard emulator environment variables
 * (`FIREBASE_AUTH_EMULATOR_HOST`, `FIREBASE_STORAGE_EMULATOR_HOST`) without requiring Docker
 * or an external Java-based Firebase CLI emulator daemon.
 */
export function createFirebaseMockServer(port = 0): FirebaseMockServerHandle {
    const state: FirebaseMockState = {
        users: new Map([
            ["test-uid-1", {uid: "test-uid-1", email: "test-user-1@example.com", displayName: "Test User 1"}],
        ]),
        storageFiles: new Map([
            ["sample.txt", {content: Buffer.from("Hello from Mock Firebase Storage"), contentType: "text/plain"}],
        ]),
    };

    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString("utf-8");
        const url = req.url || "/";

        // 1. Firebase Auth Emulator (Google Identity Toolkit API)
        if (url.includes("accounts:lookup")) {
            let bodyObj: any;
            try {
                bodyObj = rawBody ? JSON.parse(rawBody) : {};
            } catch {
                bodyObj = {};
            }

            const requestedLocalId = Array.isArray(bodyObj.localId) ? bodyObj.localId[0] : null;
            const user = requestedLocalId ? state.users.get(requestedLocalId) : null;

            if (user) {
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify({
                        users: [
                            {
                                localId: user.uid,
                                email: user.email,
                                displayName: user.displayName,
                                emailVerified: true,
                            },
                        ],
                    }),
                );
            } else {
                // Return empty users array -> Admin SDK translates this into auth/user-not-found
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify({}));
            }
            return;
        }

        // 2. Cloud Storage Emulator (Google Cloud Storage JSON API)
        if (url.includes("/b/") && url.includes("/o/")) {
            const match = url.match(/\/b\/([^/]+)\/o\/([^/?#]+)/);
            const objectName = match && match[2] ? decodeURIComponent(match[2]) : "";
            const file = state.storageFiles.get(objectName);

            if (file) {
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify({
                        kind: "storage#object",
                        name: objectName,
                        bucket: match && match[1] ? match[1] : "test-bucket",
                        size: String(file.content.length),
                        contentType: file.contentType,
                    }),
                );
            } else {
                res.writeHead(404, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify({
                        error: {
                            code: 404,
                            message: `No such object: ${objectName}`,
                        },
                    }),
                );
            }
            return;
        }

        // Fallback default response
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({status: "ok"}));
    });

    server.listen(port);

    return {
        server,
        port,
        state,
        close: () =>
            new Promise<void>(resolve => {
                if (typeof server.closeAllConnections === "function") {
                    server.closeAllConnections();
                }
                server.close(() => resolve());
            }),
    };
}
