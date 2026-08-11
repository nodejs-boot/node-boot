/**
 * Cloudflare Workers stub for the `glob` package.
 *
 * `@nodeboot/engine`'s `ClassFiles.loadFromDirectories` (used only by Node-Boot's
 * directory-scanning/AOT component discovery) depends on `glob`, which relies on
 * Node's filesystem APIs and is not available in the Workers runtime. This sample
 * does not use directory scanning (controllers/services/middlewares are imported
 * explicitly in `src/app.ts`), so this path is never actually invoked at runtime.
 * This stub exists purely to satisfy esbuild's static bundling of `@nodeboot/engine`.
 */
module.exports = {
    sync() {
        return [];
    },
};
