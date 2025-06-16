import {ServerConfigOptions, ServerConfigProperties} from "@nodeboot/engine";
import {SerializeOptions} from "cookie";
import {CorsOptions} from "./cors.types";

export type HttpServerConfigs = ServerConfigOptions<SerializeOptions, CorsOptions>;

export type HttpServerConfigProperties = ServerConfigProperties<SerializeOptions, CorsOptions>;
