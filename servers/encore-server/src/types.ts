import {ServerConfigOptions, ServerConfigProperties} from "@nodeboot/engine";
import {SerializeOptions} from "cookie";
import {IncomingMessage, ServerResponse} from "node:http";
import {CorsOptions} from "./cors.types";

export type EncoreServerConfigs = ServerConfigOptions<SerializeOptions, CorsOptions>;

export type EncoreServerConfigProperties = ServerConfigProperties<SerializeOptions, CorsOptions>;

/**
 * Signature expected by Encore.ts's `api.raw` handler function. Register it as a catch-all raw
 * endpoint from your service's entry point, e.g.:
 *
 * ```ts
 * export const apiHandler = api.raw({expose: true, method: "*", path: "/!path"}, server.getHandler());
 * ```
 */
export type EncoreRawHandler = (req: IncomingMessage, resp: ServerResponse) => Promise<void>;
