---
"@nodeboot/express-server": patch
"@nodeboot/http-server": patch
"@nodeboot/encore-server": patch
"@nodeboot/koa-server": patch
"@nodeboot/hono-server": patch
---

An action that answers through `@Res()` itself and returns nothing now keeps its response, instead of the server answering again with a 404.

-   Express, native HTTP and Encore: an action that sends the response itself (for example `res.writeHead(...)` and `res.end(...)`, or a stream of Server-Sent Events) keeps it. Before, the second answer failed with "Cannot set headers after they are sent". An error thrown after the action already answered is now logged instead of being sent as a second response.
-   Koa: an action that sets `response.status` and `response.body` itself, or takes over the raw response with `ctx.respond = false`, keeps its answer.
-   Hono: an action that sets `c.res` itself (for example a streaming `Response`) keeps its answer.
