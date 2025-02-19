import {CorsOptions} from "cors";
import {Options as MulterOptions} from "multer";
import {ServerConfigOptions, ServerConfigProperties} from "@nodeboot/engine";
import {CookieParseOptions, CookieSerializeOptions} from "cookie";
import {SessionOptions} from "express-session";

export type ExpressServerConfigs = ServerConfigOptions<
    CookieParseOptions & CookieSerializeOptions,
    CorsOptions,
    SessionOptions,
    MulterOptions
>;

export type ExpressServerConfigProperties = ServerConfigProperties<
    CookieSerializeOptions,
    CorsOptions,
    SessionOptions,
    MulterOptions
>;
