import {ServerConfigOptions, ServerConfigProperties} from "@nodeboot/engine";
import type {cors} from "hono/cors";
import type {CookieOptions} from "hono/utils/cookie";
import type {SessionOptions} from "hono-sessions";
import type {Context} from "hono";

// "hono/cors" declares `CORSOptions` but doesn't export it, so it's derived from `cors`'s own signature.
type CORSOptions = NonNullable<Parameters<typeof cors>[0]>;

/**
 * Options accepted by Hono's `c.req.parseBody()` when extracting `multipart/form-data`
 * or `application/x-www-form-urlencoded` payloads (used for `@Body`, `@UploadedFile` and
 * `@UploadedFiles` parameters).
 */
export type HonoMultipartOptions = {
    /**
     * When true, repeated form fields are collected into arrays instead of keeping only the last value.
     */
    all?: boolean;
    /**
     * When true, dotted field names (e.g. `user.name`) are expanded into nested objects.
     */
    dot?: boolean;
};

export type HonoServerConfigs = ServerConfigOptions<
    CookieOptions,
    CORSOptions,
    SessionOptions,
    HonoMultipartOptions,
    unknown
>;

export type HonoServerConfigProperties = ServerConfigProperties<
    CookieOptions,
    CORSOptions,
    SessionOptions,
    HonoMultipartOptions,
    unknown
>;

/**
 * Request-side data made available to Node-Boot through `Action.request`.
 *
 * Hono's `Request` (Fetch API) can only have its body read once, so the body is eagerly
 * parsed once per request and cached here before the controller action executes.
 */
export interface HonoRequest {
    /**
     * The original Web Fetch API Request object.
     */
    raw: Request;

    /**
     * Uppercased HTTP method.
     */
    method: string;

    /**
     * Parsed request URL.
     */
    url: URL;

    /**
     * Request headers.
     */
    headers: Headers;

    /**
     * Path parameters resolved by Hono's router.
     */
    params: Record<string, string>;

    /**
     * Query string parameters.
     */
    query: Record<string, string>;

    /**
     * Eagerly parsed request body (JSON, text, or multipart/urlencoded form fields), when applicable.
     */
    body?: any;
}

/**
 * Node-Boot exposes the Hono `Context` itself as `Action.response` (and `Action.context`),
 * giving controllers, middlewares and error handlers direct access to `c.header()`, `c.status()`,
 * `c.set()`/`c.get()`, cookies, and every other Hono context API.
 */
export type HonoResponse = Context;
