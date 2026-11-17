---
"@nodeboot/engine": patch
"@nodeboot/fastify-server": patch
---

`@Res()` now works on the Fastify server.

-   An action that takes `@Res()` receives Fastify's reply. Before, it received `undefined` and the request hung, because Fastify's reply is awaitable and was awaited while the parameters were resolved. `@Req()` and the request context are injected the same way.
-   An action that answers through the reply itself (`reply.send(...)`, or `reply.hijack()` and writing to `reply.raw`, for example to stream Server-Sent Events) and returns nothing keeps its response. Before, the server then tried to send a 404 on top of it.
-   An error thrown after the action already answered is logged instead of being sent as a second response.
