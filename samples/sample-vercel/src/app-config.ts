/**
 * Node-Boot application configuration, expressed as a plain TypeScript object instead of an
 * `app-config.yaml` file.
 *
 * @remarks
 *
 * `@nodeboot/config` normally discovers and loads `app-config.yaml` from disk (via
 * `@backstage/cli-common`'s `findPaths`), which walks up the directory tree from `process.cwd()`
 * looking for the file. Vercel's Node.js Serverless Functions execute from a bundled, traced
 * subset of the repository (via `@vercel/nft`) with an unpredictable working directory, so relying
 * on filesystem discovery of `app-config.yaml` is fragile in that environment. Passing this plain
 * object straight into `NodeBoot.run(VercelServer, appConfig)` instead guarantees the app is
 * configured identically locally (`vercel dev`, `pnpm run invoke:local`) and once deployed. There
 * is no `app-config.yaml` file in this sample - this is the single source of truth for
 * configuration.
 */
export const appConfig = {
    app: {
        name: "vercel-sample",
        platform: "node-boot",
        environment: process.env["VERCEL_ENV"] ?? "development",
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
