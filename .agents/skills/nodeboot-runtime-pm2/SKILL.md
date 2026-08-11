---
name: nodeboot-runtime-pm2
description: Use when the user wants to run a Node-Boot application with PM2 — process clustering, zero-downtime reload, log management, or CLI/web (pm2.io) monitoring — for any HTTP server adapter (native http, Express, Fastify, Koa). Covers both creating a fresh PM2-wrapped app from the reference sample and adding an ecosystem.config.js to an existing Node-Boot app.
---

# Node-Boot with PM2

Reference sample:
[`nodejs-boot/sample-nodeboot-pm2`](https://github.com/nodejs-boot/sample-nodeboot-pm2) (native
HTTP adapter, already wired for PM2). PM2 wraps an unmodified, already-built Node-Boot app — no
framework code changes, regardless of which HTTP adapter the app uses.

## Fresh start or existing app?

See [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) for the general mechanics.
Specifics for PM2:

-   **Fresh start:** `npx degit nodejs-boot/sample-nodeboot-pm2 <new-app-name>` pulls a Node-Boot
    app that already has `ecosystem.config.js` and the PM2 scripts set up — skip straight to
    [Running](#running).
-   **Existing app:** don't re-scaffold. Instead:

    1. Install PM2 globally: `npm install pm2 -g`.
    2. Make sure the app builds a real entry point first (`pnpm build` → `dist/server.js`, or
       equivalent) — PM2 manages a compiled JS process, not `ts-node`.
    3. Add an `ecosystem.config.js` at the app root:

        ```js
        module.exports = {
            apps: [{name: "<app-name>", script: "dist/server.js", watch: "."}],
        };
        ```

    4. If the app doesn't already use `@nodeboot/starter-actuator`, consider adding it — PM2 process
       health pairs naturally with `/actuator/health` for external checks (see
       [`nodeboot-starter-actuator`](../nodeboot-starter-actuator/SKILL.md)).

## Running

```sh
pm2 start                       # build + AOT compile + start under PM2
pm2 list                        # show managed processes
pm2 logs <app-name>              # tail logs
pm2 stop|restart|delete <app-name>
pm2 monit                        # interactive CPU/mem console
```

Common pitfall: `better-sqlite3` native binding errors after a Node version change — run
`pnpm rebuild:sqlite` (or reinstall) before starting PM2 again.

## Validate

`pm2 start` then hit the app's own health endpoint, e.g.
`curl http://localhost:<port>/actuator/health` (if `starter-actuator` is enabled) or any existing
route — confirm the process shows `online` in `pm2 list` and survives `pm2 restart <app-name>`
with no dropped requests.
