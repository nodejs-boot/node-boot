/**
 * Node-Boot application configuration, expressed as a plain TypeScript object instead of an
 * `app-config.yaml` file.
 *
 * @remarks
 *
 * `@nodeboot/config` normally discovers and loads `app-config.yaml` from disk (via
 * `@backstage/cli-common`'s `findPaths`), which walks up the directory tree from `process.cwd()`
 * looking for the file. Netlify Functions execute from a bundled, traced subset of the repository
 * with an unpredictable working directory, so relying on filesystem discovery of
 * `app-config.yaml` is fragile in that environment. Passing this plain object straight into
 * `NodeBoot.run(NetlifyServer, appConfig)` instead guarantees the app is configured identically
 * locally (`netlify dev`, `pnpm run invoke:local`) and once deployed. There is no
 * `app-config.yaml` file in this sample - this is the single source of truth for configuration.
 */
export const appConfig = {
    app: {
        name: "netlify-sample",
        platform: "node-boot",
        environment: process.env["CONTEXT"] ?? "development",
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
