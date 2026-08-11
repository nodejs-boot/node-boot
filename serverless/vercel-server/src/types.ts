import {IncomingMessage, ServerResponse} from "http";

/**
 * Minimal, dependency-free typings mirroring the request/response shapes exposed by the
 * `@vercel/node` runtime for Node.js Serverless Functions. Vercel functions run in a regular
 * Node.js process (unlike Cloudflare Workers), so `IncomingMessage`/`ServerResponse` from the
 * standard `http` module are the actual runtime objects - Vercel just decorates them with a
 * few convenience properties/methods before invoking the exported handler.
 */

/**
 * Query string parameters, parsed from the request URL. A given key may appear multiple times,
 * in which case its value is an array.
 */
export type VercelRequestQuery = Record<string, string | string[] | undefined>;

/**
 * Cookies parsed from the `Cookie` request header.
 */
export type VercelRequestCookies = Record<string, string | undefined>;

/**
 * Eagerly parsed request body. Vercel parses the body according to the request's `Content-Type`
 * header (JSON, urlencoded, text or raw Buffer) before invoking the handler.
 */
export type VercelRequestBody = any;

/**
 * Incoming request object received by a Vercel Node.js Serverless Function handler.
 */
export interface VercelRequest extends IncomingMessage {
    query: VercelRequestQuery;
    cookies: VercelRequestCookies;
    body: VercelRequestBody;
}

/**
 * Response object passed to a Vercel Node.js Serverless Function handler. It extends the
 * standard `http.ServerResponse` with a handful of Express-like convenience methods.
 */
export interface VercelResponse extends ServerResponse {
    send: (body: any) => VercelResponse;
    json: (jsonBody: any) => VercelResponse;
    status: (statusCode: number) => VercelResponse;
    redirect: (statusOrUrl: number | string, url?: string) => VercelResponse;
}

/**
 * Signature of the handler function expected by the Vercel Node.js runtime.
 * Export it as the default export from your API route file, e.g. `api/[...path].ts`.
 */
export type VercelHandler = (request: VercelRequest, response: VercelResponse) => Promise<void> | void;
