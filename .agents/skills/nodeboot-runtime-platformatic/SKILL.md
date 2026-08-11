---
name: nodeboot-runtime-platformatic
description: Use when the user wants to run a Node-Boot application with Platformatic Watt — hot reload in development, a runtime management API, environment-variable-driven config, or multi-service Watt orchestration — for any HTTP server adapter (native http, Express, Fastify, Koa). Covers both creating a fresh Watt-wrapped app from the reference sample and wrapping an existing Node-Boot app with `wattpm create`.
---

# Node-Boot with Platformatic Watt

Reference sample:
[`nodejs-boot/sample-nodeboot-platformatic`](https://github.com/nodejs-boot/sample-nodeboot-platformatic)
(native HTTP adapter, already wired for Watt). Watt wraps an unmodified Node-Boot app via its own
`watt.json` + `.env` — no framework code changes, regardless of which HTTP adapter the app uses.

## Fresh start or existing app?

See [`../_shared/fresh-vs-existing.md`](../_shared/fresh-vs-existing.md) for the general mechanics.
Specifics for Watt:

-   **Fresh start:** `npx degit nodejs-boot/sample-nodeboot-platformatic <new-app-name>` pulls a
    Node-Boot app that already has `watt.json` and `.env`/`.env.sample` set up — skip straight to
    [Running](#running).
-   **Existing app:** don't re-scaffold. Instead:

    1. From the app root, run `npx wattpm create` — it detects the existing Node.js app, asks to
       "wrap into Watt", and prompts for a port. It writes `.env`, `.env.sample`, `watt.json`, and
       updates `package.json`.
    2. Adapt the generated `watt.json` so `application.commands` matches the app's actual
       `package.json` scripts:

        ```json
        {
            "$schema": "https://schemas.platformatic.dev/@platformatic/node/2.75.2.json",
            "application": {
                "commands": {
                    "development": "pnpm start",
                    "build": "pnpm build",
                    "production": "pnpm start:prod"
                }
            },
            "runtime": {
                "logger": {"level": "{PLT_SERVER_LOGGER_LEVEL}"},
                "server": {"hostname": "{PLT_SERVER_HOSTNAME}", "port": "{PORT}"},
                "managementApi": "{PLT_MANAGEMENT_API}"
            }
        }
        ```

    3. Update `app-config.yaml`'s `app.port` to read from the same `PORT` env var Watt injects, so
       both agree on the port — this is the one Node-Boot config touchpoint.

## Environment variables

| Variable                  | Description                    | Default     |
| ------------------------- | ------------------------------ | ----------- |
| `PORT`                    | App server port                | `3000`      |
| `PLT_SERVER_HOSTNAME`     | Server hostname                | `localhost` |
| `PLT_SERVER_LOGGER_LEVEL` | Watt logger level              | `info`      |
| `PLT_MANAGEMENT_API`      | Enable the Watt management API | `true`      |

## Running

```sh
watt start   # build + AOT compile + start under Watt, with hot reload in dev
```

## Validate

`watt start`, confirm the Node-Boot startup log lines (`Node-Boot application initialized
successfully`, migrations/scheduler registration) appear under the Watt-prefixed log output, then
hit the app's own routes/`/actuator/health` on the configured `PORT`.
