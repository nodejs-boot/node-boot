/**
 * Express CORS: https://expressjs.com/en/resources/middleware/cors.html
 * Koa CORS: https://github.com/koajs/cors
 * Fastify CORS: https://github.com/fastify/fastify-cors
 *
 * */
export type CorsProperties = {
    /**
     * Configures the Fastify Lifecycle Hook.
     */
    hook?:
        | "onRequest"
        | "preParsing"
        | "preValidation"
        | "preHandler"
        | "preSerialization"
        | "onSend";
    /**
     * Configures the Access-Control-Allow-Origin CORS header.
     */
    origin?: boolean | string | "*" | RegExp | Array<string | RegExp>;
    /**
     * Configures the Access-Control-Allow-Methods CORS header.
     * Expects a comma-delimited string (ex: 'GET,PUT,POST') or an array (ex: ['GET', 'PUT', 'POST']).
     */
    methods?: string | string[];
    /**
     * Configures the Access-Control-Allow-Credentials CORS header.
     * Set to true to pass the header, otherwise it is omitted.
     */
    credentials?: boolean;
    /**
     * Configures the Access-Control-Max-Age CORS header.
     * Set to an integer to pass the header, otherwise it is omitted.
     */
    maxAge?: number;
    /**
     * Configures the Cache-Control header for CORS preflight responses.
     * Set to an integer to pass the header as `Cache-Control: max-age=${cacheControl}`,
     * or set to a string to pass the header as `Cache-Control: ${cacheControl}` (fully define
     * the header value), otherwise the header is omitted.
     */
    cacheControl?: number | string;
    /**
     * Pass the CORS preflight response to the route handler (default: false).
     */
    preflightContinue?: boolean;
    /**
     * Provides a status code to use for successful OPTIONS requests,
     * since some legacy browsers (IE11, various SmartTVs) choke on 204.
     */
    optionsSuccessStatus?: number;
    /**
     * Pass the CORS preflight response to the route handler (default: false).
     */
    preflight?: boolean;
    /**
     * Enforces strict requirement of the CORS preflight request headers (Access-Control-Request-Method and Origin).
     * Preflight requests without the required headers will result in 400 errors when set to `true` (default: `true`).
     */
    strictPreflight?: boolean;
    /**
     * Configures the Access-Control-Expose-Headers CORS header.
     * Expects a comma-delimited string (ex: 'Content-Range,X-Content-Range')
     * or an array (ex: ['Content-Range', 'X-Content-Range']).
     * If not specified, no custom headers are exposed.
     */
    exposedHeaders?: string | string[];
    /**
     * Configures the Access-Control-Allow-Headers CORS header.
     * Expects a comma-delimited string (ex: 'Content-Type,Authorization')
     * or an array (ex: ['Content-Type', 'Authorization']). If not
     * specified, defaults to reflecting the headers specified in the
     * request's Access-Control-Request-Headers header.
     */
    allowedHeaders?: string | string[];
};
