/**
 * A minimal, dependency-free HTTP router used by the Cloudflare driver.
 *
 * @remarks
 *
 * We can't use `find-my-way` (the router used by the other serverless/HTTP drivers) in Cloudflare
 * Workers because it compiles its route matcher using `new Function(...)` for performance. Workers
 * run inside a V8 isolate with `Content-Security-Policy`-style restrictions that disallow
 * `eval`/`new Function` ("Code generation from strings disallowed for this context"), so any router
 * relying on codegen will throw as soon as a route is registered.
 *
 * This router implements just the subset of the `find-my-way` API that the `CloudflareDriver` needs
 * (`on`/`find`), using plain segment-by-segment matching - no dynamic code generation, so it works
 * fine inside the Workers runtime.
 *
 * @public
 */
export type RouteHandler = (
    request: unknown,
    context: unknown,
    params: Record<string, string>,
    store: unknown,
    searchParams: Record<string, string>,
) => Promise<any> | any;

type RouteDefinition = {
    method: string;
    segments: string[];
    paramNames: (string | null)[];
    hasWildcard: boolean;
    handler: RouteHandler;
};

export type RouteMatch = {
    handler: RouteHandler;
    params: Record<string, string>;
    store: unknown;
    searchParams: Record<string, string>;
};

function splitPath(path: string): string[] {
    return path.split("/").filter(segment => segment.length > 0);
}

export class SimpleRouter {
    private readonly routes: RouteDefinition[] = [];

    on(method: string, path: string, handler: RouteHandler): void {
        const segments = splitPath(path);
        const paramNames: (string | null)[] = [];
        let hasWildcard = false;

        segments.forEach(segment => {
            if (segment === "*") {
                hasWildcard = true;
                paramNames.push(null);
            } else if (segment.startsWith(":")) {
                paramNames.push(segment.slice(1));
            } else {
                paramNames.push(null);
            }
        });

        this.routes.push({
            method: method.toUpperCase(),
            segments,
            paramNames,
            hasWildcard,
            handler,
        });
    }

    find(method: string, path: string): RouteMatch | null {
        const requestSegments = splitPath(path);
        const upperMethod = method.toUpperCase();

        for (const route of this.routes) {
            if (route.method !== upperMethod) continue;

            const match = this.matchRoute(route, requestSegments);
            if (match) {
                return {
                    handler: route.handler,
                    params: match,
                    store: undefined,
                    searchParams: {},
                };
            }
        }

        return null;
    }

    private matchRoute(route: RouteDefinition, requestSegments: string[]): Record<string, string> | null {
        if (!route.hasWildcard && route.segments.length !== requestSegments.length) {
            return null;
        }
        if (route.hasWildcard && requestSegments.length < route.segments.length - 1) {
            return null;
        }

        const params: Record<string, string> = {};

        for (let i = 0; i < route.segments.length; i++) {
            const routeSegment = route.segments[i];
            const paramName = route.paramNames[i];

            if (routeSegment === "*") {
                // Wildcard captures the rest of the path (including this segment onwards)
                params["*"] = requestSegments.slice(i).join("/");
                return params;
            }

            const requestSegment = requestSegments[i];
            if (requestSegment === undefined) {
                return null;
            }

            if (paramName) {
                params[paramName] = decodeURIComponent(requestSegment);
            } else if (routeSegment !== requestSegment) {
                return null;
            }
        }

        return params;
    }
}

export function createRouter(): SimpleRouter {
    return new SimpleRouter();
}
