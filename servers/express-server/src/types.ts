import {CorsOptions} from "cors";
import {Options as MulterOptions} from "multer";
import {ServerConfigOptions, ServerConfigProperties} from "@nodeboot/engine";
import {ParseOptions, SerializeOptions} from "cookie";
import {SessionOptions} from "express-session";

export type ExpressServerConfigs = ServerConfigOptions<
    ParseOptions & SerializeOptions,
    CorsOptions,
    SessionOptions,
    MulterOptions
>;

export type ExpressServerConfigProperties = ServerConfigProperties<
    SerializeOptions,
    CorsOptions,
    SessionOptions,
    MulterOptions
>;
