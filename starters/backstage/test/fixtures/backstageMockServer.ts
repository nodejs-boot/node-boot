import http, {IncomingMessage, ServerResponse} from "node:http";
import {Entity} from "@backstage/catalog-model";
import {Location} from "@backstage/catalog-client";

export interface MockRequestRecord {
    method: string;
    url: string;
    headers: http.IncomingHttpHeaders;
    body?: any;
}

export interface BackstageMockState {
    entities: Entity[];
    locations: Location[];
    requests: MockRequestRecord[];
}

export interface BackstageMockServerHandle {
    server: http.Server;
    port: number;
    apiUrl: string;
    state: BackstageMockState;
    close: () => Promise<void>;
}

export const SAMPLE_ENTITIES: Entity[] = [
    {
        apiVersion: "backstage.io/v1alpha1",
        kind: "Component",
        metadata: {
            name: "service-catalog",
            namespace: "default",
            uid: "uid-service-catalog-001",
            title: "Service Catalog API",
            description: "Core service catalog component in Backstage",
            annotations: {
                "backstage.io/managed-by-location":
                    "url:https://github.com/nodejs-boot/node-boot/blob/main/catalog-info.yaml",
            },
            tags: ["typescript", "nodeboot", "starter"],
        },
        spec: {
            type: "service",
            lifecycle: "production",
            owner: "team-platform",
        },
    },
    {
        apiVersion: "backstage.io/v1alpha1",
        kind: "Component",
        metadata: {
            name: "auth-service",
            namespace: "default",
            uid: "uid-auth-service-002",
            title: "Authentication Service",
            description: "Handles user authentication and tokens",
            tags: ["security", "auth"],
        },
        spec: {
            type: "service",
            lifecycle: "production",
            owner: "team-security",
        },
    },
    {
        apiVersion: "backstage.io/v1alpha1",
        kind: "API",
        metadata: {
            name: "catalog-openapi",
            namespace: "default",
            uid: "uid-api-openapi-003",
            title: "Catalog OpenAPI Spec",
            description: "OpenAPI definition for catalog service",
        },
        spec: {
            type: "openapi",
            lifecycle: "production",
            owner: "team-platform",
        },
    },
];

export const SAMPLE_LOCATIONS: Location[] = [
    {
        id: "loc-001",
        type: "url",
        target: "https://github.com/nodejs-boot/node-boot/blob/main/catalog-info.yaml",
    },
    {
        id: "loc-002",
        type: "url",
        target: "https://github.com/nodejs-boot/node-boot/blob/main/auth-catalog.yaml",
    },
];

export function createBackstageMockServer(port = 0): BackstageMockServerHandle {
    const state: BackstageMockState = {
        entities: JSON.parse(JSON.stringify(SAMPLE_ENTITIES)),
        locations: JSON.parse(JSON.stringify(SAMPLE_LOCATIONS)),
        requests: [],
    };

    const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(chunk);
        }
        const rawBody = Buffer.concat(chunks).toString("utf-8");
        let parsedBody: any = undefined;
        if (rawBody && (req.headers["content-type"] || "").includes("application/json")) {
            try {
                parsedBody = JSON.parse(rawBody);
            } catch {
                parsedBody = rawBody;
            }
        }

        const fullUrl = req.url || "/";
        state.requests.push({
            method: req.method || "GET",
            url: fullUrl,
            headers: req.headers,
            body: parsedBody,
        });

        const urlParts = fullUrl.split("?");
        const path = urlParts[0] || "/";
        const queryString = urlParts[1] || "";
        const queryParams = new URLSearchParams(queryString);

        // All catalog requests are directed to /api/catalog/...
        const prefix = "/api/catalog";
        if (!path.startsWith(prefix)) {
            res.writeHead(404, {"Content-Type": "application/json"});
            res.end(JSON.stringify({error: "Not Found", message: `Path ${path} not supported`}));
            return;
        }

        const subPath = path.slice(prefix.length) || "/";

        res.setHeader("Content-Type", "application/json");

        // 1. GET /entities/by-query
        if (req.method === "GET" && subPath === "/entities/by-query") {
            const limitStr = queryParams.get("limit");
            const limit = limitStr ? parseInt(limitStr, 10) : state.entities.length;
            const items = state.entities.slice(0, limit);
            res.writeHead(200);
            res.end(
                JSON.stringify({
                    items,
                    totalItems: state.entities.length,
                    pageInfo: {
                        nextCursor: "cursor-next-token",
                        prevCursor: "cursor-prev-token",
                    },
                }),
            );
            return;
        }

        // 2. POST /entities/by-refs
        if (req.method === "POST" && subPath === "/entities/by-refs") {
            const requestedRefs: string[] = parsedBody?.entityRefs || [];
            const matchedItems = requestedRefs.map(ref => {
                const lowerRef = ref.toLowerCase();
                return state.entities.find(e => {
                    const kind = (e.kind || "").toLowerCase();
                    const ns = (e.metadata.namespace || "default").toLowerCase();
                    const name = (e.metadata.name || "").toLowerCase();
                    const fullRef = `${kind}:${ns}/${name}`;
                    const shortRef = `${kind}:${name}`;
                    return lowerRef === fullRef || lowerRef === shortRef;
                });
            });
            res.writeHead(200);
            res.end(JSON.stringify({items: matchedItems}));
            return;
        }

        // 3. GET /entities/by-name/:kind/:namespace/:name/ancestry
        const ancestryMatch = subPath.match(/^\/entities\/by-name\/([^/]+)\/([^/]+)\/([^/]+)\/ancestry$/);
        if (req.method === "GET" && ancestryMatch) {
            const [, matchKind = "", matchNamespace = "", matchName = ""] = ancestryMatch;
            const rootRef = `${matchKind}:${matchNamespace}/${matchName}`;
            const entity = state.entities.find(
                e =>
                    e.kind.toLowerCase() === matchKind.toLowerCase() &&
                    (e.metadata.namespace || "default").toLowerCase() === matchNamespace.toLowerCase() &&
                    e.metadata.name.toLowerCase() === matchName.toLowerCase(),
            );

            if (!entity) {
                res.writeHead(404);
                res.end(JSON.stringify({error: "NotFound", message: `Entity ${rootRef} not found`}));
                return;
            }

            res.writeHead(200);
            res.end(
                JSON.stringify({
                    rootEntityRef: rootRef,
                    items: [
                        {
                            entity,
                            parentEntityRefs: ["group:default/team-platform"],
                        },
                    ],
                }),
            );
            return;
        }

        // 4. GET /entities/by-name/:kind/:namespace/:name
        const entityByNameMatch = subPath.match(/^\/entities\/by-name\/([^/]+)\/([^/]+)\/([^/]+)$/);
        if (req.method === "GET" && entityByNameMatch) {
            const [, matchKind = "", matchNamespace = "", matchName = ""] = entityByNameMatch;
            const entity = state.entities.find(
                e =>
                    e.kind.toLowerCase() === matchKind.toLowerCase() &&
                    (e.metadata.namespace || "default").toLowerCase() === matchNamespace.toLowerCase() &&
                    e.metadata.name.toLowerCase() === matchName.toLowerCase(),
            );
            if (!entity) {
                res.writeHead(404);
                res.end(
                    JSON.stringify({
                        error: "NotFound",
                        message: `Entity ${matchKind}:${matchNamespace}/${matchName} not found`,
                    }),
                );
                return;
            }
            res.writeHead(200);
            res.end(JSON.stringify(entity));
            return;
        }

        // 5. DELETE /entities/by-uid/:uid
        const deleteEntityMatch = subPath.match(/^\/entities\/by-uid\/([^/]+)$/);
        if (req.method === "DELETE" && deleteEntityMatch) {
            const [, uid] = deleteEntityMatch;
            const idx = state.entities.findIndex(e => e.metadata.uid === uid);
            if (idx !== -1) {
                state.entities.splice(idx, 1);
            }
            res.writeHead(204);
            res.end();
            return;
        }

        // 6. GET /entities
        if (req.method === "GET" && subPath === "/entities") {
            res.writeHead(200);
            res.end(JSON.stringify(state.entities));
            return;
        }

        // 7. GET /entity-facets
        if (req.method === "GET" && subPath === "/entity-facets") {
            res.writeHead(200);
            res.end(
                JSON.stringify({
                    facets: {
                        kind: [
                            {value: "Component", count: 2},
                            {value: "API", count: 1},
                        ],
                    },
                }),
            );
            return;
        }

        // 8. POST /refresh
        if (req.method === "POST" && subPath === "/refresh") {
            res.writeHead(200);
            res.end(JSON.stringify({status: "refreshed"}));
            return;
        }

        // 9. POST /validate-entity
        if (req.method === "POST" && subPath === "/validate-entity") {
            const entity = parsedBody?.entity;
            if (entity && entity.apiVersion && entity.kind && entity.metadata?.name) {
                res.writeHead(200);
                res.end(JSON.stringify({valid: true}));
            } else {
                res.writeHead(400);
                res.end(
                    JSON.stringify({
                        errors: [{message: "Entity missing required fields: kind, apiVersion, metadata.name"}],
                    }),
                );
            }
            return;
        }

        // 10. GET /locations/by-entity/:kind/:namespace/:name
        const locByEntityMatch = subPath.match(/^\/locations\/by-entity\/([^/]+)\/([^/]+)\/([^/]+)$/);
        if (req.method === "GET" && locByEntityMatch) {
            const [, matchKind = "", matchNamespace = "", matchName = ""] = locByEntityMatch;
            const entity = state.entities.find(
                e =>
                    e.kind.toLowerCase() === matchKind.toLowerCase() &&
                    (e.metadata.namespace || "default").toLowerCase() === matchNamespace.toLowerCase() &&
                    e.metadata.name.toLowerCase() === matchName.toLowerCase(),
            );
            if (entity && entity.metadata.annotations?.["backstage.io/managed-by-location"]) {
                const target = entity.metadata.annotations["backstage.io/managed-by-location"].replace(/^url:/, "");
                res.writeHead(200);
                res.end(
                    JSON.stringify({
                        id: "loc-001",
                        type: "url",
                        target,
                    }),
                );
                return;
            }
            res.writeHead(404);
            res.end(JSON.stringify({error: "NotFound"}));
            return;
        }

        // 11. GET /locations/:id
        const locByIdMatch = subPath.match(/^\/locations\/([^/]+)$/);
        if (req.method === "GET" && locByIdMatch) {
            const [, id] = locByIdMatch;
            const loc = state.locations.find(l => l.id === id);
            if (loc) {
                res.writeHead(200);
                res.end(JSON.stringify(loc));
            } else {
                res.writeHead(404);
                res.end(JSON.stringify({error: "NotFound", message: `Location ${id} not found`}));
            }
            return;
        }

        // 12. DELETE /locations/:id
        if (req.method === "DELETE" && locByIdMatch) {
            const [, id] = locByIdMatch;
            const idx = state.locations.findIndex(l => l.id === id);
            if (idx !== -1) {
                state.locations.splice(idx, 1);
            }
            res.writeHead(204);
            res.end();
            return;
        }

        // 13. GET /locations
        if (req.method === "GET" && subPath === "/locations") {
            const wrapped = state.locations.map(loc => ({
                data: loc,
            }));
            res.writeHead(200);
            res.end(JSON.stringify(wrapped));
            return;
        }

        // 14. POST /locations
        if (req.method === "POST" && subPath === "/locations") {
            const newLoc: Location = {
                id: `loc-${Date.now()}`,
                type: parsedBody?.type || "url",
                target: parsedBody?.target || "https://example.com/catalog.yaml",
            };
            if (!parsedBody?.dryRun) {
                state.locations.push(newLoc);
            }
            res.writeHead(201);
            res.end(
                JSON.stringify({
                    location: newLoc,
                    entities: [],
                    exists: false,
                }),
            );
            return;
        }

        // Default fallback 404
        res.writeHead(404);
        res.end(JSON.stringify({error: "NotFound", message: `Route ${req.method} ${subPath} not found`}));
    });

    server.listen(port);

    return {
        server,
        port,
        apiUrl: `http://127.0.0.1:${port}/api`,
        state,
        close: () =>
            new Promise<void>(resolve => {
                server.close(() => resolve());
            }),
    };
}

export function startBackstageMockServer(port = 0): Promise<BackstageMockServerHandle> {
    return new Promise(resolve => {
        const handle = createBackstageMockServer(port);
        if (handle.server.listening) {
            const addr = handle.server.address() as any;
            handle.port = addr.port;
            handle.apiUrl = `http://127.0.0.1:${addr.port}/api`;
            resolve(handle);
        } else {
            handle.server.once("listening", () => {
                const addr = handle.server.address() as any;
                handle.port = addr.port;
                handle.apiUrl = `http://127.0.0.1:${addr.port}/api`;
                resolve(handle);
            });
        }
    });
}
