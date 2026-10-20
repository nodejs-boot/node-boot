---
"@nodeboot/authorization": patch
"@nodeboot/encore-server": patch
"@nodeboot/express-server": patch
"@nodeboot/fastify-server": patch
"@nodeboot/ghost-server": patch
"@nodeboot/hono-server": patch
"@nodeboot/http-server": patch
"@nodeboot/koa-server": patch
"@nodeboot/cloudflare-server": patch
"@nodeboot/google-cloud-functions-server": patch
"@nodeboot/lambda-server": patch
"@nodeboot/netlify-server": patch
"@nodeboot/vercel-server": patch
"@nodeboot/starter-aws": patch
"@nodeboot/starter-backstage": patch
"@nodeboot/starter-firebase": patch
"@nodeboot/starter-openai": patch
"@nodeboot/starter-openapi": patch
"@nodeboot/starter-scheduler": patch
"@nodeboot/starter-supabase": patch
"@nodeboot/starter-validation": patch
---

Documentation and examples now reflect that Nonna is Node-Boot's default dependency injection container.

-   Examples no longer decorate the application class with `@EnableDI(Container)` or depend on `typedi`; `@EnableDI(container)` remains available for plugging in another container.
-   The unused `typedi` dev dependency was removed. There is no runtime change.
