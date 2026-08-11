/**
 * Minimal, dependency-free typings for the Cloudflare Workers runtime primitives that
 * this package relies on. `Request`, `Response`, `Headers` and `URL` are provided by
 * the standard `lib.dom`/`undici` typings already included in the project, so only the
 * Workers-specific `ExecutionContext` needs to be declared here.
 */
export interface ExecutionContext {
    /**
     * Extends the lifetime of the request handler until the given promise resolves,
     * allowing background work (e.g. logging, caching) to complete.
     */
    waitUntil(promise: Promise<any>): void;

    /**
     * Signals to the runtime that it should not treat an exception thrown by the
     * Worker as fatal for the underlying connection.
     */
    passThroughOnException(): void;
}

/**
 * Environment bindings injected by the Cloudflare Workers runtime (KV namespaces,
 * secrets, service bindings, etc). Consumers should augment this type with their own
 * bindings when needed, e.g. `CloudflareHandler<{MY_KV: KVNamespace}>`.
 */
export type CloudflareEnv = Record<string, any>;

/**
 * Enhanced execution context carrying the Worker's environment bindings alongside the
 * standard `ExecutionContext` API. This is what NodeBoot exposes as the `response`
 * object in the request/action lifecycle.
 */
export type CloudflareContext<TEnv extends CloudflareEnv = CloudflareEnv> = ExecutionContext & {
    env: TEnv;
};

/**
 * Internal representation of an incoming request used across the driver. It wraps the
 * raw Fetch API `Request` together with the parsed URL and, when applicable, the
 * eagerly-parsed request body, since the Fetch API only allows the body to be
 * consumed once.
 */
export interface CloudflareRequest {
    /**
     * The original Web Fetch API Request object.
     */
    raw: Request;

    /**
     * Parsed request URL.
     */
    url: URL;

    /**
     * Uppercased HTTP method.
     */
    method: string;

    /**
     * Request headers.
     */
    headers: Headers;

    /**
     * Eagerly parsed request body (JSON or text), when applicable.
     */
    body?: any;
}

/**
 * Signature of the fetch handler expected by the Cloudflare Workers runtime.
 * Export it as the default export (or as `fetch`) from your Worker entry point.
 */
export type CloudflareHandler<TEnv extends CloudflareEnv = CloudflareEnv> = (
    request: Request,
    env: TEnv,
    ctx: ExecutionContext,
) => Promise<Response>;
