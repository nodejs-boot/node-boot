import http, {IncomingMessage, ServerResponse} from "node:http";
import {randomUUID} from "node:crypto";

export interface SupabaseMockState {
    tables: Map<string, Array<Record<string, any>>>;
    users: Map<string, Record<string, any>>;
    buckets: Map<string, Record<string, any>>;
    storageObjects: Map<string, Map<string, {content: Buffer; contentType: string}>>;
    rpcHandlers: Map<string, (args: any) => any>;
    functionsHandlers: Map<string, (args: any) => any>;
}

export interface SupabaseMockServerHandle {
    server: http.Server;
    port: number;
    endpoint: string;
    state: SupabaseMockState;
    reset: () => void;
    close: () => Promise<void>;
}

export function createSupabaseMockServer(port = 0): Promise<SupabaseMockServerHandle> {
    const state: SupabaseMockState = {
        tables: new Map(),
        users: new Map(),
        buckets: new Map(),
        storageObjects: new Map(),
        rpcHandlers: new Map(),
        functionsHandlers: new Map(),
    };

    const reset = () => {
        state.tables.clear();
        state.users.clear();
        state.buckets.clear();
        state.storageObjects.clear();
        state.rpcHandlers.clear();
        state.functionsHandlers.clear();

        // Seed default tables
        state.tables.set("profiles", [
            {id: "user-1", email: "user1@example.com", name: "Alice", created_at: "2026-01-01T00:00:00.000Z"},
            {id: "user-2", email: "user2@example.com", name: "Bob", created_at: "2026-01-02T00:00:00.000Z"},
        ]);

        // Seed default auth users
        const defaultUserId = "00000000-0000-4000-8000-000000000001";
        state.users.set(defaultUserId, {
            id: defaultUserId,
            email: "user1@example.com",
            aud: "authenticated",
            role: "authenticated",
            user_metadata: {name: "Alice"},
            created_at: "2026-01-01T00:00:00.000Z",
        });

        // Seed default storage bucket
        state.buckets.set("avatars", {
            id: "avatars",
            name: "avatars",
            public: true,
            created_at: "2026-01-01T00:00:00.000Z",
            updated_at: "2026-01-01T00:00:00.000Z",
        });

        const avatarFiles = new Map<string, {content: Buffer; contentType: string}>();
        avatarFiles.set("alice.png", {
            content: Buffer.from("fake-png-alice"),
            contentType: "image/png",
        });
        state.storageObjects.set("avatars", avatarFiles);

        // Seed default RPC handlers
        state.rpcHandlers.set("calculate_total", (args: any) => {
            const items = (args?.["items"] as Array<{price?: number; quantity?: number}>) || [];
            const total = items.reduce((acc: number, item) => acc + (item.price || 0) * (item.quantity || 1), 0);
            return total;
        });

        state.rpcHandlers.set("get_service_status", () => {
            return {status: "healthy", version: "1.0.0", timestamp: "2026-09-06T00:00:00.000Z"};
        });

        // Seed default Edge Functions handler
        state.functionsHandlers.set("hello-world", (args: any) => {
            return {message: `Hello, ${args?.["name"] || "World"}!`, processedAt: new Date().toISOString()};
        });
    };

    reset();

    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString("utf-8");
        let bodyJson: any = null;
        if (rawBody) {
            try {
                bodyJson = JSON.parse(rawBody);
            } catch {
                bodyJson = rawBody;
            }
        }

        const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
        const pathname = url.pathname;
        const method = req.method || "GET";
        const acceptHeader = req.headers["accept"] || "";
        const isSingleExpected = acceptHeader.includes("application/vnd.pgrst.object+json");

        // 1. PostgREST RPC (/rest/v1/rpc/:function_name)
        if (pathname.startsWith("/rest/v1/rpc/")) {
            const funcName = pathname.replace("/rest/v1/rpc/", "").split("/")[0] || "";
            const handler = state.rpcHandlers.get(funcName);

            if (handler) {
                try {
                    const result = handler(bodyJson);
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(result));
                } catch (err: any) {
                    res.writeHead(400, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({code: "PGRST000", message: err.message || "RPC execution failed"}));
                }
            } else {
                res.writeHead(404, {"Content-Type": "application/json"});
                res.end(JSON.stringify({code: "PGRST202", message: `Could not find function ${funcName}`}));
            }
            return;
        }

        // 2. PostgREST Tables (/rest/v1/:table)
        if (pathname.startsWith("/rest/v1/")) {
            const table = (pathname.replace("/rest/v1/", "").split("/")[0] || "").split("?")[0] || "";
            let rows = state.tables.get(table);
            if (!rows) {
                rows = [];
                state.tables.set(table, rows);
            }

            if (method === "GET") {
                let filtered = [...rows];

                // Simple query filter parsing (e.g., id=eq.user-1, email=eq.user1@example.com)
                for (const [key, val] of url.searchParams.entries()) {
                    if (key === "select" || key === "order" || key === "limit" || key === "offset") {
                        continue;
                    }
                    if (val.startsWith("eq.")) {
                        const targetVal = val.slice(3);
                        filtered = filtered.filter(r => String(r[key]) === targetVal);
                    } else if (val.startsWith("neq.")) {
                        const targetVal = val.slice(4);
                        filtered = filtered.filter(r => String(r[key]) !== targetVal);
                    }
                }

                // Ordering (e.g. order=created_at.desc)
                const orderParam = url.searchParams.get("order");
                if (orderParam) {
                    const parts = orderParam.split(".");
                    const field = parts[0] || "";
                    const dir = parts[1] || "asc";
                    const ascending = dir !== "desc";
                    filtered.sort((a, b) => {
                        const aVal = a[field];
                        const bVal = b[field];
                        if (aVal < bVal) return ascending ? -1 : 1;
                        if (aVal > bVal) return ascending ? 1 : -1;
                        return 0;
                    });
                }

                // Limit
                const limitParam = url.searchParams.get("limit");
                if (limitParam) {
                    filtered = filtered.slice(0, parseInt(limitParam, 10));
                }

                if (isSingleExpected) {
                    const firstRow = filtered[0];
                    if (filtered.length === 1 && firstRow) {
                        res.writeHead(200, {
                            "Content-Type": "application/vnd.pgrst.object+json; charset=utf-8",
                            "Content-Range": "0-0/1",
                        });
                        res.end(JSON.stringify(firstRow));
                    } else {
                        res.writeHead(406, {"Content-Type": "application/json"});
                        res.end(
                            JSON.stringify({
                                code: "PGRST116",
                                details: `The result contains ${filtered.length} rows`,
                                hint: null,
                                message: "JSON object requested, multiple (or no) rows returned",
                            }),
                        );
                    }
                } else {
                    res.writeHead(200, {
                        "Content-Type": "application/json",
                        "Content-Range": `0-${Math.max(0, filtered.length - 1)}/${filtered.length}`,
                    });
                    res.end(JSON.stringify(filtered));
                }
                return;
            }

            if (method === "POST") {
                const newItems = Array.isArray(bodyJson) ? bodyJson : [bodyJson];
                const created: any[] = [];
                for (const item of newItems) {
                    const record = {
                        id: item?.["id"] || `rec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                        created_at: item?.["created_at"] || new Date().toISOString(),
                        ...item,
                    };
                    rows.push(record);
                    created.push(record);
                }

                if (isSingleExpected) {
                    res.writeHead(201, {
                        "Content-Type": "application/vnd.pgrst.object+json; charset=utf-8",
                        "Content-Range": "0-0/1",
                    });
                    res.end(JSON.stringify(created[0] || {}));
                } else {
                    const resultPayload = Array.isArray(bodyJson) ? created : created[0];
                    res.writeHead(201, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(resultPayload));
                }
                return;
            }

            if (method === "PATCH") {
                const updatedRows: any[] = [];

                for (let i = 0; i < rows.length; i++) {
                    const currentRow = rows[i];
                    if (!currentRow) continue;
                    let matches = true;
                    for (const [key, val] of url.searchParams.entries()) {
                        if (key === "select" || key === "order" || key === "limit") continue;
                        if (val.startsWith("eq.")) {
                            const targetVal = val.slice(3);
                            if (String(currentRow[key]) !== targetVal) matches = false;
                        }
                    }
                    if (matches) {
                        const updated = {...currentRow, ...bodyJson};
                        rows[i] = updated;
                        updatedRows.push(updated);
                    }
                }

                const firstUpdated = updatedRows[0];
                if (isSingleExpected && updatedRows.length === 1 && firstUpdated) {
                    res.writeHead(200, {"Content-Type": "application/vnd.pgrst.object+json; charset=utf-8"});
                    res.end(JSON.stringify(firstUpdated));
                } else {
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(updatedRows));
                }
                return;
            }

            if (method === "DELETE") {
                const remaining: any[] = [];
                const deleted: any[] = [];

                for (const row of rows) {
                    let matches = true;
                    for (const [key, val] of url.searchParams.entries()) {
                        if (key === "select" || key === "order" || key === "limit") continue;
                        if (val.startsWith("eq.")) {
                            const targetVal = val.slice(3);
                            if (String(row[key]) !== targetVal) matches = false;
                        }
                    }
                    if (matches) {
                        deleted.push(row);
                    } else {
                        remaining.push(row);
                    }
                }

                state.tables.set(table, remaining);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(deleted));
                return;
            }
        }

        // 3. Auth API (/auth/v1/...)
        if (pathname.startsWith("/auth/v1/")) {
            // Sign Up
            if (pathname === "/auth/v1/signup" && method === "POST") {
                const userId = randomUUID();
                const newUser = {
                    id: userId,
                    email: bodyJson?.["email"] || "newuser@example.com",
                    user_metadata: bodyJson?.["data"] || {},
                    aud: "authenticated",
                    role: "authenticated",
                    created_at: new Date().toISOString(),
                };
                state.users.set(userId, newUser);

                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify({
                        id: userId,
                        email: newUser.email,
                        user_metadata: newUser.user_metadata,
                        access_token: `mock-token-${userId}`,
                        token_type: "bearer",
                        expires_in: 3600,
                        refresh_token: `mock-refresh-${userId}`,
                        user: newUser,
                    }),
                );
                return;
            }

            // Password sign-in
            if (pathname === "/auth/v1/token" && method === "POST") {
                const grantType = url.searchParams.get("grant_type");
                if (grantType === "password") {
                    const email = bodyJson?.["email"];
                    const foundUser = Array.from(state.users.values()).find(u => u["email"] === email);
                    if (foundUser && bodyJson?.["password"] === "wrong-password") {
                        res.writeHead(400, {"Content-Type": "application/json"});
                        res.end(
                            JSON.stringify({error: "invalid_grant", error_description: "Invalid login credentials"}),
                        );
                        return;
                    }

                    const userObj = foundUser || {
                        id: randomUUID(),
                        email: email || "test@example.com",
                        role: "authenticated",
                    };

                    const userId = String(userObj["id"]);
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(
                        JSON.stringify({
                            access_token: `mock-jwt-token-${userId}`,
                            token_type: "bearer",
                            expires_in: 3600,
                            refresh_token: `mock-refresh-token-${userId}`,
                            user: userObj,
                        }),
                    );
                    return;
                }
            }

            // Get Current User
            if (pathname === "/auth/v1/user" && method === "GET") {
                const authHeader = req.headers["authorization"] || "";
                if (authHeader.includes("invalid-token")) {
                    res.writeHead(401, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({message: "Invalid JWT", status: 401}));
                    return;
                }
                const firstUser = Array.from(state.users.values())[0] || {
                    id: randomUUID(),
                    email: "user1@example.com",
                    role: "authenticated",
                };
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(firstUser));
                return;
            }

            // Admin: Create User
            if (pathname === "/auth/v1/admin/users" && method === "POST") {
                const userId = randomUUID();
                const user = {
                    id: userId,
                    email: bodyJson?.["email"],
                    user_metadata: bodyJson?.["user_metadata"] || {},
                    aud: "authenticated",
                    role: "authenticated",
                    created_at: new Date().toISOString(),
                };
                state.users.set(userId, user);
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify({user}));
                return;
            }

            // Admin: List Users
            if (pathname === "/auth/v1/admin/users" && method === "GET") {
                const allUsers = Array.from(state.users.values());
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify({
                        users: allUsers,
                        aud: "authenticated",
                        total: allUsers.length,
                    }),
                );
                return;
            }

            // Admin: Delete User
            if (pathname.startsWith("/auth/v1/admin/users/") && method === "DELETE") {
                const userId = pathname.replace("/auth/v1/admin/users/", "").split("/")[0] || "";
                const user = state.users.get(userId);
                if (user) {
                    state.users.delete(userId);
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({user}));
                } else {
                    res.writeHead(404, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({message: "User not found", status: 404}));
                }
                return;
            }
        }

        // 4. Storage API (/storage/v1/...)
        if (pathname.startsWith("/storage/v1/")) {
            // Bucket list & create
            if (pathname === "/storage/v1/bucket") {
                if (method === "GET") {
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(Array.from(state.buckets.values())));
                    return;
                }
                if (method === "POST") {
                    const bucketId = String(bodyJson?.["id"] || bodyJson?.["name"] || "new-bucket");
                    const bucketObj = {
                        id: bucketId,
                        name: bucketId,
                        public: bodyJson?.["public"] ?? false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    state.buckets.set(bucketId, bucketObj);
                    if (!state.storageObjects.has(bucketId)) {
                        state.storageObjects.set(bucketId, new Map());
                    }
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({name: bucketId}));
                    return;
                }
            }

            // Get Bucket
            if (pathname.startsWith("/storage/v1/bucket/") && method === "GET") {
                const bucketId = pathname.replace("/storage/v1/bucket/", "").split("/")[0] || "";
                const bucket = state.buckets.get(bucketId);
                if (bucket) {
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(bucket));
                } else {
                    res.writeHead(404, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({statusCode: "404", error: "Bucket not found"}));
                }
                return;
            }

            // List objects in bucket (/storage/v1/object/list/:bucketId)
            if (pathname.startsWith("/storage/v1/object/list/") && method === "POST") {
                const bucketId = pathname.replace("/storage/v1/object/list/", "").split("/")[0] || "";
                const bucketFiles = state.storageObjects.get(bucketId) || new Map();
                const list = Array.from(bucketFiles.entries()).map(([name, data]) => ({
                    name,
                    id: name,
                    metadata: {size: data.content.length, mimetype: data.contentType},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                }));
                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(list));
                return;
            }

            // Upload object (/storage/v1/object/:bucketId/:path...)
            if (pathname.startsWith("/storage/v1/object/") && method === "POST") {
                const parts = pathname.replace("/storage/v1/object/", "").split("/");
                const bucketId = parts[0] || "";
                const filePath = parts.slice(1).join("/");

                if (!state.storageObjects.has(bucketId)) {
                    state.storageObjects.set(bucketId, new Map());
                }
                const bucketMap = state.storageObjects.get(bucketId)!;
                const contentType = (req.headers["content-type"] as string) || "application/octet-stream";

                bucketMap.set(filePath, {
                    content: Buffer.concat(chunks),
                    contentType,
                });

                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(
                    JSON.stringify({
                        Key: `${bucketId}/${filePath}`,
                        Id: filePath,
                        path: filePath,
                        fullPath: `${bucketId}/${filePath}`,
                    }),
                );
                return;
            }

            // Download object (/storage/v1/object/:bucketId/:path... or /storage/v1/object/authenticated/:bucketId/:path...)
            if (pathname.startsWith("/storage/v1/object/") && method === "GET") {
                let clean = pathname.replace("/storage/v1/object/", "");
                if (clean.startsWith("authenticated/")) {
                    clean = clean.replace("authenticated/", "");
                } else if (clean.startsWith("public/")) {
                    clean = clean.replace("public/", "");
                }
                const parts = clean.split("/");
                const bucketId = parts[0] || "";
                const filePath = parts.slice(1).join("/");

                const bucketMap = state.storageObjects.get(bucketId);
                const file = bucketMap?.get(filePath);

                if (file) {
                    res.writeHead(200, {
                        "Content-Type": file.contentType,
                        "Content-Length": String(file.content.length),
                    });
                    res.end(file.content);
                } else {
                    res.writeHead(404, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({statusCode: "404", error: "Not Found", message: "Object not found"}));
                }
                return;
            }

            // Delete object (/storage/v1/object/:bucketId)
            if (pathname.startsWith("/storage/v1/object/") && method === "DELETE") {
                const bucketId = pathname.replace("/storage/v1/object/", "").split("/")[0] || "";
                const bucketMap = state.storageObjects.get(bucketId);
                const prefixes = (bodyJson?.["prefixes"] as string[]) || [];
                const deleted: any[] = [];

                if (bucketMap) {
                    for (const p of prefixes) {
                        bucketMap.delete(p);
                        deleted.push({name: p, message: "Successfully deleted"});
                    }
                }

                res.writeHead(200, {"Content-Type": "application/json"});
                res.end(JSON.stringify(deleted));
                return;
            }
        }

        // 5. Edge Functions API (/functions/v1/:function_name)
        if (pathname.startsWith("/functions/v1/")) {
            const funcName = pathname.replace("/functions/v1/", "").split("/")[0] || "";
            const handler = state.functionsHandlers.get(funcName);

            if (handler) {
                try {
                    const result = handler(bodyJson);
                    res.writeHead(200, {"Content-Type": "application/json"});
                    res.end(JSON.stringify(result));
                } catch (err: any) {
                    res.writeHead(500, {"Content-Type": "application/json"});
                    res.end(JSON.stringify({error: err.message || "Function error"}));
                }
            } else {
                res.writeHead(404, {"Content-Type": "application/json"});
                res.end(JSON.stringify({error: `Function not found: ${funcName}`}));
            }
            return;
        }

        // Fallback default response
        res.writeHead(200, {"Content-Type": "application/json"});
        res.end(JSON.stringify({status: "ok"}));
    });

    return new Promise((resolve, reject) => {
        server.listen(port, () => {
            const addr = server.address() as any;
            const actualPort = addr.port;
            resolve({
                server,
                port: actualPort,
                endpoint: `http://127.0.0.1:${actualPort}`,
                state,
                reset,
                close: () =>
                    new Promise<void>(resClose => {
                        if (typeof server.closeAllConnections === "function") {
                            server.closeAllConnections();
                        }
                        server.close(() => resClose());
                    }),
            });
        });
        server.on("error", reject);
    });
}
