---
"@nodeboot/context": minor
---

Added an opt-in `app.lifecycle.failFast` setting. When set to `true` in `app-config.yaml`, the application logs the error and exits with code 1 as soon as a startup feature fails to initialize (for example a `@PostConstruct` method that throws), instead of continuing to start with a half-initialized bean. The default is unchanged: the failure is logged and startup continues. Do not enable this on serverless platforms.
