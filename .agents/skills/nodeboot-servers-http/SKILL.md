---
name: nodeboot-servers-http
description: Use when the user wants to run or deploy a Node-Boot application as a long-lived HTTP server and needs to choose or configure a framework adapter — Express, Fastify, Koa, Hono, native Node http, Encore.ts, or the GhostServer no-HTTP mode.
---

# Node-Boot HTTP Server Adapters

> No repo yet? Decide simple-repo vs. monorepo first — see
> [`../nodeboot-project-type/SKILL.md`](../nodeboot-project-type/SKILL.md).

Pick one concrete skill, then stop here and load only that adapter's details.

| Adapter     | Use when                                                                        | Open next                                                                            |
| ----------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Express     | Default choice when middleware ecosystem and Express compatibility matter most. | [`../nodeboot-server-express/SKILL.md`](../nodeboot-server-express/SKILL.md)         |
| Fastify     | Prefer raw throughput, Fastify plugins, and Fastify-style hooks.                | [`../nodeboot-server-fastify/SKILL.md`](../nodeboot-server-fastify/SKILL.md)         |
| Koa         | Prefer a minimal, async-first middleware style and Koa-native integrations.     | [`../nodeboot-server-koa/SKILL.md`](../nodeboot-server-koa/SKILL.md)                 |
| Hono        | Prefer a Web Standards (Fetch API) based, ultrafast runtime.                    | [`../nodeboot-server-hono/SKILL.md`](../nodeboot-server-hono/SKILL.md)               |
| Native HTTP | Want zero web-framework dependency and the smallest runtime surface.            | [`../nodeboot-server-native-http/SKILL.md`](../nodeboot-server-native-http/SKILL.md) |
| Encore.ts   | Deploying on Encore.ts and routing everything through one `api.raw` handler.    | [`../nodeboot-server-encore/SKILL.md`](../nodeboot-server-encore/SKILL.md)           |
| Ghost       | Need no real HTTP transport at all for tests, CLI tools, embedding, or workers. | [`../nodeboot-server-ghost/SKILL.md`](../nodeboot-server-ghost/SKILL.md)             |

Once the app runs, need PM2 or Platformatic Watt to manage/operate the process? See
[`nodeboot-runtimes`](../nodeboot-runtimes/SKILL.md) — orthogonal to the adapter choice above.
