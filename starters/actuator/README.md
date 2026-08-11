# 🔍 `@nodeboot/starter-actuator` – Node-Boot Actuator Starter

[![npm version](https://img.shields.io/npm/v/@nodeboot/starter-actuator.svg)](https://www.npmjs.com/package/@nodeboot/starter-actuator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Node-Boot Actuator Starter** provides production-ready monitoring, health checks, and application insights for
> Node-Boot applications, following Spring Boot Actuator patterns for the Node.js ecosystem.

## Overview

The Node-Boot Actuator Starter brings comprehensive application monitoring and observability to your Node.js
applications. It automatically exposes an `/actuator` family of operational endpoints for health checks, Prometheus
metrics, build/git information, memory diagnostics, and introspection of your application's controllers,
interceptors and middlewares — with zero manual route wiring.

### Key Features

✅ **Auto-Configuration** – Zero-configuration setup, endpoints are bound automatically at bootstrap  
✅ **Health Checks** – Liveness/readiness endpoints that reflect real application lifecycle state  
✅ **Prometheus Metrics** – Default Node.js process metrics plus HTTP request count/duration histograms  
✅ **Application Info** – Runtime info (host, Node version, uptime, active profiles) and build metadata from
`package.json`  
✅ **Git Info** – Optional endpoint exposing commit/branch metadata from a `git.properties` file  
✅ **Introspection Endpoints** – Inspect registered controllers, interceptors, and middlewares at runtime  
✅ **Multi-Framework Support** – Works with Express, Fastify, Koa, and native `http` servers  
✅ **Production-Ready** – Battle-tested monitoring patterns from Spring Boot Actuator

---

## 📦 Installation

### Prerequisites

-   Node.js 18+
-   A Node-Boot application using one of the supported servers: Express, Fastify, Koa, or native HTTP
-   `@EnableDI(Container)` on your application class — the actuator resolves core services (`ConfigService`,
    `CoreInfoService`, `HealthService`, `Logger`) from the DI container and **throws at bootstrap** if it's missing

### Install the Starter

```bash
# pnpm (recommended)
pnpm add @nodeboot/starter-actuator

# npm
npm install @nodeboot/starter-actuator

# yarn
yarn add @nodeboot/starter-actuator
```

---

## ⚡ Quick Start

### 1️⃣ Enable Actuator in Your Application

```typescript
import "reflect-metadata";
import {Container} from "typedi";
import {NodeBoot, NodeBootApp, NodeBootApplication, NodeBootAppView} from "@nodeboot/core";
import {ExpressServer} from "@nodeboot/express-server";
import {EnableDI} from "@nodeboot/di";
import {EnableComponentScan} from "@nodeboot/aot";
import {EnableActuator} from "@nodeboot/starter-actuator";

@EnableDI(Container)
@EnableActuator()
@EnableComponentScan()
@NodeBootApplication()
export class Application implements NodeBootApp {
    start(): Promise<NodeBootAppView> {
        return NodeBoot.run(ExpressServer);
    }
}
```

`@EnableActuator()` registers an `ActuatorAdapter` on the application context. At bootstrap, the framework picks the
concrete adapter implementation (Express/Fastify/Koa/native HTTP) matching your chosen server and binds all
`/actuator/*` routes directly on your application's router — no extra wiring required.

### 2️⃣ Verify Setup

```bash
# Start your application
pnpm start

# Access the actuator endpoints:
curl http://localhost:3000/actuator/health
curl http://localhost:3000/actuator/info
curl http://localhost:3000/actuator/metrics
curl http://localhost:3000/actuator/prometheus

# Look for these log messages indicating successful setup:
# =====> 🏭 Actuator is Active :) = http://localhost:3000/actuator
# =====> 🚥 Prometheus monitoring endpoint is live :) = http://localhost:3000/actuator/prometheus
```

---

## 📡 Available Endpoints

| Endpoint                         | Description                                                                                      |
| -------------------------------- | ------------------------------------------------------------------------------------------------ |
| `GET /actuator`                  | Lists all available actuator endpoints.                                                          |
| `GET /actuator/info`             | Runtime info: hostname, Node version, load average, uptime, active profiles, build info.         |
| `GET /actuator/git`              | Git branch/commit metadata, read from a `git.properties` file (see below).                       |
| `GET /actuator/config`           | The fully resolved application configuration (see ⚠️ security note below).                       |
| `GET /actuator/memory`           | Memory diagnostics: `os.freemem/totalmem`, `process.memoryUsage()`, V8 heap statistics.          |
| `GET /actuator/metrics`          | All registered Prometheus metrics, as JSON.                                                      |
| `GET /actuator/prometheus`       | All registered Prometheus metrics, in Prometheus text exposition format.                         |
| `GET /actuator/controllers`      | Introspection of all registered Node-Boot controllers, routes, and actions.                      |
| `GET /actuator/interceptors`     | Introspection of all registered interceptors.                                                    |
| `GET /actuator/middlewares`      | Introspection of all registered middlewares.                                                     |
| `GET /actuator/health`           | Combined readiness + liveness payload, plus links to the individual endpoints below.             |
| `GET /actuator/health/readiness` | `200` once the app (and persistence layer, if enabled) has finished starting; `503` otherwise.   |
| `GET /actuator/health/liveness`  | Always `200 {"status": "ok"}` while the process is running — suitable for basic liveness probes. |

## ❤️ Health Checks and Application Lifecycle

`/actuator/health/readiness` is not a static "OK" — it's wired to Node-Boot's application lifecycle:

-   If `@nodeboot/starter-persistence` (`@EnableRepositories()`) is **not** enabled, readiness flips to `true` as
    soon as the `application.started` lifecycle event fires.
-   If persistence **is** enabled, readiness stays `503 {"message": "Backend has not started yet"}` until the
    `persistence.started` event fires (i.e. the datasource has actually connected), so orchestrators (Kubernetes,
    ECS, ...) won't route traffic to an instance whose database connection isn't ready yet.
-   `/actuator/health/liveness` always reports `200`, and is intended purely to detect whether the process itself is
    alive/hung — use `readiness` for traffic-routing decisions and `liveness` for restart decisions.

```bash
curl http://localhost:3000/actuator/health/readiness
# {"status":"ok"}                                     # once ready
# {"message":"Backend has not started yet","status":"error"}  (HTTP 503, before ready)
```

## 📈 Prometheus Metrics

The actuator registers a dedicated `prom-client` `Registry` and collects:

-   **Default Node.js process metrics** (event loop lag, GC duration, memory, CPU, etc.) via
    `Prometheus.collectDefaultMetrics()`.
-   **`app_http_request_count`** — a `Counter` labeled by `method`, `route`, and `statusCode`, incremented on every
    request that finishes.
-   **`app_http_request_duration_milliseconds`** — a `Histogram` labeled by `method`, `route`, and `code`, recording
    request duration.

Metrics recording is offloaded via `setImmediate` so it never blocks the response.

```bash
# Prometheus text format, ready to be scraped:
curl http://localhost:3000/actuator/prometheus

# Same metrics as JSON:
curl http://localhost:3000/actuator/metrics
```

Point your Prometheus `scrape_configs` at `/actuator/prometheus` to start collecting these metrics.

## 🌱 Git Info

`/actuator/git` follows the same convention as Spring Boot's `git-commit-id-plugin`: it reads a `git.properties`
file from your application's working directory (via the `properties-reader` library) with keys such as:

```properties
git.branch=main
git.commit.id=1a2b3c4d5e6f7890abcdef1234567890abcdef12
git.commit.id.abbrev=1a2b3c4
git.commit.time=2025-01-15T10:30:00Z
git.commit.user.name=Jane Doe
git.commit.user.email=jane@example.com
git.commit.message.full=Fix actuator health check
git.commit.message.short=Fix actuator health check
```

Node-Boot itself does not generate this file — since there's no Node.js equivalent of the Maven/Gradle
`git-commit-id-plugin`, generate it yourself as a prebuild step, for example:

```json
{
    "scripts": {
        "generate:git-info": "echo \"git.branch=$(git rev-parse --abbrev-ref HEAD)\ngit.commit.id=$(git rev-parse HEAD)\ngit.commit.id.abbrev=$(git rev-parse --short HEAD)\ngit.commit.time=$(git log -1 --format=%cI)\" > git.properties",
        "prebuild": "pnpm run generate:git-info"
    }
}
```

If `git.properties` is missing, `/actuator/git` simply returns `undefined`/an empty body instead of failing.

## ⚠️ Security Note on `/actuator/config`

`/actuator/config` returns your **entire resolved configuration tree**, including any secrets interpolated from
environment variables at load time. Treat all `/actuator/*` endpoints as internal/operational surface: put them
behind network-level restrictions (VPC, internal load balancer, sidecar auth) or a reverse-proxy rule, rather than
exposing them on the public internet alongside your API.

## 🖥️ Framework Support

The actuator binds routes through a framework-specific adapter chosen automatically based on which Node-Boot server
you use (`ExpressServer`, `FastifyServer`, `KoaServer`, or `HttpServer`). If `@EnableActuator()` is applied with an
unsupported server type, bootstrap fails fast with a clear error asking you to remove the decorator.

## 🎉 Conclusion

`@nodeboot/starter-actuator` brings Spring Boot Actuator-style production readiness to Node-Boot applications:
health checks tied to real lifecycle state, Prometheus metrics out of the box, and introspection endpoints for
controllers, interceptors and middlewares — all with a single `@EnableActuator()` decorator.

## 📚 Resources

-   [Spring Boot Actuator (reference inspiration)](https://docs.spring.io/spring-boot/docs/current/reference/html/actuator.html)
-   [prom-client (Prometheus client for Node.js)](https://github.com/siimon/prom-client)
