#!/usr/bin/env node
// Reads every results/*.json produced by tools/runner/bench.mjs and writes:
//   - results/REPORT.md   a comparison table per endpoint (req/sec, latency p50/p99) plus a
//                         raw-vs-nodeboot overhead delta for each matching framework pair
//   - results/REPORT.html the same data as a self-contained HTML page with inline SVG bar
//                         charts (no CDN/external JS needed, so it renders fully offline)
//   - results/README.md   a GitHub-renderable wrapper around REPORT.html's content (the same
//                         markdown tables as REPORT.md, plus the bar charts as linked images —
//                         GitHub strips inline <svg>/<style> from README content, so each chart is
//                         also written as its own file under results/charts/*.svg and referenced
//                         via a plain markdown image instead of embedded inline)
// Every run is also archived under results/history/<nodeboot-version>__<timestamp>/ (raw JSON +
// both reports) so past runs can be diffed/compared as the @nodeboot/* packages evolve, and
// results/history/index.md is updated with a row linking to that run.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BENCH_ROOT = path.join(__dirname, "..", "..");
const RESULTS_DIR = path.join(BENCH_ROOT, "results");
const HISTORY_DIR = path.join(RESULTS_DIR, "history");
const HISTORY_INDEX_FILE = path.join(HISTORY_DIR, "index.md");
const REPORT_FILE = path.join(RESULTS_DIR, "REPORT.md");
const HTML_REPORT_FILE = path.join(RESULTS_DIR, "REPORT.html");
const README_FILE = path.join(RESULTS_DIR, "README.md");
const CHARTS_DIR = path.join(RESULTS_DIR, "charts");

const APP_COLORS = {
    "raw-http": "#94a3b8",
    "raw-express": "#60a5fa",
    "raw-fastify": "#34d399",
    "raw-koa": "#fbbf24",
    "nodeboot-http": "#475569",
    "nodeboot-express": "#1d4ed8",
    "nodeboot-fastify": "#047857",
    "nodeboot-koa": "#b45309",
};

// Resolves the actual installed @nodeboot/core version (not just the semver range declared in
// package.json) by resolving it the same way Node would from one of the nodeboot-* apps.
function resolveNodeBootVersion() {
    try {
        const appPkg = path.join(BENCH_ROOT, "apps", "nodeboot-express", "package.json");
        const req = createRequire(appPkg);
        const corePkg = req("@nodeboot/core/package.json");
        return corePkg.version;
    } catch {
        return "unknown";
    }
}

function timestampSlug(date) {
    return date.toISOString().replace(/[:.]/g, "-").replace("T", "_").replace("Z", "");
}

function escapeHtml(str) {
    return String(str).replace(
        /[&<>"']/g,
        c => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"}[c]),
    );
}

// GitHub sanitizes markdown/README HTML and strips raw <svg>/<style> tags entirely (they render
// fine in more permissive viewers like IntelliJ's markdown preview, but not on github.com) — so
// charts embedded in results/README.md can't be inline <svg>. Instead each chart is written out
// as its own standalone .svg *file* under results/charts/ and referenced from the README via a
// plain markdown image (`![]()`), which GitHub renders as a normal image/asset instead of raw
// inline markup.
function renderBars({rows, unit, width, leftLabelWidth, chartWidth, barHeight, gap, top}) {
    const maxValue = Math.max(...rows.map(r => r.value), 1);
    return rows
        .map((r, i) => {
            const y = top + i * (barHeight + gap);
            const barWidth = Math.max((r.value / maxValue) * chartWidth, 1);
            const color = APP_COLORS[r.app] ?? "#94a3b8";
            return `
        <text x="${leftLabelWidth - 8}" y="${
                y + barHeight / 2 + 4
            }" text-anchor="end" font-size="12" font-family="monospace" fill="#334155">${escapeHtml(r.app)}</text>
        <rect x="${leftLabelWidth}" y="${y}" width="${barWidth}" height="${barHeight}" fill="${color}" rx="3" />
        <text x="${leftLabelWidth + barWidth + 8}" y="${
                y + barHeight / 2 + 4
            }" font-size="12" font-family="monospace" fill="#0f172a">${r.value.toFixed(1)}${unit}</text>`;
        })
        .join("");
}

// Renders a simple horizontal SVG bar chart: one bar per row, proportional to `value`, with a
// numeric label at the end of each bar. No external chart library required.
function svgBarChart({rows, title, unit, width = 640, barHeight = 28, gap = 10}) {
    const leftLabelWidth = 170;
    const chartWidth = width - leftLabelWidth - 70;
    const height = rows.length * (barHeight + gap) + 40;
    const bars = renderBars({rows, unit, width, leftLabelWidth, chartWidth, barHeight, gap, top: 30});

    return `
<div class="chart">
    <h4>${escapeHtml(title)}</h4>
    <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        ${bars}
    </svg>
</div>`;
}

// Renders a fully standalone/self-contained SVG document (white background, title baked in as
// an SVG <text> element) suitable for writing to its own .svg file and referencing via a plain
// markdown image, e.g. `![Req/sec](./charts/hello-reqsec.svg)` — the only way to get these charts
// to render on github.com, since GitHub strips inline <svg>/<style> tags from README content.
function standaloneSvgChart({rows, title, unit, width = 640, barHeight = 28, gap = 10}) {
    const leftLabelWidth = 170;
    const chartWidth = width - leftLabelWidth - 70;
    const top = 56;
    const height = rows.length * (barHeight + gap) + top + 16;
    const bars = renderBars({rows, unit, width, leftLabelWidth, chartWidth, barHeight, gap, top});

    return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
    <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
    <text x="20" y="28" font-size="14" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="600" fill="#0f172a">${escapeHtml(
        title,
    )}</text>
    ${bars}
</svg>`;
}

function loadResults() {
    if (!fs.existsSync(RESULTS_DIR)) return [];
    return fs
        .readdirSync(RESULTS_DIR)
        .filter(f => f.endsWith(".json"))
        .map(f => JSON.parse(fs.readFileSync(path.join(RESULTS_DIR, f), "utf-8")));
}

function pairKey(app) {
    return app.replace(/^raw-/, "").replace(/^nodeboot-/, "");
}

function fmt(n, digits = 1) {
    return typeof n === "number" ? n.toFixed(digits) : "n/a";
}

// Human-readable description of what each benchmarked endpoint actually does, matching the
// routes table in README.md. Used to build the "Endpoints under test" section so the report is
// self-contained (readers don't need to cross-reference the README to know what was measured).
const ENDPOINT_DESCRIPTIONS = {
    hello: "No DB access — pure framework/routing overhead",
    "todos-list": "List (SELECT ... LIMIT 20, ORDER BY id DESC) from a 1,000-row `todo` table",
    "todos-get": "Single-row SELECT by primary key",
    "todos-create": "Single-row INSERT",
};

function pathOnly(url) {
    try {
        return new URL(url).pathname;
    } catch {
        return url;
    }
}

// Builds a data-driven "Benchmark setup" section: the load-test parameters (connections,
// duration, method, body) actually used for each endpoint, plus a description of the service
// under test (routes exposed, persistence backend), so the report is self-contained and doesn't
// require reading README.md/REMEDIATIONS.md to understand what was measured.
function buildSetupSection(results, endpoints) {
    const byEndpoint = new Map();
    for (const endpoint of endpoints) {
        const sample = results.find(r => r.endpoint === endpoint);
        if (sample) byEndpoint.set(endpoint, sample);
    }

    const connectionsSet = new Set(results.map(r => r.connections));
    const durationSet = new Set(results.map(r => r.duration));
    const uniformLoad = connectionsSet.size === 1 && durationSet.size === 1;

    return {byEndpoint, uniformLoad, connectionsSet, durationSet};
}

// Endpoints ordered from "no I/O" to "heaviest I/O" — used to check whether Node-Boot's relative
// overhead shrinks as real work (DB I/O) starts to dominate total request time, which is the
// expected pattern for a thin routing/DI layer. If overhead instead grows with I/O, that points to
// per-request cost inside the persistence/transaction path, not just routing, and is flagged.
const IO_INTENSITY_ORDER = ["hello", "todos-get", "todos-list", "todos-create"];

function computeOverhead(rows) {
    const byFramework = new Map();
    for (const r of rows) {
        const key = pairKey(r.app);
        const bucket = byFramework.get(key) ?? {};
        if (r.app.startsWith("raw-")) bucket.raw = r;
        if (r.app.startsWith("nodeboot-")) bucket.nodeboot = r;
        byFramework.set(key, bucket);
    }
    const overhead = new Map();
    for (const [framework, {raw, nodeboot}] of byFramework) {
        if (!raw || !nodeboot) continue;
        overhead.set(framework, {
            throughputDeltaPct: ((nodeboot.requestsPerSec - raw.requestsPerSec) / raw.requestsPerSec) * 100,
            latencyDeltaMs: (nodeboot.latencyMs?.p99 ?? 0) - (raw.latencyMs?.p99 ?? 0),
            raw,
            nodeboot,
        });
    }
    return overhead;
}

// Builds a data-driven technical summary: computed straight from the benchmark results, not a
// canned narrative, so it stays accurate as numbers change between runs/versions.
function buildTechnicalSummary(results, endpoints) {
    const totalErrors = results.reduce((sum, r) => sum + (r.errors ?? 0) + (r.timeouts ?? 0) + (r.non2xx ?? 0), 0);

    const overheadByEndpoint = new Map();
    for (const endpoint of endpoints) {
        const rows = results.filter(r => r.endpoint === endpoint);
        overheadByEndpoint.set(endpoint, computeOverhead(rows));
    }

    const orderedEndpoints = IO_INTENSITY_ORDER.filter(e => endpoints.includes(e));
    const frameworks = [...new Set(results.map(r => pairKey(r.app)))].sort();

    const findings = [];

    // 1. Errors / failed requests anywhere in the run.
    if (totalErrors > 0) {
        findings.push({
            level: "concerning",
            text: `${totalErrors} error/timeout/non-2xx responses were recorded across the run. A healthy run should have zero — investigate before trusting the throughput numbers.`,
        });
    } else {
        findings.push({
            level: "expected",
            text: "Zero errors, timeouts, or non-2xx responses across all 8 apps and all 4 endpoints — every app handled the full load cleanly.",
        });
    }

    // 2. Per-framework: does overhead shrink as I/O intensity grows (expected) or grow (concerning)?
    for (const framework of frameworks) {
        if (orderedEndpoints.length < 2) continue;
        const first = overheadByEndpoint.get(orderedEndpoints[0])?.get(framework);
        const last = overheadByEndpoint.get(orderedEndpoints[orderedEndpoints.length - 1])?.get(framework);
        if (!first || !last) continue;

        const shrank = last.throughputDeltaPct > first.throughputDeltaPct; // deltas are negative; "less negative" = shrank
        const magnitudeChange = Math.abs(last.throughputDeltaPct) - Math.abs(first.throughputDeltaPct);

        if (shrank) {
            findings.push({
                level: "expected",
                text: `**${framework}**: Node-Boot's throughput overhead shrinks from ${fmt(
                    first.throughputDeltaPct,
                )}% on \`${orderedEndpoints[0]}\` (routing/DI only) to ${fmt(last.throughputDeltaPct)}% on \`${
                    orderedEndpoints[orderedEndpoints.length - 1]
                }\` (DB write). This is the expected pattern: Node-Boot's fixed per-request cost (decorators, DI resolution, interceptor pipeline) becomes proportionally smaller once real I/O (TypeORM + PostgreSQL) dominates total request time.`,
            });
        } else {
            findings.push({
                level: "concerning",
                text: `**${framework}**: Node-Boot's throughput overhead *grows* from ${fmt(
                    first.throughputDeltaPct,
                )}% on \`${orderedEndpoints[0]}\` to ${fmt(last.throughputDeltaPct)}% on \`${
                    orderedEndpoints[orderedEndpoints.length - 1]
                }\` (+${fmt(
                    Math.abs(magnitudeChange),
                )}pp worse relative to raw). This suggests Node-Boot is adding per-request cost inside the persistence/transaction path itself (e.g. @Transactional() wrapping, repository proxying), not just routing — worth profiling.`,
            });
        }
    }

    // 3. Latency overhead *relative* to the endpoint's own baseline (raw p99): does it shrink as
    //    absolute latency grows with I/O (expected — same fixed-cost logic as throughput), or does
    //    Node-Boot add a growing *percentage* of latency even on slower, I/O-bound endpoints
    //    (concerning — would suggest per-request cost scaling with work done, e.g. inside a
    //    transaction wrapper, rather than a one-time routing/DI tax)?
    for (const framework of frameworks) {
        if (orderedEndpoints.length < 2) continue;
        const first = overheadByEndpoint.get(orderedEndpoints[0])?.get(framework);
        const last = overheadByEndpoint.get(orderedEndpoints[orderedEndpoints.length - 1])?.get(framework);
        if (!first || !last) continue;

        const firstRawP99 = first.raw.latencyMs?.p99 ?? 0;
        const lastRawP99 = last.raw.latencyMs?.p99 ?? 0;
        if (firstRawP99 <= 0 || lastRawP99 <= 0) continue;

        const firstRelPct = (first.latencyDeltaMs / firstRawP99) * 100;
        const lastRelPct = (last.latencyDeltaMs / lastRawP99) * 100;

        if (lastRelPct > firstRelPct + 5) {
            findings.push({
                level: "concerning",
                text: `**${framework}**: relative p99 latency overhead grows from +${fmt(firstRelPct)}% on \`${
                    orderedEndpoints[0]
                }\` to +${fmt(lastRelPct)}% on \`${
                    orderedEndpoints[orderedEndpoints.length - 1]
                }\` — a fixed routing/DI tax should shrink as a percentage once absolute latency grows with I/O, the same way the throughput overhead does. Growing relative overhead here suggests per-request cost scaling with work done (e.g. inside the transaction/repository path), not a one-time framework tax.`,
            });
        } else {
            findings.push({
                level: "expected",
                text: `**${framework}**: relative p99 latency overhead shrinks (or stays flat) from +${fmt(
                    firstRelPct,
                )}% on \`${orderedEndpoints[0]}\` to +${fmt(lastRelPct)}% on \`${
                    orderedEndpoints[orderedEndpoints.length - 1]
                }\`, mirroring the throughput trend — consistent with a fixed per-request routing/DI cost rather than one that scales with I/O work.`,
            });
        }
    }

    // 4. Cross-framework comparison: which adapter has the smallest/largest average overhead.
    const avgOverheadByFramework = frameworks
        .map(framework => {
            const deltas = orderedEndpoints
                .map(e => overheadByEndpoint.get(e)?.get(framework)?.throughputDeltaPct)
                .filter(v => typeof v === "number");
            const avg = deltas.reduce((s, v) => s + v, 0) / (deltas.length || 1);
            return {framework, avg};
        })
        .sort((a, b) => b.avg - a.avg);

    if (avgOverheadByFramework.length > 1) {
        const best = avgOverheadByFramework[0];
        const worst = avgOverheadByFramework[avgOverheadByFramework.length - 1];
        findings.push({
            level: "expected",
            text: `Averaged across all endpoints, **${best.framework}** has the smallest Node-Boot overhead (${fmt(
                best.avg,
            )}%) and **${worst.framework}** the largest (${fmt(
                worst.avg,
            )}%). Adapters with fewer built-in middleware layers (native \`http\`) or a leaner request lifecycle typically show less relative overhead than adapters with more middleware indirection (Express) — a ranking that flips between versions is worth investigating, a stable ranking is expected.`,
        });
    }

    // 5. Absolute overhead magnitude sanity check (>50% avg overhead on any framework is unusual
    //    for a routing/DI layer and would suggest something more structural, e.g. an accidentally
    //    synchronous/blocking call in the framework adapter or lifecycle hooks).
    const extremeOverhead = avgOverheadByFramework.filter(f => f.avg < -50);
    if (extremeOverhead.length > 0) {
        findings.push({
            level: "concerning",
            text: `${extremeOverhead
                .map(f => f.framework)
                .join(
                    ", ",
                )} show(s) >50% average throughput overhead vs. raw — unusually high for a routing/DI layer over the same ORM calls. Worth checking for accidental synchronous work in the request lifecycle (e.g. logging, interceptors, or config lookups per-request instead of once at boot).`,
        });
    } else {
        findings.push({
            level: "expected",
            text: `All frameworks stay under 50% average overhead, consistent with Node-Boot adding a routing/DI/decorator layer on top of the same underlying HTTP server and ORM, rather than duplicating work.`,
        });
    }

    // 6. Sample-size / statistical-noise caveat: a single autocannon run on a shared dev machine
    //    can be noisy, especially for low-throughput endpoints (writes) where fewer total requests
    //    are sent during the run. Flag any endpoint where the sample size is small enough that a
    //    "concerning" trend above might just be run-to-run variance rather than a real regression.
    const lowSampleEndpoints = [];
    for (const endpoint of endpoints) {
        const rows = results.filter(r => r.endpoint === endpoint);
        const minTotalRequests = Math.min(...rows.map(r => (r.requestsPerSec ?? 0) * (r.duration ?? 0)));
        if (minTotalRequests > 0 && minTotalRequests < 2000) {
            lowSampleEndpoints.push({endpoint, minTotalRequests});
        }
    }
    if (lowSampleEndpoints.length > 0) {
        findings.push({
            level: "info",
            text: `Low sample size on ${lowSampleEndpoints
                .map(e => `\`${e.endpoint}\` (~${Math.round(e.minTotalRequests)} requests)`)
                .join(
                    ", ",
                )} — single-run autocannon results on a shared dev machine can vary run-to-run for lower-throughput endpoints. Treat any single "concerning" trend on these endpoints as a hypothesis to re-check with a longer duration/multiple runs before acting on it, not a confirmed regression.`,
        });
    }
    findings.push({
        level: "info",
        text: "This report reflects a single benchmark run on a shared development machine, not a dedicated/isolated benchmarking host. Absolute req/sec numbers will vary between machines; focus on the *relative* raw-vs-nodeboot deltas and their trend across endpoints, and re-run multiple times before treating any single data point as conclusive.",
    });

    return findings;
}

function main() {
    const results = loadResults();
    if (results.length === 0) {
        console.error(`No result files found in ${RESULTS_DIR}. Run scripts/run-all.sh first.`);
        process.exit(1);
    }

    const nodeBootVersion = resolveNodeBootVersion();
    const generatedAt = new Date();

    const endpoints = [...new Set(results.map(r => r.endpoint))].sort();
    const lines = [];
    const htmlSections = [];
    const readmeLines = [];

    fs.mkdirSync(CHARTS_DIR, {recursive: true});
    // Writes a chart to results/charts/<name>.svg and returns the markdown image snippet that
    // references it (relative to results/README.md).
    function writeChartFile(name, chart) {
        fs.writeFileSync(path.join(CHARTS_DIR, `${name}.svg`), standaloneSvgChart(chart));
        return `![${chart.title}](./charts/${name}.svg)`;
    }

    lines.push("# Node-Boot Benchmarking Report");
    lines.push("");
    lines.push(`Generated: ${generatedAt.toISOString()}`);
    lines.push(`Node-Boot version: \`${nodeBootVersion}\``);
    lines.push("");

    const introStart = lines.length;

    const orderedEndpoints = IO_INTENSITY_ORDER.filter(e => endpoints.includes(e)).concat(
        endpoints.filter(e => !IO_INTENSITY_ORDER.includes(e)),
    );
    const {byEndpoint, uniformLoad, connectionsSet, durationSet} = buildSetupSection(results, orderedEndpoints);

    lines.push("## Benchmark setup");
    lines.push("");
    lines.push(
        "Service under test: a minimal REST API (native `http`/Express/Fastify/Koa, both a raw " +
            "framework baseline and the equivalent Node-Boot app) exposing the " +
            `${orderedEndpoints.length} endpoints below, backed by a real **PostgreSQL** database ` +
            "via TypeORM (one dedicated database per app, seeded with 1,000 rows before each run " +
            "— see `docker-compose.yaml` and `scripts/run-all.sh`).",
    );
    lines.push("");
    lines.push("**Endpoints under test:**");
    lines.push("");
    lines.push("| Endpoint | Method | Path | Behaviour |");
    lines.push("| --- | --- | --- | --- |");
    for (const endpoint of orderedEndpoints) {
        const sample = byEndpoint.get(endpoint);
        if (!sample) continue;
        lines.push(
            `| \`${endpoint}\` | ${sample.method ?? "GET"} | \`${pathOnly(sample.url)}\` | ${
                ENDPOINT_DESCRIPTIONS[endpoint] ?? "n/a"
            } |`,
        );
    }
    lines.push("");
    lines.push("**Load test parameters** (via [autocannon](https://github.com/mcollina/autocannon)):");
    lines.push("");
    if (uniformLoad) {
        lines.push(
            `- **${[...connectionsSet][0]} concurrent connections**, **${
                [...durationSet][0]
            }s duration**, applied identically to every app/endpoint combination.`,
        );
    } else {
        lines.push("| Endpoint | Connections | Duration (s) |");
        lines.push("| --- | ---: | ---: |");
        for (const endpoint of orderedEndpoints) {
            const sample = byEndpoint.get(endpoint);
            if (!sample) continue;
            lines.push(`| \`${endpoint}\` | ${sample.connections} | ${sample.duration} |`);
        }
    }
    const createSample = byEndpoint.get("todos-create");
    if (createSample?.body) {
        lines.push(`- \`todos-create\` request body: \`${createSample.body}\``);
    }
    lines.push(
        "- Each app is benchmarked **one at a time** (never concurrently with another app) so " +
            "results aren't skewed by CPU/port contention between apps.",
    );
    lines.push("");

    const findings = buildTechnicalSummary(results, endpoints);

    lines.push("## Technical summary");
    lines.push("");
    lines.push(
        "Analysis computed directly from this run's data (not a fixed narrative) — each point is " +
            "labeled ✅ Expected or ⚠️ Concerning based on whether it matches the pattern you'd expect " +
            "from a routing/DI layer sitting on top of the same HTTP server and ORM calls.",
    );
    lines.push("");
    for (const f of findings) {
        const badge =
            f.level === "concerning" ? "⚠️ **Concerning**" : f.level === "info" ? "ℹ️ **Note**" : "✅ **Expected**";
        lines.push(`- ${badge}: ${f.text}`);
    }
    lines.push("");

    const htmlSetup = `
<h2>Benchmark setup</h2>
<p class="meta">Service under test: a minimal REST API (native <code>http</code>/Express/Fastify/Koa, both a raw framework baseline and the equivalent Node-Boot app) exposing the ${
        orderedEndpoints.length
    } endpoints below, backed by a real <strong>PostgreSQL</strong> database via TypeORM (one dedicated database per app, seeded with 1,000 rows before each run — see <code>docker-compose.yaml</code> and <code>scripts/run-all.sh</code>).</p>
<table>
    <thead><tr><th>Endpoint</th><th>Method</th><th>Path</th><th>Behaviour</th></tr></thead>
    <tbody>
    ${orderedEndpoints
        .map(endpoint => byEndpoint.get(endpoint))
        .filter(Boolean)
        .map(
            sample =>
                `<tr><td><code>${escapeHtml(sample.endpoint)}</code></td><td>${escapeHtml(
                    sample.method ?? "GET",
                )}</td><td><code>${escapeHtml(pathOnly(sample.url))}</code></td><td>${
                    ENDPOINT_DESCRIPTIONS[sample.endpoint] ?? "n/a"
                }</td></tr>`,
        )
        .join("")}
    </tbody>
</table>
<p class="meta"><strong>Load test parameters</strong> (via <a href="https://github.com/mcollina/autocannon">autocannon</a>): ${
        uniformLoad
            ? `${[...connectionsSet][0]} concurrent connections, ${
                  [...durationSet][0]
              }s duration, applied identically to every app/endpoint combination.`
            : "varies per endpoint, see REPORT.md."
    }${
        createSample?.body
            ? ` <code>todos-create</code> request body: <code>${escapeHtml(createSample.body)}</code>.`
            : ""
    } Each app is benchmarked one at a time (never concurrently with another app).</p>`;
    htmlSections.push(htmlSetup);

    const htmlFindings = `
<h2>Technical summary</h2>
<p class="meta">Analysis computed directly from this run's data (not a fixed narrative) — each point is labeled Expected or Concerning based on whether it matches the pattern you'd expect from a routing/DI layer sitting on top of the same HTTP server and ORM calls.</p>
<ul class="findings">
${findings
    .map(
        f =>
            `<li class="${f.level}"><span class="badge ${f.level}">${
                f.level === "concerning" ? "⚠️ Concerning" : f.level === "info" ? "ℹ️ Note" : "✅ Expected"
            }</span> ${escapeHtml(f.text)
                .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
                .replace(/`(.+?)`/g, "<code>$1</code>")}</li>`,
    )
    .join("\n")}
</ul>`;
    htmlSections.push(htmlFindings);

    // Overall summary chart: total req/sec across all endpoints, per app — the fastest
    // "at a glance" comparison across all 8 apps.
    const totalsByApp = new Map();
    for (const r of results) {
        totalsByApp.set(r.app, (totalsByApp.get(r.app) ?? 0) + (r.requestsPerSec ?? 0));
    }
    const summaryRows = [...totalsByApp.entries()]
        .map(([app, value]) => ({app, value}))
        .sort((a, b) => b.value - a.value);
    htmlSections.push(
        svgBarChart({
            rows: summaryRows,
            title: "Total req/sec across all endpoints (higher is better)",
            unit: " req/s",
        }),
    );

    readmeLines.push("# Node-Boot Benchmarking Report");
    readmeLines.push("");
    readmeLines.push(
        "> Chart-enabled version of [REPORT.html](./REPORT.html) for the GitHub UI. See " +
            "[REPORT.md](./REPORT.md) for a plain-text/table-only version.",
    );
    readmeLines.push("");
    readmeLines.push(`Generated: ${generatedAt.toISOString()}`);
    readmeLines.push(`Node-Boot version: \`${nodeBootVersion}\``);
    readmeLines.push("");
    readmeLines.push(...lines.slice(introStart));
    readmeLines.push("## Overall summary");
    readmeLines.push("");
    readmeLines.push(
        writeChartFile("summary-total-reqsec", {
            rows: summaryRows,
            title: "Total req/sec across all endpoints (higher is better)",
            unit: " req/s",
        }),
    );
    readmeLines.push("");

    for (const endpoint of endpoints) {
        lines.push(`## Endpoint: \`${endpoint}\``);
        lines.push("");

        const endpointStart = lines.length;

        lines.push("| App | Req/sec | Latency p50 (ms) | Latency p99 (ms) | Errors |");
        lines.push("| --- | ---: | ---: | ---: | ---: |");

        const rows = results.filter(r => r.endpoint === endpoint).sort((a, b) => a.app.localeCompare(b.app));
        for (const r of rows) {
            lines.push(
                `| \`${r.app}\` | ${fmt(r.requestsPerSec)} | ${fmt(r.latencyMs?.p50)} | ${fmt(r.latencyMs?.p99)} | ${
                    r.errors ?? 0
                } |`,
            );
        }
        lines.push("");

        // Raw vs Node-Boot overhead, per matching framework (express, fastify, koa, http).
        const byFramework = new Map();
        for (const r of rows) {
            const key = pairKey(r.app);
            const bucket = byFramework.get(key) ?? {};
            if (r.app.startsWith("raw-")) bucket.raw = r;
            if (r.app.startsWith("nodeboot-")) bucket.nodeboot = r;
            byFramework.set(key, bucket);
        }

        const overheadRows = [...byFramework.entries()].filter(([, v]) => v.raw && v.nodeboot);
        if (overheadRows.length > 0) {
            lines.push("**Node-Boot overhead vs raw framework:**");
            lines.push("");
            lines.push(
                "| Framework | Raw req/sec | Node-Boot req/sec | Throughput delta | Raw p99 (ms) | Node-Boot p99 (ms) |",
            );
            lines.push("| --- | ---: | ---: | ---: | ---: | ---: |");
            for (const [framework, {raw, nodeboot}] of overheadRows) {
                const delta = ((nodeboot.requestsPerSec - raw.requestsPerSec) / raw.requestsPerSec) * 100;
                lines.push(
                    `| ${framework} | ${fmt(raw.requestsPerSec)} | ${fmt(nodeboot.requestsPerSec)} | ${fmt(
                        delta,
                    )}% | ${fmt(raw.latencyMs?.p99)} | ${fmt(nodeboot.latencyMs?.p99)} |`,
                );
            }
            lines.push("");
        }

        const throughputRows = rows
            .map(r => ({app: r.app, value: r.requestsPerSec ?? 0}))
            .sort((a, b) => b.value - a.value);
        const latencyRows = rows
            .map(r => ({app: r.app, value: r.latencyMs?.p99 ?? 0}))
            .sort((a, b) => a.value - b.value);

        htmlSections.push(`<h2>Endpoint: <code>${escapeHtml(endpoint)}</code></h2>`);
        htmlSections.push(`<div class="chart-row">`);
        htmlSections.push(svgBarChart({rows: throughputRows, title: "Req/sec (higher is better)", unit: " req/s"}));
        htmlSections.push(svgBarChart({rows: latencyRows, title: "Latency p99 ms (lower is better)", unit: " ms"}));
        htmlSections.push(`</div>`);

        if (overheadRows.length > 0) {
            htmlSections.push(`<h3>Node-Boot overhead vs raw framework</h3>`);
            htmlSections.push(`<table>
                <thead><tr><th>Framework</th><th>Raw req/sec</th><th>Node-Boot req/sec</th><th>Throughput delta</th><th>Raw p99 (ms)</th><th>Node-Boot p99 (ms)</th></tr></thead>
                <tbody>
                ${overheadRows
                    .map(([framework, {raw, nodeboot}]) => {
                        const delta = ((nodeboot.requestsPerSec - raw.requestsPerSec) / raw.requestsPerSec) * 100;
                        const deltaClass = delta < 0 ? "negative" : "positive";
                        return `<tr><td>${escapeHtml(framework)}</td><td>${fmt(raw.requestsPerSec)}</td><td>${fmt(
                            nodeboot.requestsPerSec,
                        )}</td><td class="${deltaClass}">${fmt(delta)}%</td><td>${fmt(
                            raw.latencyMs?.p99,
                        )}</td><td>${fmt(nodeboot.latencyMs?.p99)}</td></tr>`;
                    })
                    .join("")}
                </tbody>
            </table>`);
        }

        readmeLines.push(`## Endpoint: \`${endpoint}\``);
        readmeLines.push("");
        readmeLines.push(
            writeChartFile(`${endpoint}-reqsec`, {
                rows: throughputRows,
                title: "Req/sec (higher is better)",
                unit: " req/s",
            }) +
                " " +
                writeChartFile(`${endpoint}-latency-p99`, {
                    rows: latencyRows,
                    title: "Latency p99 ms (lower is better)",
                    unit: " ms",
                }),
        );
        readmeLines.push("");
        readmeLines.push(...lines.slice(endpointStart));
    }

    fs.writeFileSync(REPORT_FILE, lines.join("\n"));
    console.log(`Wrote ${REPORT_FILE}`);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Node-Boot Benchmarking Report</title>
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; color: #0f172a; }
    h1 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
    h2 { margin-top: 48px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
    h3 { margin-top: 24px; }
    .chart-row { display: flex; flex-wrap: wrap; gap: 24px; }
    .chart { margin: 16px 0; }
    .chart h4 { margin: 0 0 8px; font-size: 14px; color: #475569; }
    table { border-collapse: collapse; width: 100%; margin: 12px 0; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: right; }
    th:first-child, td:first-child { text-align: left; }
    th { background: #f8fafc; }
    td.negative { color: #b91c1c; }
    td.positive { color: #047857; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 16px 0; font-size: 13px; }
    .legend span { display: inline-flex; align-items: center; gap: 6px; }
    .swatch { width: 12px; height: 12px; border-radius: 3px; display: inline-block; }
    .meta { color: #64748b; font-size: 13px; }
    .findings { list-style: none; padding: 0; margin: 16px 0; }
    .findings li { padding: 10px 14px; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid; font-size: 14px; line-height: 1.5; }
    .findings li.expected { background: #ecfdf5; border-color: #10b981; }
    .findings li.concerning { background: #fef2f2; border-color: #ef4444; }
    .findings li.info { background: #eff6ff; border-color: #3b82f6; }
    .badge { display: inline-block; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; margin-right: 8px; }
    .badge.expected { background: #10b981; color: white; }
    .badge.concerning { background: #ef4444; color: white; }
    .badge.info { background: #3b82f6; color: white; }
</style>
</head>
<body>
<h1>Node-Boot Benchmarking Report</h1>
<p class="meta">Generated: ${generatedAt.toISOString()} &middot; Node-Boot version: <strong>${escapeHtml(
        nodeBootVersion,
    )}</strong></p>
<div class="legend">
${Object.entries(APP_COLORS)
    .map(([app, color]) => `<span><span class="swatch" style="background:${color}"></span>${escapeHtml(app)}</span>`)
    .join("\n")}
</div>
${htmlSections.join("\n")}
</body>
</html>`;

    fs.writeFileSync(HTML_REPORT_FILE, html);
    console.log(`Wrote ${HTML_REPORT_FILE}`);

    fs.writeFileSync(README_FILE, readmeLines.join("\n"));
    console.log(`Wrote ${README_FILE}`);

    archiveRun({nodeBootVersion, generatedAt, results});
}

// Copies this run's raw JSON results + both reports into results/history/<version>__<timestamp>/
// and appends a row to results/history/index.md, so past runs stay available to diff against as
// @nodeboot/* versions change over time.
function archiveRun({nodeBootVersion, generatedAt, results}) {
    const runSlug = `${nodeBootVersion}__${timestampSlug(generatedAt)}`;
    const runDir = path.join(HISTORY_DIR, runSlug);
    fs.mkdirSync(runDir, {recursive: true});

    fs.copyFileSync(REPORT_FILE, path.join(runDir, "REPORT.md"));
    fs.copyFileSync(HTML_REPORT_FILE, path.join(runDir, "REPORT.html"));
    fs.copyFileSync(README_FILE, path.join(runDir, "README.md"));
    fs.cpSync(CHARTS_DIR, path.join(runDir, "charts"), {recursive: true});
    for (const file of fs.readdirSync(RESULTS_DIR)) {
        if (file.endsWith(".json")) {
            fs.copyFileSync(path.join(RESULTS_DIR, file), path.join(runDir, file));
        }
    }

    const helloRows = results.filter(r => r.endpoint === "hello").sort((a, b) => a.app.localeCompare(b.app));
    const helloSummary = helloRows.map(r => `${r.app}=${fmt(r.requestsPerSec, 0)}`).join(", ");

    const indexHeader =
        "# Benchmark run history\n\nEach row links to an archived run (raw JSON + reports) for a given Node-Boot version and timestamp, so runs can be diffed as `@nodeboot/*` evolves.\n\n| Date | Node-Boot version | Report | `hello` req/sec by app |\n| --- | --- | --- | --- |\n";
    if (!fs.existsSync(HISTORY_INDEX_FILE)) {
        fs.writeFileSync(HISTORY_INDEX_FILE, indexHeader);
    }
    const row = `| ${generatedAt.toISOString()} | ${nodeBootVersion} | [${runSlug}](./${runSlug}/REPORT.html) | ${helloSummary} |\n`;
    fs.appendFileSync(HISTORY_INDEX_FILE, row);

    console.log(`Archived run to ${runDir}`);
    console.log(`Updated ${HISTORY_INDEX_FILE}`);
}

main();
