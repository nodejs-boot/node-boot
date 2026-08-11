/**
 * Cloudflare Workers run in a pure ESM/V8 isolate environment without CommonJS module
 * semantics, so magic identifiers like `__dirname`/`__filename` that some bundled
 * Node.js dependencies expect at runtime (e.g. `@backstage/cli-common`'s `findPaths`,
 * used internally by `@nodeboot/config` to resolve the `app-config.yaml` location) are
 * undefined here. Since Workers also have no real filesystem, there is no `app-config.yaml`
 * to find anyway — configuration is instead supplied entirely via the `additionalConfig`
 * passed to `NodeBoot.run()`/`CloudflareServer.run()` (see `app.ts`). This shim exists
 * purely to stop those libraries from throwing a `ReferenceError` while attempting (and
 * safely failing to find) filesystem-based config.
 *
 * Import this module FIRST, before anything else, in your Worker entry point.
 */
(globalThis as any).__dirname = "/";
(globalThis as any).__filename = "/worker.js";

export {};
