// Re-export types from the official @google-cloud/functions-framework package. Google Cloud
// Functions (2nd gen) HTTP functions run in a regular Node.js process backed by Express, so the
// `Request`/`Response` objects are Express request/response objects (extended with a couple of
// GCF-specific properties like `rawBody`) - the functions-framework parses the request body
// (JSON, urlencoded, text or raw Buffer) according to the `Content-Type` header before invoking
// the handler, just like it does for query parameters (`req.query`).
import {HttpFunction, Request, Response} from "@google-cloud/functions-framework";

export type {Request as GoogleCloudFunctionsRequest, Response as GoogleCloudFunctionsResponse};

/**
 * Signature of the handler function expected by the Google Cloud Functions Node.js runtime.
 * Register it with `functions.http("name", handler)` from your entry point, e.g. `index.ts`.
 */
export type GoogleCloudFunctionsHandler = HttpFunction;
