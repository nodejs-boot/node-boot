import {ServerConfigOptions, ServerConfigProperties} from "@nodeboot/engine";
import {Options as CorsOptions} from "@koa/cors";
import {opts as SessionOptions} from "koa-session";
import {Options as MulterOptions} from "@koa/multer";

export type KoaServerConfigs = ServerConfigOptions<unknown, CorsOptions, SessionOptions, MulterOptions, unknown>;

export type KoaServerConfigProperties = ServerConfigProperties<
    unknown,
    CorsOptions,
    SessionOptions,
    MulterOptions,
    unknown
>;
