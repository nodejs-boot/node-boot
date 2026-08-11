/**
 * Node-Boot application configuration, expressed as a plain TypeScript object instead of an
 * `app-config.yaml` file.
 *
 * @remarks
 *
 * `@nodeboot/config` normally discovers and loads `app-config.yaml` from disk (via
 * `@backstage/cli-common`'s `findPaths`). The Cloudflare Workers runtime has no filesystem at
 * all, so file-based config discovery can never succeed there - not even during `wrangler dev`,
 * which runs the real `workerd` runtime. `@nodeboot/config` gracefully falls back to just
 * `additionalConfigData` when file-based discovery fails, so we pass this object straight into
 * `NodeBoot.run(CloudflareServer, appConfig)` instead, to guarantee the app is configured the
 * same way locally (`wrangler dev`, `pnpm run invoke:local`) and once deployed. There is no
 * `app-config.yaml` file in this sample - this is the single source of truth for configuration.
 */
export const appConfig = {
    app: {
        name: "cloudflare-sample",
        platform: "node-boot",
        environment: "development",
        defaultErrorHandler: false,
    },
    api: {
        routePrefix: "/api",
        nullResultCode: 200,
        undefinedResultCode: 204,
        paramOptions: {
            required: false,
        },
        validations: {
            enableDebugMessages: false,
            skipUndefinedProperties: false,
            skipNullProperties: false,
            skipMissingProperties: false,
            whitelist: true,
            forbidNonWhitelisted: true,
            forbidUnknownValues: true,
            stopAtFirstError: false,
        },
    },
    logger: {
        level: "info",
    },
};
