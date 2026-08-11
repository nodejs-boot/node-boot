---
name: nodeboot-runtimes
description: Use when the user wants to run, deploy, or operate a Node-Boot application under a specific process runtime or manager — PM2 (clustering, zero-downtime reload, process monitoring) or Platformatic Watt (hot reload, management API, multi-service runtime) — as opposed to picking the HTTP/serverless framework adapter itself. This is the router that picks the right concrete runtime skill.
---

# Node-Boot Runtimes

"Runtime" contributions/integrations are about **how a built app is deployed and operated**, not
which server framework it uses — any of these wrap an already-working Node-Boot app (Express,
Fastify, Koa, native HTTP, ...) unchanged. See
[`CONTRIBUTING.md` §3 Runtimes](https://github.com/nodejs-boot/node-boot/blob/main/CONTRIBUTING.md#3-runtimes)
for the contribution-side view of this category.

Pick the concrete skill, then stop here:

| Runtime           | Use when                                                                              | Open next                                                                                |
| ----------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| PM2               | Need process clustering, zero-downtime reload, log management, or CLI/web monitoring. | [`../nodeboot-runtime-pm2/SKILL.md`](../nodeboot-runtime-pm2/SKILL.md)                   |
| Platformatic Watt | Need hot reload in dev, a management API, or multi-service runtime orchestration.     | [`../nodeboot-runtime-platformatic/SKILL.md`](../nodeboot-runtime-platformatic/SKILL.md) |

Both are additive: the Node-Boot app's controllers/services/config are untouched — only how the
process is started/wrapped changes.
