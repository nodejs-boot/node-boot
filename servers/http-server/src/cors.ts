import {CorsOptions, CustomOrigin, StaticOrigin} from "./cors.types";
import {IncomingMessage, ServerResponse} from "node:http";

export function isOriginAllowed(requestOrigin: string | undefined, allowedOrigin: StaticOrigin): boolean {
    if (!requestOrigin) return false;

    if (Array.isArray(allowedOrigin)) {
        return allowedOrigin.some(o => isOriginAllowed(requestOrigin, o));
    }

    if (typeof allowedOrigin === "string") {
        return requestOrigin === allowedOrigin;
    }

    if (allowedOrigin instanceof RegExp) {
        return allowedOrigin.test(requestOrigin);
    }

    return Boolean(allowedOrigin); // true allows all, false blocks all
}

export async function applyCorsHeaders(
    req: IncomingMessage,
    res: ServerResponse,
    options: CorsOptions = {},
): Promise<boolean> {
    const requestOrigin = req.headers.origin;
    const isPreflight = req.method === "OPTIONS";

    const {
        origin = "*",
        methods = "GET,HEAD,PUT,PATCH,POST,DELETE",
        allowedHeaders,
        exposedHeaders,
        credentials = false,
        maxAge,
        preflightContinue = false,
        optionsSuccessStatus = 204,
    } = options;

    let resolvedOrigin: string | undefined = undefined;

    // Handle dynamic origin
    if (typeof origin === "function") {
        return new Promise((resolve, _) => {
            (origin as CustomOrigin)(requestOrigin, (err, allow) => {
                if (err || allow === false) {
                    resolve(false);
                    return;
                }

                resolvedOrigin =
                    requestOrigin && isOriginAllowed(requestOrigin, allow ?? "*") ? requestOrigin : undefined;

                if (resolvedOrigin) {
                    setCorsHeaders(res, {
                        resolvedOrigin,
                        methods,
                        allowedHeaders,
                        exposedHeaders,
                        credentials,
                        maxAge,
                    });
                }

                if (isPreflight && !preflightContinue) {
                    res.statusCode = optionsSuccessStatus;
                    res.end();
                    resolve(false); // stop processing
                } else {
                    resolve(true); // continue processing
                }
            });
        });
    }

    // Static origin matching
    if (origin === true || origin === "*") {
        resolvedOrigin = "*";
    } else if (isOriginAllowed(requestOrigin, origin)) {
        resolvedOrigin = requestOrigin;
    }

    if (resolvedOrigin) {
        setCorsHeaders(res, {
            resolvedOrigin,
            methods,
            allowedHeaders,
            exposedHeaders,
            credentials,
            maxAge,
        });
    }

    // Handle preflight short-circuit
    if (isPreflight && !preflightContinue) {
        res.statusCode = optionsSuccessStatus;
        res.end();
        return false;
    }

    return true;
}

function setCorsHeaders(
    res: ServerResponse,
    {
        resolvedOrigin,
        methods,
        allowedHeaders,
        exposedHeaders,
        credentials,
        maxAge,
    }: {
        resolvedOrigin: string;
        methods?: string | string[];
        allowedHeaders?: string | string[];
        exposedHeaders?: string | string[];
        credentials?: boolean;
        maxAge?: number;
    },
) {
    res.setHeader("Access-Control-Allow-Origin", resolvedOrigin);

    if (credentials) {
        res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (methods) {
        res.setHeader("Access-Control-Allow-Methods", Array.isArray(methods) ? methods.join(",") : methods);
    }

    if (allowedHeaders) {
        res.setHeader(
            "Access-Control-Allow-Headers",
            Array.isArray(allowedHeaders) ? allowedHeaders.join(",") : allowedHeaders,
        );
    }

    if (exposedHeaders) {
        res.setHeader(
            "Access-Control-Expose-Headers",
            Array.isArray(exposedHeaders) ? exposedHeaders.join(",") : exposedHeaders,
        );
    }

    if (maxAge) {
        res.setHeader("Access-Control-Max-Age", maxAge.toString());
    }
}
