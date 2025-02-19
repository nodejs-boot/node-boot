import {ServerConfigOptions, ServerConfigProperties} from "@nodeboot/engine";
import {FastifyCookieOptions} from "@fastify/cookie";
import {FastifyCorsOptions} from "@fastify/cors";
import {FastifySessionOptions} from "@fastify/session";
import {FastifyMultipartOptions} from "@fastify/multipart";
import {FastifyViewOptions} from "@fastify/view";

export type FastifyServerConfigs = ServerConfigOptions<
    FastifyCookieOptions,
    FastifyCorsOptions,
    FastifySessionOptions,
    FastifyMultipartOptions,
    FastifyViewOptions
>;

export type FastifyServerConfigProperties = ServerConfigProperties<
    FastifyCookieOptions,
    FastifyCorsOptions,
    FastifySessionOptions,
    FastifyMultipartOptions,
    FastifyViewOptions
>;
