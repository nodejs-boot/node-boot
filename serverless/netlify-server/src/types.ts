// Re-export Netlify Functions types from the official @netlify/functions package
import {Handler, HandlerContext, HandlerEvent, HandlerResponse} from "@netlify/functions";

export type {HandlerContext, HandlerEvent, HandlerResponse};

/**
 * Signature of the handler function expected by the Netlify Functions Node.js runtime.
 * Export it as the `handler` named export from your `netlify/functions/*.ts` entry point.
 */
export type NetlifyHandler = Handler;
