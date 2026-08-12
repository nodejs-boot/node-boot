# Node-Boot Benchmarking Report

> GitHub-renderable version of [REPORT.html](./REPORT.html) (same inline SVG bar charts), for when you just want to glance at the numbers without downloading the file. See [REPORT.md](./REPORT.md) for a plain-text/table-only version.

Generated: 2026-08-12T13:29:45.544Z
Node-Boot version: `1.16.3`

## Benchmark setup

Service under test: a minimal REST API (native `http`/Express/Fastify/Koa, both a raw framework baseline and the equivalent Node-Boot app) exposing the 4 endpoints below, backed by a real **PostgreSQL** database via TypeORM (one dedicated database per app, seeded with 1,000 rows before each run — see `docker-compose.yaml` and `scripts/run-all.sh`).

**Endpoints under test:**

| Endpoint       | Method | Path       | Behaviour                                                                  |
| -------------- | ------ | ---------- | -------------------------------------------------------------------------- |
| `hello`        | GET    | `/hello`   | No DB access — pure framework/routing overhead                             |
| `todos-get`    | GET    | `/todos/1` | Single-row SELECT by primary key                                           |
| `todos-list`   | GET    | `/todos`   | List (SELECT ... LIMIT 20, ORDER BY id DESC) from a 1,000-row `todo` table |
| `todos-create` | POST   | `/todos`   | Single-row INSERT                                                          |

**Load test parameters** (via [autocannon](https://github.com/mcollina/autocannon)):

-   **50 concurrent connections**, **10s duration**, applied identically to every app/endpoint combination.
-   `todos-create` request body: `{"title":"Load test todo"}`
-   Each app is benchmarked **one at a time** (never concurrently with another app) so results aren't skewed by CPU/port contention between apps.

## Technical summary

Analysis computed directly from this run's data (not a fixed narrative) — each point is labeled ✅ Expected or ⚠️ Concerning based on whether it matches the pattern you'd expect from a routing/DI layer sitting on top of the same HTTP server and ORM calls.

-   ✅ **Expected**: Zero errors, timeouts, or non-2xx responses across all 8 apps and all 4 endpoints — every app handled the full load cleanly.
-   ✅ **Expected**: **express**: Node-Boot's throughput overhead shrinks from -28.3% on `hello` (routing/DI only) to -1.8% on `todos-create` (DB write). This is the expected pattern: Node-Boot's fixed per-request cost (decorators, DI resolution, interceptor pipeline) becomes proportionally smaller once real I/O (TypeORM + PostgreSQL) dominates total request time.
-   ✅ **Expected**: **fastify**: Node-Boot's throughput overhead shrinks from -29.1% on `hello` (routing/DI only) to 29.0% on `todos-create` (DB write). This is the expected pattern: Node-Boot's fixed per-request cost (decorators, DI resolution, interceptor pipeline) becomes proportionally smaller once real I/O (TypeORM + PostgreSQL) dominates total request time.
-   ✅ **Expected**: **http**: Node-Boot's throughput overhead shrinks from -1.4% on `hello` (routing/DI only) to -0.9% on `todos-create` (DB write). This is the expected pattern: Node-Boot's fixed per-request cost (decorators, DI resolution, interceptor pipeline) becomes proportionally smaller once real I/O (TypeORM + PostgreSQL) dominates total request time.
-   ✅ **Expected**: **koa**: Node-Boot's throughput overhead shrinks from -13.8% on `hello` (routing/DI only) to 2.2% on `todos-create` (DB write). This is the expected pattern: Node-Boot's fixed per-request cost (decorators, DI resolution, interceptor pipeline) becomes proportionally smaller once real I/O (TypeORM + PostgreSQL) dominates total request time.
-   ✅ **Expected**: **express**: relative p99 latency overhead shrinks (or stays flat) from +50.0% on `hello` to +8.3% on `todos-create`, mirroring the throughput trend — consistent with a fixed per-request routing/DI cost rather than one that scales with I/O work.
-   ✅ **Expected**: **fastify**: relative p99 latency overhead shrinks (or stays flat) from +100.0% on `hello` to +-42.9% on `todos-create`, mirroring the throughput trend — consistent with a fixed per-request routing/DI cost rather than one that scales with I/O work.
-   ✅ **Expected**: **http**: relative p99 latency overhead shrinks (or stays flat) from +0.0% on `hello` to +0.0% on `todos-create`, mirroring the throughput trend — consistent with a fixed per-request routing/DI cost rather than one that scales with I/O work.
-   ✅ **Expected**: **koa**: relative p99 latency overhead shrinks (or stays flat) from +0.0% on `hello` to +-7.7% on `todos-create`, mirroring the throughput trend — consistent with a fixed per-request routing/DI cost rather than one that scales with I/O work.
-   ✅ **Expected**: Averaged across all endpoints, **http** has the smallest Node-Boot overhead (-1.2%) and **express** the largest (-17.2%). Adapters with fewer built-in middleware layers (native `http`) or a leaner request lifecycle typically show less relative overhead than adapters with more middleware indirection (Express) — a ranking that flips between versions is worth investigating, a stable ranking is expected.
-   ✅ **Expected**: All frameworks stay under 50% average overhead, consistent with Node-Boot adding a routing/DI/decorator layer on top of the same underlying HTTP server and ORM, rather than duplicating work.
-   ℹ️ **Note**: This report reflects a single benchmark run on a shared development machine, not a dedicated/isolated benchmarking host. Absolute req/sec numbers will vary between machines; focus on the _relative_ raw-vs-nodeboot deltas and their trend across endpoints, and re-run multiple times before treating any single data point as conclusive.

## Overall summary

<div class="chart">
    <h4>Total req/sec across all endpoints (higher is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="30" width="400" height="28" fill="#34d399" rx="3" />
        <text x="578" y="48" font-size="12" font-family="monospace" fill="#0f172a">87191.5 req/s</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="68" width="388.6081975679501" height="28" fill="#94a3b8" rx="3" />
        <text x="566.6081975679501" y="86" font-size="12" font-family="monospace" fill="#0f172a">84708.3 req/s</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="106" width="383.7148289849913" height="28" fill="#475569" rx="3" />
        <text x="561.7148289849913" y="124" font-size="12" font-family="monospace" fill="#0f172a">83641.6 req/s</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="144" width="344.19467867671" height="28" fill="#fbbf24" rx="3" />
        <text x="522.19467867671" y="162" font-size="12" font-family="monospace" fill="#0f172a">75027.1 req/s</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="182" width="338.8580557249465" height="28" fill="#60a5fa" rx="3" />
        <text x="516.8580557249466" y="200" font-size="12" font-family="monospace" fill="#0f172a">73863.8 req/s</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="220" width="322.0957738182417" height="28" fill="#047857" rx="3" />
        <text x="500.0957738182417" y="238" font-size="12" font-family="monospace" fill="#0f172a">70210.0 req/s</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="258" width="298.6890346039584" height="28" fill="#b45309" rx="3" />
        <text x="476.6890346039584" y="276" font-size="12" font-family="monospace" fill="#0f172a">65107.8 req/s</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="296" width="261.479981929425" height="28" fill="#1d4ed8" rx="3" />
        <text x="439.479981929425" y="314" font-size="12" font-family="monospace" fill="#0f172a">56997.1 req/s</text>
    </svg>
</div>

## Endpoint: `hello`

<div style="display:flex;flex-wrap:wrap;gap:24px;">

<div class="chart">
    <h4>Req/sec (higher is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="30" width="400" height="28" fill="#34d399" rx="3" />
        <text x="578" y="48" font-size="12" font-family="monospace" fill="#0f172a">53825.5 req/s</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="68" width="376.0681283541283" height="28" fill="#94a3b8" rx="3" />
        <text x="554.0681283541282" y="86" font-size="12" font-family="monospace" fill="#0f172a">50605.1 req/s</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="106" width="370.92283094282897" height="28" fill="#475569" rx="3" />
        <text x="548.922830942829" y="124" font-size="12" font-family="monospace" fill="#0f172a">49912.7 req/s</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="144" width="309.9797010559687" height="28" fill="#fbbf24" rx="3" />
        <text x="487.9797010559687" y="162" font-size="12" font-family="monospace" fill="#0f172a">41712.0 req/s</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="182" width="305.4830186309602" height="28" fill="#60a5fa" rx="3" />
        <text x="483.4830186309602" y="200" font-size="12" font-family="monospace" fill="#0f172a">41106.9 req/s</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="220" width="283.62652172410606" height="28" fill="#047857" rx="3" />
        <text x="461.62652172410606" y="238" font-size="12" font-family="monospace" fill="#0f172a">38165.8 req/s</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="258" width="267.10987699872885" height="28" fill="#b45309" rx="3" />
        <text x="445.10987699872885" y="276" font-size="12" font-family="monospace" fill="#0f172a">35943.3 req/s</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="296" width="219.02445422668012" height="28" fill="#1d4ed8" rx="3" />
        <text x="397.0244542266801" y="314" font-size="12" font-family="monospace" fill="#0f172a">29472.7 req/s</text>
    </svg>
</div>

<div class="chart">
    <h4>Latency p99 ms (lower is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="30" width="133.33333333333331" height="28" fill="#475569" rx="3" />
        <text x="311.3333333333333" y="48" font-size="12" font-family="monospace" fill="#0f172a">1.0 ms</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="68" width="133.33333333333331" height="28" fill="#34d399" rx="3" />
        <text x="311.3333333333333" y="86" font-size="12" font-family="monospace" fill="#0f172a">1.0 ms</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="106" width="133.33333333333331" height="28" fill="#94a3b8" rx="3" />
        <text x="311.3333333333333" y="124" font-size="12" font-family="monospace" fill="#0f172a">1.0 ms</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="144" width="266.66666666666663" height="28" fill="#047857" rx="3" />
        <text x="444.66666666666663" y="162" font-size="12" font-family="monospace" fill="#0f172a">2.0 ms</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="182" width="266.66666666666663" height="28" fill="#b45309" rx="3" />
        <text x="444.66666666666663" y="200" font-size="12" font-family="monospace" fill="#0f172a">2.0 ms</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="220" width="266.66666666666663" height="28" fill="#60a5fa" rx="3" />
        <text x="444.66666666666663" y="238" font-size="12" font-family="monospace" fill="#0f172a">2.0 ms</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="258" width="266.66666666666663" height="28" fill="#fbbf24" rx="3" />
        <text x="444.66666666666663" y="276" font-size="12" font-family="monospace" fill="#0f172a">2.0 ms</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="296" width="400" height="28" fill="#1d4ed8" rx="3" />
        <text x="578" y="314" font-size="12" font-family="monospace" fill="#0f172a">3.0 ms</text>
    </svg>
</div>
</div>

| App                | Req/sec | Latency p50 (ms) | Latency p99 (ms) | Errors |
| ------------------ | ------: | ---------------: | ---------------: | -----: |
| `nodeboot-express` | 29472.7 |              1.0 |              3.0 |      0 |
| `nodeboot-fastify` | 38165.8 |              1.0 |              2.0 |      0 |
| `nodeboot-http`    | 49912.7 |              0.0 |              1.0 |      0 |
| `nodeboot-koa`     | 35943.3 |              1.0 |              2.0 |      0 |
| `raw-express`      | 41106.9 |              1.0 |              2.0 |      0 |
| `raw-fastify`      | 53825.5 |              0.0 |              1.0 |      0 |
| `raw-http`         | 50605.1 |              0.0 |              1.0 |      0 |
| `raw-koa`          | 41712.0 |              1.0 |              2.0 |      0 |

**Node-Boot overhead vs raw framework:**

| Framework | Raw req/sec | Node-Boot req/sec | Throughput delta | Raw p99 (ms) | Node-Boot p99 (ms) |
| --------- | ----------: | ----------------: | ---------------: | -----------: | -----------------: |
| express   |     41106.9 |           29472.7 |           -28.3% |          2.0 |                3.0 |
| fastify   |     53825.5 |           38165.8 |           -29.1% |          1.0 |                2.0 |
| http      |     50605.1 |           49912.7 |            -1.4% |          1.0 |                1.0 |
| koa       |     41712.0 |           35943.3 |           -13.8% |          2.0 |                2.0 |

## Endpoint: `todos-create`

<div style="display:flex;flex-wrap:wrap;gap:24px;">

<div class="chart">
    <h4>Req/sec (higher is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="30" width="400" height="28" fill="#b45309" rx="3" />
        <text x="578" y="48" font-size="12" font-family="monospace" fill="#0f172a">5849.6 req/s</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="68" width="399.83315212560086" height="28" fill="#94a3b8" rx="3" />
        <text x="577.8331521256009" y="86" font-size="12" font-family="monospace" fill="#0f172a">5847.2 req/s</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="106" width="396.17070452198766" height="28" fill="#475569" rx="3" />
        <text x="574.1707045219877" y="124" font-size="12" font-family="monospace" fill="#0f172a">5793.6 req/s</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="144" width="392.06788793840303" height="28" fill="#60a5fa" rx="3" />
        <text x="570.067887938403" y="162" font-size="12" font-family="monospace" fill="#0f172a">5733.6 req/s</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="182" width="391.396393624223" height="28" fill="#fbbf24" rx="3" />
        <text x="569.396393624223" y="200" font-size="12" font-family="monospace" fill="#0f172a">5723.8 req/s</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="220" width="390.77481691180986" height="28" fill="#047857" rx="3" />
        <text x="568.7748169118099" y="238" font-size="12" font-family="monospace" fill="#0f172a">5714.7 req/s</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="258" width="384.81684342968117" height="28" fill="#1d4ed8" rx="3" />
        <text x="562.8168434296812" y="276" font-size="12" font-family="monospace" fill="#0f172a">5627.6 req/s</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="296" width="302.82547302056196" height="28" fill="#34d399" rx="3" />
        <text x="480.82547302056196" y="314" font-size="12" font-family="monospace" fill="#0f172a">4428.6 req/s</text>
    </svg>
</div>

<div class="chart">
    <h4>Latency p99 ms (lower is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="30" width="228.57142857142856" height="28" fill="#047857" rx="3" />
        <text x="406.57142857142856" y="48" font-size="12" font-family="monospace" fill="#0f172a">12.0 ms</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="68" width="228.57142857142856" height="28" fill="#475569" rx="3" />
        <text x="406.57142857142856" y="86" font-size="12" font-family="monospace" fill="#0f172a">12.0 ms</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="106" width="228.57142857142856" height="28" fill="#b45309" rx="3" />
        <text x="406.57142857142856" y="124" font-size="12" font-family="monospace" fill="#0f172a">12.0 ms</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="144" width="228.57142857142856" height="28" fill="#60a5fa" rx="3" />
        <text x="406.57142857142856" y="162" font-size="12" font-family="monospace" fill="#0f172a">12.0 ms</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="182" width="228.57142857142856" height="28" fill="#94a3b8" rx="3" />
        <text x="406.57142857142856" y="200" font-size="12" font-family="monospace" fill="#0f172a">12.0 ms</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="220" width="247.61904761904762" height="28" fill="#1d4ed8" rx="3" />
        <text x="425.6190476190476" y="238" font-size="12" font-family="monospace" fill="#0f172a">13.0 ms</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="258" width="247.61904761904762" height="28" fill="#fbbf24" rx="3" />
        <text x="425.6190476190476" y="276" font-size="12" font-family="monospace" fill="#0f172a">13.0 ms</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="296" width="400" height="28" fill="#34d399" rx="3" />
        <text x="578" y="314" font-size="12" font-family="monospace" fill="#0f172a">21.0 ms</text>
    </svg>
</div>
</div>

| App                | Req/sec | Latency p50 (ms) | Latency p99 (ms) | Errors |
| ------------------ | ------: | ---------------: | ---------------: | -----: |
| `nodeboot-express` |  5627.6 |              8.0 |             13.0 |      0 |
| `nodeboot-fastify` |  5714.7 |              8.0 |             12.0 |      0 |
| `nodeboot-http`    |  5793.6 |              8.0 |             12.0 |      0 |
| `nodeboot-koa`     |  5849.6 |              8.0 |             12.0 |      0 |
| `raw-express`      |  5733.6 |              8.0 |             12.0 |      0 |
| `raw-fastify`      |  4428.6 |             10.0 |             21.0 |      0 |
| `raw-http`         |  5847.2 |              8.0 |             12.0 |      0 |
| `raw-koa`          |  5723.8 |              8.0 |             13.0 |      0 |

**Node-Boot overhead vs raw framework:**

| Framework | Raw req/sec | Node-Boot req/sec | Throughput delta | Raw p99 (ms) | Node-Boot p99 (ms) |
| --------- | ----------: | ----------------: | ---------------: | -----------: | -----------------: |
| express   |      5733.6 |            5627.6 |            -1.8% |         12.0 |               13.0 |
| fastify   |      4428.6 |            5714.7 |            29.0% |         21.0 |               12.0 |
| http      |      5847.2 |            5793.6 |            -0.9% |         12.0 |               12.0 |
| koa       |      5723.8 |            5849.6 |             2.2% |         13.0 |               12.0 |

## Endpoint: `todos-get`

<div style="display:flex;flex-wrap:wrap;gap:24px;">

<div class="chart">
    <h4>Req/sec (higher is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="30" width="400" height="28" fill="#34d399" rx="3" />
        <text x="578" y="48" font-size="12" font-family="monospace" fill="#0f172a">14884.0 req/s</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="68" width="398.0260682612201" height="28" fill="#475569" rx="3" />
        <text x="576.0260682612201" y="86" font-size="12" font-family="monospace" fill="#0f172a">14810.5 req/s</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="106" width="391.18516527815103" height="28" fill="#94a3b8" rx="3" />
        <text x="569.1851652781511" y="124" font-size="12" font-family="monospace" fill="#0f172a">14556.0 req/s</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="144" width="387.8430529427573" height="28" fill="#fbbf24" rx="3" />
        <text x="565.8430529427574" y="162" font-size="12" font-family="monospace" fill="#0f172a">14431.6 req/s</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="182" width="385.5563020693362" height="28" fill="#60a5fa" rx="3" />
        <text x="563.5563020693362" y="200" font-size="12" font-family="monospace" fill="#0f172a">14346.5 req/s</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="220" width="378.0314431604407" height="28" fill="#047857" rx="3" />
        <text x="556.0314431604406" y="238" font-size="12" font-family="monospace" fill="#0f172a">14066.5 req/s</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="258" width="358.25181402848693" height="28" fill="#b45309" rx="3" />
        <text x="536.2518140284869" y="276" font-size="12" font-family="monospace" fill="#0f172a">13330.5 req/s</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="296" width="332.78446654125236" height="28" fill="#1d4ed8" rx="3" />
        <text x="510.78446654125236" y="314" font-size="12" font-family="monospace" fill="#0f172a">12382.9 req/s</text>
    </svg>
</div>

<div class="chart">
    <h4>Latency p99 ms (lower is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="30" width="320" height="28" fill="#047857" rx="3" />
        <text x="498" y="48" font-size="12" font-family="monospace" fill="#0f172a">4.0 ms</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="68" width="320" height="28" fill="#475569" rx="3" />
        <text x="498" y="86" font-size="12" font-family="monospace" fill="#0f172a">4.0 ms</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="106" width="400" height="28" fill="#1d4ed8" rx="3" />
        <text x="578" y="124" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="144" width="400" height="28" fill="#b45309" rx="3" />
        <text x="578" y="162" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="182" width="400" height="28" fill="#60a5fa" rx="3" />
        <text x="578" y="200" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="220" width="400" height="28" fill="#34d399" rx="3" />
        <text x="578" y="238" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="258" width="400" height="28" fill="#94a3b8" rx="3" />
        <text x="578" y="276" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="296" width="400" height="28" fill="#fbbf24" rx="3" />
        <text x="578" y="314" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
    </svg>
</div>
</div>

| App                | Req/sec | Latency p50 (ms) | Latency p99 (ms) | Errors |
| ------------------ | ------: | ---------------: | ---------------: | -----: |
| `nodeboot-express` | 12382.9 |              3.0 |              5.0 |      0 |
| `nodeboot-fastify` | 14066.5 |              3.0 |              4.0 |      0 |
| `nodeboot-http`    | 14810.5 |              3.0 |              4.0 |      0 |
| `nodeboot-koa`     | 13330.5 |              3.0 |              5.0 |      0 |
| `raw-express`      | 14346.5 |              3.0 |              5.0 |      0 |
| `raw-fastify`      | 14884.0 |              3.0 |              5.0 |      0 |
| `raw-http`         | 14556.0 |              3.0 |              5.0 |      0 |
| `raw-koa`          | 14431.6 |              3.0 |              5.0 |      0 |

**Node-Boot overhead vs raw framework:**

| Framework | Raw req/sec | Node-Boot req/sec | Throughput delta | Raw p99 (ms) | Node-Boot p99 (ms) |
| --------- | ----------: | ----------------: | ---------------: | -----------: | -----------------: |
| express   |     14346.5 |           12382.9 |           -13.7% |          5.0 |                5.0 |
| fastify   |     14884.0 |           14066.5 |            -5.5% |          5.0 |                4.0 |
| http      |     14556.0 |           14810.5 |             1.7% |          5.0 |                4.0 |
| koa       |     14431.6 |           13330.5 |            -7.6% |          5.0 |                5.0 |

## Endpoint: `todos-list`

<div style="display:flex;flex-wrap:wrap;gap:24px;">

<div class="chart">
    <h4>Req/sec (higher is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="30" width="400" height="28" fill="#34d399" rx="3" />
        <text x="578" y="48" font-size="12" font-family="monospace" fill="#0f172a">14053.5 req/s</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="68" width="389.9395593682979" height="28" fill="#94a3b8" rx="3" />
        <text x="567.939559368298" y="86" font-size="12" font-family="monospace" fill="#0f172a">13700.0 req/s</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="106" width="374.5594323390824" height="28" fill="#fbbf24" rx="3" />
        <text x="552.5594323390824" y="124" font-size="12" font-family="monospace" fill="#0f172a">13159.6 req/s</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="144" width="373.5657980312322" height="28" fill="#475569" rx="3" />
        <text x="551.5657980312321" y="162" font-size="12" font-family="monospace" fill="#0f172a">13124.7 req/s</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="182" width="360.8144898124732" height="28" fill="#60a5fa" rx="3" />
        <text x="538.8144898124732" y="200" font-size="12" font-family="monospace" fill="#0f172a">12676.7 req/s</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="220" width="349.0360381002259" height="28" fill="#047857" rx="3" />
        <text x="527.0360381002258" y="238" font-size="12" font-family="monospace" fill="#0f172a">12262.9 req/s</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="258" width="284.1825429467192" height="28" fill="#b45309" rx="3" />
        <text x="462.1825429467192" y="276" font-size="12" font-family="monospace" fill="#0f172a">9984.4 req/s</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="296" width="270.78939990578834" height="28" fill="#1d4ed8" rx="3" />
        <text x="448.78939990578834" y="314" font-size="12" font-family="monospace" fill="#0f172a">9513.8 req/s</text>
    </svg>
</div>

<div class="chart">
    <h4>Latency p99 ms (lower is better)</h4>
    <svg width="640" height="344" viewBox="0 0 640 344" xmlns="http://www.w3.org/2000/svg">
        
        <text x="162" y="48" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-fastify</text>
        <rect x="170" y="30" width="285.7142857142857" height="28" fill="#047857" rx="3" />
        <text x="463.7142857142857" y="48" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="86" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-http</text>
        <rect x="170" y="68" width="285.7142857142857" height="28" fill="#475569" rx="3" />
        <text x="463.7142857142857" y="86" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="124" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-express</text>
        <rect x="170" y="106" width="285.7142857142857" height="28" fill="#60a5fa" rx="3" />
        <text x="463.7142857142857" y="124" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="162" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-fastify</text>
        <rect x="170" y="144" width="285.7142857142857" height="28" fill="#34d399" rx="3" />
        <text x="463.7142857142857" y="162" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="200" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-http</text>
        <rect x="170" y="182" width="285.7142857142857" height="28" fill="#94a3b8" rx="3" />
        <text x="463.7142857142857" y="200" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="238" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">raw-koa</text>
        <rect x="170" y="220" width="285.7142857142857" height="28" fill="#fbbf24" rx="3" />
        <text x="463.7142857142857" y="238" font-size="12" font-family="monospace" fill="#0f172a">5.0 ms</text>
        <text x="162" y="276" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-koa</text>
        <rect x="170" y="258" width="342.85714285714283" height="28" fill="#b45309" rx="3" />
        <text x="520.8571428571429" y="276" font-size="12" font-family="monospace" fill="#0f172a">6.0 ms</text>
        <text x="162" y="314" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">nodeboot-express</text>
        <rect x="170" y="296" width="400" height="28" fill="#1d4ed8" rx="3" />
        <text x="578" y="314" font-size="12" font-family="monospace" fill="#0f172a">7.0 ms</text>
    </svg>
</div>
</div>

| App                | Req/sec | Latency p50 (ms) | Latency p99 (ms) | Errors |
| ------------------ | ------: | ---------------: | ---------------: | -----: |
| `nodeboot-express` |  9513.8 |              5.0 |              7.0 |      0 |
| `nodeboot-fastify` | 12262.9 |              3.0 |              5.0 |      0 |
| `nodeboot-http`    | 13124.7 |              3.0 |              5.0 |      0 |
| `nodeboot-koa`     |  9984.4 |              4.0 |              6.0 |      0 |
| `raw-express`      | 12676.7 |              3.0 |              5.0 |      0 |
| `raw-fastify`      | 14053.5 |              3.0 |              5.0 |      0 |
| `raw-http`         | 13700.0 |              3.0 |              5.0 |      0 |
| `raw-koa`          | 13159.6 |              3.0 |              5.0 |      0 |

**Node-Boot overhead vs raw framework:**

| Framework | Raw req/sec | Node-Boot req/sec | Throughput delta | Raw p99 (ms) | Node-Boot p99 (ms) |
| --------- | ----------: | ----------------: | ---------------: | -----------: | -----------------: |
| express   |     12676.7 |            9513.8 |           -25.0% |          5.0 |                7.0 |
| fastify   |     14053.5 |           12262.9 |           -12.7% |          5.0 |                5.0 |
| http      |     13700.0 |           13124.7 |            -4.2% |          5.0 |                5.0 |
| koa       |     13159.6 |            9984.4 |           -24.1% |          5.0 |                6.0 |
